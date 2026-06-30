import { Hono } from 'hono'

const app = new Hono()

// ============ In-memory fallback (works without D1) ============
const memDb = new Map<string, any>()

function getDb(c: any) {
  const db = (c.env as any)?.DB
  return db || null
}

// CORS + Security
app.use('/api/*', async (c, next) => {
  await next()
  c.header('Access-Control-Allow-Origin', c.req.header('Origin') || '*')
  c.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, X-Delete-Token')
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'")
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Cache-Control', 'no-store')
})

// ============ Helpers ============
function sha256(s: string): string {
  const data = new TextEncoder().encode(s)
  return Array.from(new Uint8Array(crypto.subtle.digestSync('SHA-256', data))).map(b => b.toString(16).padStart(2, '0')).join('')
}
function randId(len = 32): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'
  const bytes = crypto.getRandomValues(new Uint8Array(len * 2))
  let id = ''
  for (let i = 0; i < bytes.length && id.length < len; i++) {
    const r = bytes[i] & 63
    if (r < chars.length) id += chars[r]
  }
  return id
}
function genToken() {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('')
  return { token, hash: sha256(token) }
}

// ============ D1 init (optional, no crash if DB missing) ============
let d1Ready = false
async function initD1(db: any) {
  if (!d1Ready && db) {
    try {
      await db.exec(`CREATE TABLE IF NOT EXISTS pastes (
        id TEXT PRIMARY KEY, mode TEXT NOT NULL, salt TEXT,
        encrypted_payload TEXT NOT NULL, hint TEXT DEFAULT '',
        delete_token_hash TEXT NOT NULL, expires_at INTEGER,
        max_views INTEGER DEFAULT -1, view_count INTEGER DEFAULT 0,
        burn_after_read INTEGER DEFAULT 0, created_at INTEGER NOT NULL,
        pubkey_fingerprint TEXT
      )`)
      d1Ready = true
    } catch { /* D1 not available, use memory */ }
  }
}

// ============ API ============
app.post('/api/paste', async (c) => {
  const db = getDb(c)
  await initD1(db)

  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }
  const { mode, encrypted_payload, hint = '', expires_in, max_views = -1, burn_after_read = 0, custom_id } = body
  if (!mode || !encrypted_payload) return c.json({ error: 'Missing required fields' }, 400)
  if (!['password', 'symmetric', 'asymmetric'].includes(mode)) return c.json({ error: 'Invalid mode' }, 400)
  if (custom_id && (custom_id.length > 64 || custom_id.length < 8 || !/^[a-zA-Z0-9_-]+$/.test(custom_id))) return c.json({ error: 'Invalid custom_id (8-64 chars)' }, 400)

  const id = custom_id || randId()
  if (memDb.has(id)) return c.json({ error: 'ID already exists' }, 409)
  const { token, hash } = genToken()
  const now = Date.now()
  let expires_at: number | null = null
  if (expires_in) { const ms = parseInt(String(expires_in), 10); if (ms > 0 && ms <= 365*24*60*60*1000) expires_at = now + ms }

  const record = { id, mode, salt: body.salt || null, encrypted_payload, hint: hint || '', delete_token_hash: hash, expires_at, max_views: parseInt(String(max_views),10), view_count: 0, burn_after_read: burn_after_read ? 1 : 0, created_at: now, pubkey_fingerprint: body.pubkey_fingerprint || null }

  if (db) {
    try {
      await db.prepare(`INSERT INTO pastes (id,mode,salt,encrypted_payload,hint,delete_token_hash,expires_at,max_views,view_count,burn_after_read,created_at,pubkey_fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(record.id,record.mode,record.salt,record.encrypted_payload,record.hint,record.delete_token_hash,record.expires_at,record.max_views,0,record.burn_after_read,record.created_at,record.pubkey_fingerprint).run()
    } catch { memDb.set(id, record) }
  } else {
    memDb.set(id, record)
  }
  return c.json({ id, delete_token: token, expires_at }, 201)
})

app.get('/api/paste/:id', async (c) => {
  const db = getDb(c)
  await initD1(db)
  const id = c.req.param('id')
  let paste: any = memDb.get(id)
  if (!paste && db) { try { paste = await db.prepare('SELECT * FROM pastes WHERE id = ?').bind(id).first() } catch { } }
  if (!paste) return c.json({ error: 'Not found' }, 404)
  if (paste.expires_at && Date.now() > paste.expires_at) { memDb.delete(id); return c.json({ error: 'Expired' }, 410) }
  if (paste.max_views >= 0 && paste.view_count >= paste.max_views) { memDb.delete(id); return c.json({ error: 'Max views reached' }, 410) }
  return c.json({ encrypted_payload: paste.encrypted_payload, expires_at: paste.expires_at, view_count: paste.view_count, max_views: paste.max_views, burn_after_read: paste.burn_after_read, created_at: paste.created_at })
})

app.post('/api/paste/:id/view', async (c) => {
  const db = getDb(c)
  await initD1(db)
  const id = c.req.param('id')
  let paste: any = memDb.get(id)
  if (!paste && db) { try { paste = await db.prepare('SELECT * FROM pastes WHERE id = ?').bind(id).first() } catch { } }
  if (!paste) return c.json({ error: 'Not found' }, 404)
  if (paste.expires_at && Date.now() > paste.expires_at) { memDb.delete(id); return c.json({ error: 'Expired' }, 410) }
  paste.view_count++
  memDb.set(id, paste)
  if (db) { try { await db.prepare('UPDATE pastes SET view_count = view_count + 1 WHERE id = ?').bind(id).run() } catch { } }
  if (paste.burn_after_read) { memDb.delete(id); if (db) { try { await db.prepare('DELETE FROM pastes WHERE id = ?').bind(id).run() } catch { } } }
  return c.json({ success: true, view_count: paste.view_count, burn_after_read: paste.burn_after_read, max_views: paste.max_views })
})

app.delete('/api/paste/:id', async (c) => {
  const db = getDb(c)
  await initD1(db)
  const id = c.req.param('id')
  const token = c.req.header('X-Delete-Token')
  if (!token) return c.json({ error: 'Delete token required' }, 401)
  let paste: any = memDb.get(id)
  if (!paste && db) { try { paste = await db.prepare('SELECT * FROM pastes WHERE id = ?').bind(id).first() } catch { } }
  if (!paste) return c.json({ error: 'Not found' }, 404)
  if (sha256(token) !== paste.delete_token_hash) return c.json({ error: 'Invalid delete token' }, 401)
  memDb.delete(id)
  if (db) { try { await db.prepare('DELETE FROM pastes WHERE id = ?').bind(id).run() } catch { } }
  return c.json({ success: true })
})

app.options('/api/*', (c) => c.text(''))

// ============ Static files + SPA ============
// When using [assets] binding in wrangler.toml, Cloudflare serves assets automatically.
// For routes not handled by API, return the SPA index.html
app.get('/health', (c) => c.json({ status: 'ok', db: getDb(c) ? 'd1' : 'memory' }))

export default app
