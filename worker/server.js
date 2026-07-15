// Simple local API server for development (replaces Cloudflare Worker locally)
// Run with: node server.js
// This mimics the Cloudflare Worker API for local testing

const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// In-memory "database"
const pastes = new Map()

// Simple rate limiter: max 30 requests per minute per IP
const rateLimit = new Map()
const RATE_WINDOW = 60000
const RATE_MAX = 30

const PORT = 8787

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex')
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

function generateId(len = 32) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'
  const mask = 63
  let id = ''
  while (id.length < len) {
    const bytes = crypto.randomBytes(len * 2)
    for (let i = 0; i < bytes.length && id.length < len; i++) {
      const r = bytes[i] & mask
      if (r < chars.length) id += chars[r]
    }
  }
  return id
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    let size = 0
    const MAX_BODY = 5 * 1024 * 1024
    req.on('data', chunk => {
      size += chunk.length
      if (size > MAX_BODY) { req.destroy(); reject(new Error('Request body too large')) }
      body += chunk
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

function jsonResponse(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Delete-Token',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store'
  })
  res.end(JSON.stringify(data))
}

// Periodic cleanup of stale rate limit entries and expired pastes
function cleanupStaleData() {
  const now = Date.now()
  // Clean rate limit entries
  const cutoff = now - RATE_WINDOW * 2
  for (const [ip, entry] of rateLimit) {
    if (entry.reset < cutoff) rateLimit.delete(ip)
  }
  // Clean expired pastes
  for (const [id, paste] of pastes) {
    if (paste.expires_at && now > paste.expires_at) pastes.delete(id)
  }
}
setInterval(cleanupStaleData, 60000) // run every minute

const server = http.createServer(async (req, res) => {
  // Rate limit check
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const entry = rateLimit.get(ip)
  if (!entry || now > entry.reset) {
    rateLimit.set(ip, { count: 1, reset: now + RATE_WINDOW })
  } else {
    entry.count++
    if (entry.count > RATE_MAX) {
      return jsonResponse(res, { error: 'Too many requests' }, 429)
    }
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return jsonResponse(res, '')
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const pathname = url.pathname

  try {
    // POST /api/paste - Create
    if (req.method === 'POST' && pathname === '/api/paste') {
      const body = await parseBody(req)
      const { mode, salt, encrypted_payload, hint = '', expires_in, max_views = -1, burn_after_read = 0, custom_id } = body

      if (!mode || !encrypted_payload) return jsonResponse(res, { error: 'Missing required fields' }, 400)
      if (!['password', 'symmetric', 'asymmetric'].includes(mode)) return jsonResponse(res, { error: 'Invalid mode' }, 400)

      if (custom_id) {
        if (custom_id.length > 64 || custom_id.length < 8 || !/^[a-zA-Z0-9_-]+$/.test(custom_id)) {
          return jsonResponse(res, { error: 'Invalid custom_id (8-64 chars, a-z A-Z 0-9 - _)' }, 400)
        }
      }

      const id = custom_id || generateId(32)
      if (pastes.has(id)) return jsonResponse(res, { error: 'ID already exists' }, 409)

      const token = generateToken()
      const tokenHash = sha256(token)
      const now = Date.now()

      let expiresAt = null
      if (expires_in) {
        const ms = parseInt(expires_in, 10)
        if (ms > 0 && ms <= 365 * 24 * 60 * 60 * 1000) {
          expiresAt = now + ms
        }
      }

      pastes.set(id, {
        id, mode, salt: salt || null, encrypted_payload, hint,
        delete_token_hash: tokenHash, expires_at: expiresAt,
        max_views: parseInt(String(max_views), 10),
        view_count: 0,
        burn_after_read: burn_after_read ? 1 : 0,
        created_at: now,
        pubkey_fingerprint: body.pubkey_fingerprint || null
      })

      return jsonResponse(res, {
        id,
        delete_token: token,
        expires_at: expiresAt,
        url: `http://localhost:${PORT}/read/${id}`
      }, 201)
    }

    // GET /api/paste/:id - Get
    if (req.method === 'GET' && pathname.startsWith('/api/paste/')) {
      const id = pathname.split('/')[3]
      const paste = pastes.get(id)
      if (!paste) return jsonResponse(res, { error: 'Not found' }, 404)

      if (paste.expires_at && Date.now() > paste.expires_at) {
        pastes.delete(id)
        return jsonResponse(res, { error: 'Paste has expired' }, 410)
      }
      if (paste.max_views >= 0 && paste.view_count >= paste.max_views) {
        pastes.delete(id)
        return jsonResponse(res, { error: 'Maximum views reached' }, 410)
      }

      return jsonResponse(res, {
        encrypted_payload: paste.encrypted_payload,
        expires_at: paste.expires_at, view_count: paste.view_count,
        max_views: paste.max_views, burn_after_read: paste.burn_after_read,
        created_at: paste.created_at
      })
    }

    // POST /api/paste/:id/view - Record view
    if (req.method === 'POST' && pathname.match(/^\/api\/paste\/[^\/]+\/view$/)) {
      const id = pathname.split('/')[3]
      const paste = pastes.get(id)
      if (!paste) return jsonResponse(res, { error: 'Not found' }, 404)

      if (paste.expires_at && Date.now() > paste.expires_at) {
        pastes.delete(id)
        return jsonResponse(res, { error: 'Paste has expired' }, 410)
      }
      if (paste.max_views >= 0 && paste.view_count >= paste.max_views) {
        pastes.delete(id)
        return jsonResponse(res, { error: 'Maximum views reached' }, 410)
      }

      paste.view_count++
      const burn = paste.burn_after_read

      if (burn === 1) {
        pastes.delete(id)
      }

      return jsonResponse(res, {
        success: true,
        view_count: paste.view_count,
        burn_after_read: burn,
        max_views: paste.max_views
      })
    }

    // DELETE /api/paste/:id - Delete
    if (req.method === 'DELETE' && pathname.startsWith('/api/paste/')) {
      const id = pathname.split('/')[3]
      const token = req.headers['x-delete-token']
      if (!token) return jsonResponse(res, { error: 'Delete token required' }, 401)

      const paste = pastes.get(id)
      if (!paste) return jsonResponse(res, { error: 'Not found' }, 404)

      const tokenHash = sha256(token)
      if (tokenHash.length !== paste.delete_token_hash.length || !constantTimeEqual(tokenHash, paste.delete_token_hash)) {
        return jsonResponse(res, { error: 'Invalid delete token' }, 401)
      }

      pastes.delete(id)
      return jsonResponse(res, { success: true })
    }

    // Health check
    if (req.method === 'GET' && pathname === '/health') {
      return jsonResponse(res, { status: 'ok' })
    }

    // 404
    jsonResponse(res, { error: 'Not found' }, 404)

  } catch (err) {
    console.error('Server error:', err.message)
    jsonResponse(res, { error: 'Internal server error' }, 500)
  }
})

server.listen(PORT, () => {
  console.log(`\n  Local API server running at http://localhost:${PORT}/`)
  console.log(`  Frontend should proxy /api to this port (already configured in vite.config.ts)\n`)
})
