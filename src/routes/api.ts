import { Hono } from 'hono'
import type { ScheduledEvent } from '@cloudflare/workers-types'

const app = new Hono()
const mem = new Map<string, any>()
const rateLimit = new Map<string, { count: number; reset: number }>()
const RATE_WINDOW = 60000
const RATE_MAX = 30

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimit.get(ip) || { count: 0, reset: now + RATE_WINDOW }
  if (now > entry.reset) { entry.count = 0; entry.reset = now + RATE_WINDOW }
  entry.count++
  rateLimit.set(ip, entry)
  if (entry.count > RATE_MAX) return false
  // Clean stale entries periodically
  if (rateLimit.size > 10000) {
    const cutoff = now - RATE_WINDOW * 2
    for (const [k, v] of rateLimit) { if (v.reset < cutoff) rateLimit.delete(k) }
  }
  return true
}

async function sha256(s: string) {
  const d = new TextEncoder().encode(s)
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', d))).map(b => b.toString(16).padStart(2, '0')).join('')
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

function rid(n = 32) {
  const c = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'
  const b = crypto.getRandomValues(new Uint8Array(n * 2)); let r = ''
  for (let i = 0; i < b.length && r.length < n; i++) { const x = b[i] & 63; if (x < c.length) r += c[x] }
  return r
}

async function tok() {
  const t = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('')
  return { token: t, hash: await sha256(t) }
}

function storage(c: any) {
  const db = (c.env as any)?.DB
  if (!db) {
    // In-memory fallback when D1 not bound
    return {
      async get(id: string) { return mem.get(id) },
      async put(r: any) { mem.set(r.id, r) },
      async del(id: string) { mem.delete(id) },
      d1: false
    }
  }
  let tableInit = false
  async function initTable() {
    if (tableInit) return
    await db.prepare('CREATE TABLE IF NOT EXISTS pastes (id TEXT PRIMARY KEY, mode TEXT NOT NULL, salt TEXT, encrypted_payload TEXT NOT NULL, hint TEXT DEFAULT "", delete_token_hash TEXT NOT NULL, expires_at INTEGER, max_views INTEGER DEFAULT -1, view_count INTEGER DEFAULT 0, burn_after_read INTEGER DEFAULT 0, created_at INTEGER NOT NULL, pubkey_fingerprint TEXT)').run()
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_pastes_expires_at ON pastes(expires_at)').run()
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_pastes_created_at ON pastes(created_at)').run()
    tableInit = true
  }
  return {
    async get(id: string) { await initTable(); return db.prepare('SELECT * FROM pastes WHERE id=?').bind(id).first() },
    async put(r: any) {
      await initTable()
      const ex = await db.prepare('SELECT id FROM pastes WHERE id=?').bind(r.id).first()
      if (ex) await db.prepare('UPDATE pastes SET mode=?,salt=?,encrypted_payload=?,hint=?,delete_token_hash=?,expires_at=?,max_views=?,view_count=?,burn_after_read=?,created_at=?,pubkey_fingerprint=? WHERE id=?').bind(r.mode,r.salt,r.encrypted_payload,r.hint,r.delete_token_hash,r.expires_at,r.max_views,r.view_count,r.burn_after_read,r.created_at,r.pubkey_fingerprint,r.id).run()
      else await db.prepare('INSERT INTO pastes (id,mode,salt,encrypted_payload,hint,delete_token_hash,expires_at,max_views,view_count,burn_after_read,created_at,pubkey_fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(r.id,r.mode,r.salt,r.encrypted_payload,r.hint,r.delete_token_hash,r.expires_at,r.max_views,r.view_count,r.burn_after_read,r.created_at,r.pubkey_fingerprint).run()
    },
    async del(id: string) { await initTable(); await db.prepare('DELETE FROM pastes WHERE id=?').bind(id).run() },
    d1: true
  }
}

// CORS 白名单：部署后请将你的自定义域名加入此列表
// 方式一：在 Cloudflare Dashboard → s-textpaste → 设置 → 变量 → 添加环境变量
//   CORS_ORIGINS = https://yourdomain.com,https://yourdomain2.com
// 方式二：直接修改下方数组（提交到 git 前注意移除敏感域名）
function getAllowedOrigins(env: any): string[] {
  const defaults = [
    'http://localhost:3000',
    'http://localhost:8787',
    'https://s-textpaste.pages.dev',
    'https://s-textpaste.workers.dev',
  ]
  if (env?.CORS_ORIGINS) {
    return [...defaults, ...env.CORS_ORIGINS.split(',').map((s: string) => s.trim())]
  }
  return defaults
}

app.use('/api/*', async (c, next) => {
  await next()
  const origin = c.req.header('Origin') || ''
  const allowed = getAllowedOrigins(c.env)
  const allowOrigin = allowed.includes(origin) ? origin : 'null'
  c.header('Access-Control-Allow-Origin', allowOrigin)
  c.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type,X-Delete-Token')
  c.header('Access-Control-Max-Age', '86400')
  c.header('Cache-Control', 'no-store')
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
})

app.post('/api/paste', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
  if (!checkRateLimit(ip)) return c.json({ error: 'Too many requests' }, 429)
  const s = storage(c)
  const bodySize = parseInt(c.req.header('Content-Length') || '0', 10)
  if (bodySize > 5 * 1024 * 1024) return c.json({ error: 'Request too large (max 5MB)' }, 413)
  let b: any; try { b = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }
  const { mode, salt, encrypted_payload, hint = '', expires_in, max_views = -1, burn_after_read = 0, custom_id } = b
  if (!mode || typeof mode !== 'string' || !['password','symmetric','asymmetric'].includes(mode)) return c.json({ error: 'Invalid mode (must be password, symmetric, or asymmetric)' }, 400)
  if (!encrypted_payload || typeof encrypted_payload !== 'string') return c.json({ error: 'Missing or invalid encrypted_payload' }, 400)
  if (encrypted_payload.length > 10 * 1024 * 1024) return c.json({ error: 'Payload too large (max 10MB)' }, 413)
  if (custom_id && (custom_id.length > 64 || custom_id.length < 8 || !/^[a-zA-Z0-9_-]+$/.test(custom_id))) return c.json({ error: 'Invalid custom_id (must be 8-64 chars, alphanumeric with -_)' }, 400)

  const id = custom_id || rid()
  if (await s.get(id)) return c.json({ error: 'Custom ID already taken' }, 409)
  const { token, hash } = await tok()
  const now = Date.now(); let ea: number | null = null
  if (expires_in !== undefined && expires_in !== null && expires_in !== '') {
    const ms = parseInt(String(expires_in), 10)
    if (isNaN(ms) || ms <= 0) return c.json({ error: 'Invalid expires_in (must be a positive number)' }, 400)
    if (ms > 365*24*60*60*1000) return c.json({ error: 'expires_in exceeds maximum (365 days)' }, 400)
    ea = now + ms
  }

  await s.put({ id, mode, salt: salt || null, encrypted_payload, hint: hint || '', delete_token_hash: hash, expires_at: ea, max_views, view_count: 0, burn_after_read: burn_after_read ? 1 : 0, created_at: now, pubkey_fingerprint: b.pubkey_fingerprint || null })
  return c.json({ id, delete_token: token, expires_at: ea, storage: s.d1 ? 'd1' : 'memory' }, 201)
})

app.get('/api/paste/:id', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
  if (!checkRateLimit(ip)) return c.json({ error: 'Too many requests' }, 429)
  const s = storage(c); const id = c.req.param('id'); const p: any = await s.get(id)
  if (!p) return c.json({ error: 'Not found' }, 404)
  if (p.expires_at && Date.now() > p.expires_at) { await s.del(id); return c.json({ error: 'Expired' }, 410) }
  if (p.max_views >= 0 && p.view_count >= p.max_views) { await s.del(id); return c.json({ error: 'Max views' }, 410) }
  return c.json({ encrypted_payload: p.encrypted_payload, expires_at: p.expires_at, view_count: p.view_count, max_views: p.max_views, burn_after_read: p.burn_after_read, created_at: p.created_at, storage: s.d1 ? 'd1' : 'memory' })
})

app.post('/api/paste/:id/view', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
  if (!checkRateLimit(ip)) return c.json({ error: 'Too many requests' }, 429)
  const s = storage(c); const id = c.req.param('id'); const p: any = await s.get(id)
  if (!p) return c.json({ error: 'Not found' }, 404)
  if (p.expires_at && Date.now() > p.expires_at) { await s.del(id); return c.json({ error: 'This paste has expired' }, 410) }
  if (p.max_views >= 0 && p.view_count >= p.max_views) { await s.del(id); return c.json({ error: 'Maximum view limit reached' }, 410) }
  p.view_count++; await s.put(p)
  if (p.burn_after_read === 1) await s.del(id)
  return c.json({ success: true, view_count: p.view_count, burn_after_read: p.burn_after_read, max_views: p.max_views })
})

app.delete('/api/paste/:id', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
  if (!checkRateLimit(ip)) return c.json({ error: 'Too many requests' }, 429)
  const s = storage(c); const id = c.req.param('id'); const token = c.req.header('X-Delete-Token')
  if (!token) return c.json({ error: 'Token required' }, 401)
  const p: any = await s.get(id); if (!p) return c.json({ error: 'Not found' }, 404)
  const tokenHash = await sha256(token)
  if (tokenHash.length !== p.delete_token_hash.length || !constantTimeEqual(tokenHash, p.delete_token_hash)) return c.json({ error: 'Invalid token' }, 401)
  await s.del(id); return c.json({ success: true })
})

app.options('/api/*', c => c.text(''))

// Scheduled cleanup (runs every 6 hours via cron):
// 1. Expired pastes (expires_at reached)
// 2. View-limit-reached pastes (view_count >= max_views > 0)
// 3. Burn-after-read pastes older than 1 hour (safety net for orphaned records)
export async function scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
  const db = env.DB
  if (!db) return
  const now = Date.now()
  const cutoff = now - 7 * 24 * 60 * 60 * 1000 // 7 days for view-limit / burn orphans
  const r1 = await db.prepare('DELETE FROM pastes WHERE expires_at IS NOT NULL AND expires_at < ?').bind(now).run()
  const r2 = await db.prepare('DELETE FROM pastes WHERE max_views > 0 AND view_count >= max_views').run()
  const r3 = await db.prepare('DELETE FROM pastes WHERE burn_after_read = 1 AND created_at < ?').bind(cutoff).run()
  const total = (r1?.meta?.changes || 0) + (r2?.meta?.changes || 0) + (r3?.meta?.changes || 0)
  console.log(`Cleanup: removed ${total} entries (expired: ${r1?.meta?.changes || 0}, view-limit: ${r2?.meta?.changes || 0}, burn-orphan: ${r3?.meta?.changes || 0})`)
}

export default app
