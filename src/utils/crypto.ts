import { createHash, createHmac } from 'crypto'

export function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex')
}

export function md5(data: string): string {
  return createHash('md5').update(data).digest('hex')
}

export function generateDeleteToken(): { token: string; hash: string } {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  const hash = sha256(token)
  return { token, hash }
}

export function generateShortId(length: number = 32): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'
  const mask = 63 // 0x3F, since chars.length is 64
  const bytes = new Uint8Array(length * 2)
  crypto.getRandomValues(bytes)
  let id = ''
  let i = 0
  while (id.length < length) {
    const r = bytes[i] & mask
    if (r < chars.length) id += chars[r]
    i++
    if (i >= bytes.length) { crypto.getRandomValues(bytes); i = 0 }
  }
  return id
}

export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

export function encodeBase64(data: Uint8Array): string {
  return Buffer.from(data).toString('base64')
}

export function decodeBase64(str: string): Uint8Array {
  return new Uint8Array(Buffer.from(str, 'base64'))
}

export function encodeBase64Url(data: Uint8Array): string {
  return Buffer.from(data).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function decodeBase64Url(str: string): Uint8Array {
  let padded = str.replace(/-/g, '+').replace(/_/g, '/')
  while (padded.length % 4) padded += '='
  return new Uint8Array(Buffer.from(padded, 'base64'))
}
