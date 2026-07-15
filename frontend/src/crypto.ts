// S-TextPaste v4.0 — Standard PBKDF2-HMAC-SHA256 based key derivation
// Replaced custom SHA-256+MD5 KDF with NIST-standard PBKDF2 (Web Crypto API)

const te = new TextEncoder()
const td = new TextDecoder()

function tx(s: string): Uint8Array { return te.encode(String(s)) }

function ct(...a: Uint8Array[]): Uint8Array {
  let s = 0; for (const x of a) s += x.length
  const r = new Uint8Array(s); let o = 0
  for (const x of a) { r.set(x, o); o += x.length }
  return r
}

function b6e(d: Uint8Array): string {
  let s = ''; for (let i = 0; i < d.length; i++) s += String.fromCharCode(d[i])
  return btoa(s)
}

function b6d(s: string): Uint8Array {
  const b = atob(s), r = new Uint8Array(b.length)
  for (let i = 0; i < b.length; i++) r[i] = b.charCodeAt(i)
  return r
}

async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', bs(raw.slice(0, 32)), 'AES-GCM', false, ['encrypt', 'decrypt'])
}

// Cloudflare Worker types conflict with DOM types, cast to BufferSource
function bs(u: Uint8Array): BufferSource { return u as unknown as BufferSource }
function u8(buf: any): Uint8Array { return new Uint8Array(buf as any) }

async function aesEncrypt(plaintext: string, key: Uint8Array): Promise<{ c: string; i: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await importAesKey(key), te.encode(plaintext) as BufferSource)
  return { c: b6e(u8(ct)), i: b6e(iv) }
}

async function aesDecrypt(cipher: string, iv: string, key: Uint8Array): Promise<string> {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bs(b6d(iv)) }, await importAesKey(key), bs(b6d(cipher)))
  return td.decode(pt)
}

async function hmacSign(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const ik = await crypto.subtle.importKey('raw', bs(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return u8(await crypto.subtle.sign('HMAC', ik, bs(data)))
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

// PBKDF2-HMAC-SHA256 key derivation
const PBKDF2_ITERATIONS = 100000

async function pbkdf2(password: Uint8Array, salt: Uint8Array, iterations: number, keyLength: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', bs(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: bs(salt), iterations, hash: 'SHA-256' },
    key, keyLength * 8
  )
  return u8(bits)
}

// ============ Payload ============
export interface EncryptedPayload {
  v: string; m: string; s: string; d: string; i: string
  e?: string; j?: string; f?: string; g?: string
  h?: string; p?: string; t?: string; a: string; q: boolean
}

// ============ Encrypt / Decrypt - Password Mode ============
/**
 * 密码模式加密
 * @param text 明文
 * @param pw 密码
 * @param doubleEnvelope 是否启用双信封（双层 AES-256-GCM）
 * @param hint 密码提示（嵌入密文，不解密不可见）
 */
export async function encryptForPassword(text: string, pw: string, doubleEnvelope: boolean, hint?: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(32))
  const pwBytes = tx(pw)

  if (!doubleEnvelope) {
    const k = await pbkdf2(pwBytes, salt, PBKDF2_ITERATIONS, 32)
    const { c, i } = await aesEncrypt(text, k)
    const po: Record<string, any> = { v: '4.0', m: 'password', s: b6e(salt), d: c, i, t: hint || '', a: 'AES-256-GCM (PBKDF2-HMAC-SHA256)', q: false }
    const ik = await pbkdf2(pwBytes, ct(salt, tx('hmac')), PBKDF2_ITERATIONS, 32)
    po.h = b6e(await hmacSign(ik, tx(JSON.stringify(po))))
    return po as unknown as EncryptedPayload
  }

  // Double envelope: DEK + 2 independent key layers
  const dek: any = crypto.getRandomValues(new Uint8Array(32))
  const { c, i } = await aesEncrypt(text, dek)

  const k1 = await pbkdf2(pwBytes, ct(salt, tx('env-A')), PBKDF2_ITERATIONS, 32)
  const iv2 = crypto.getRandomValues(new Uint8Array(12))
  const ed: any = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: bs(iv2) }, await importAesKey(k1), bs(dek))

  const k2 = await pbkdf2(pwBytes, ct(salt, tx('env-B')), PBKDF2_ITERATIONS, 32)
  const iv3 = crypto.getRandomValues(new Uint8Array(12))
  const ee: any = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: bs(iv3) }, await importAesKey(k2), bs(ed))

  const po: Record<string, any> = {
    v: '4.0', m: 'password', s: b6e(salt), d: c, i,
    e: b6e(u8(ee)), j: b6e(iv3), f: b6e(u8(ed)), g: b6e(iv2),
    t: hint || '', a: 'AES-256-GCM (Double Envelope, PBKDF2)', q: true
  }
  const ik = await pbkdf2(pwBytes, ct(salt, tx('hmac')), PBKDF2_ITERATIONS, 32)
  po.h = b6e(await hmacSign(ik, tx(JSON.stringify(po))))
  return po as unknown as EncryptedPayload
}

/**
 * 密码模式解密
 * 先验证 HMAC 完整性（防止篡改），再用 PBKDF2 派生密钥解密
 */
export async function decryptFromPassword(p: EncryptedPayload, pw: string): Promise<string> {
  const salt = b6d(p.s)
  const pwBytes = tx(pw)

  if (p.h) {
    const ik = await pbkdf2(pwBytes, ct(salt, tx('hmac')), PBKDF2_ITERATIONS, 32)
    const { h, ...rest } = p
    const expected = b6e(await hmacSign(ik, tx(JSON.stringify(rest))))
    if (!constantTimeEqual(expected, p.h)) throw new Error('HMAC integrity check failed — data tampered or wrong password')
  }

  if (!p.q) {
    const k = await pbkdf2(pwBytes, salt, PBKDF2_ITERATIONS, 32)
    return await aesDecrypt(p.d, p.i, k)
  }

  const k2 = await pbkdf2(pwBytes, ct(salt, tx('env-B')), PBKDF2_ITERATIONS, 32)
  const ed: any = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bs(b6d(p.j!)) }, await importAesKey(k2), bs(b6d(p.e!)))
  const k1 = await pbkdf2(pwBytes, ct(salt, tx('env-A')), PBKDF2_ITERATIONS, 32)
  const dek: any = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bs(b6d(p.g!)) }, await importAesKey(k1), bs(ed))
  return await aesDecrypt(p.d, p.i, u8(dek))
}

// ============ Symmetric ============
/**
 * 对称密钥模式加密
 * @param text 明文
 * @param raw 用户提供的密钥（≥32 字节取前 32，不足自动补齐）
 */
export async function encryptForSymmetric(text: string, raw: Uint8Array): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(32))
  const uk = raw.length >= 32 ? raw.slice(0, 32) : (() => { const p = new Uint8Array(32); p.set(raw); return p })()

  const { c, i } = await aesEncrypt(text, uk)
  const kh = u8(await crypto.subtle.digest('SHA-256', bs(ct(uk, salt))))
  const k1 = await pbkdf2(kh.slice(0, 16), ct(salt, tx('sym-A')), PBKDF2_ITERATIONS, 32)
  const k2 = await pbkdf2(kh.slice(16, 32), ct(salt, tx('sym-B')), PBKDF2_ITERATIONS, 32)

  const dek: any = crypto.getRandomValues(new Uint8Array(32))
  const iv2 = crypto.getRandomValues(new Uint8Array(12))
  const ed: any = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: bs(iv2) }, await importAesKey(k1), bs(dek))
  const iv3 = crypto.getRandomValues(new Uint8Array(12))
  const ee: any = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: bs(iv3) }, await importAesKey(k2), bs(ed))

  return { v: '4.0', m: 'symmetric', s: b6e(salt), d: c, i, e: b6e(u8(ee)), j: b6e(iv3), f: b6e(u8(ed)), g: b6e(iv2), a: 'AES-256-GCM (Symmetric, PBKDF2)', q: true }
}

/** 对称密钥模式解密 */
export async function decryptForSymmetric(p: EncryptedPayload, raw: Uint8Array): Promise<string> {
  const uk = raw.length >= 32 ? raw.slice(0, 32) : (() => { const pp = new Uint8Array(32); pp.set(raw); return pp })()
  if (!p.q) return await aesDecrypt(p.d, p.i, uk)

  const kh = u8(await crypto.subtle.digest('SHA-256', bs(ct(uk, b6d(p.s)))))
  const k2 = await pbkdf2(kh.slice(16, 32), ct(b6d(p.s), tx('sym-B')), PBKDF2_ITERATIONS, 32)
  const ed: any = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bs(b6d(p.j!)) }, await importAesKey(k2), bs(b6d(p.e!)))
  const k1 = await pbkdf2(kh.slice(0, 16), ct(b6d(p.s), tx('sym-A')), PBKDF2_ITERATIONS, 32)
  const dek: any = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bs(b6d(p.g!)) }, await importAesKey(k1), bs(ed))
  return await aesDecrypt(p.d, p.i, u8(dek))
}

// ============ Asymmetric ============
/**
 * 非对称模式加密
 * @param text 明文
 * @param pub RSA-OAEP 公钥（由 importPemPublicKey 导入）
 */
export async function encryptForAsymmetric(text: string, pub: CryptoKey): Promise<EncryptedPayload> {
  const dek: any = crypto.getRandomValues(new Uint8Array(32))
  const { c, i } = await aesEncrypt(text, dek)
  const ed: any = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pub, bs(dek))
  const pr: any = await crypto.subtle.exportKey('raw', pub)
  const hs = u8(await crypto.subtle.digest('SHA-256', bs(pr)))
  const fp = Array.from(hs.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(':')
  return { v: '4.0', m: 'asymmetric', s: '', d: c, i, e: b6e(u8(ed)), j: i, p: fp, a: 'RSA-OAEP-AES-256-GCM', q: false }
}

/** 非对称模式解密 */
export async function decryptFromAsymmetric(p: EncryptedPayload, priv: CryptoKey): Promise<string> {
  return await aesDecrypt(p.d, p.i, u8(await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, priv, bs(b6d(p.e!)))))
}

export async function importPemPublicKey(pem: string): Promise<CryptoKey> {
  const raw = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, '')
  return crypto.subtle.importKey('spki', bs(b6d(raw)), { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt'])
}

export async function importPemPrivateKey(pem: string): Promise<CryptoKey> {
  const raw = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, '')
  return crypto.subtle.importKey('pkcs8', bs(b6d(raw)), { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['decrypt'])
}

// ============ Public encoding ============
export function bufferToBase64(data: Uint8Array): string { return b6e(data) }
export function base64ToBuffer(b64: string): Uint8Array { return b6d(b64) }
export function utf8ToBase64(s: string): string { return b6e(te.encode(s)) }
export function base64ToUtf8(b64: string): string { return td.decode(b6d(b64)) }
