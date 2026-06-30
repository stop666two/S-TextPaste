import { Hono } from 'hono'

const app = new Hono()

async function sha256(s: string) {
  const d = new TextEncoder().encode(s)
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', d))).map(b => b.toString(16).padStart(2, '0')).join('')
}

function randId(n = 32) {
  const c = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'
  const b = crypto.getRandomValues(new Uint8Array(n * 2)); let r = ''
  for (let i = 0; i < b.length && r.length < n; i++) { const x = b[i] & 63; if (x < c.length) r += c[x] }
  return r
}

async function genToken() {
  const t = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('')
  return { token: t, hash: await sha256(t) }
}

let dbReady = false
async function ensureDB(db: any) {
  if (!dbReady) {
    await db.exec(`CREATE TABLE IF NOT EXISTS pastes (
      id TEXT PRIMARY KEY, mode TEXT NOT NULL, salt TEXT,
      encrypted_payload TEXT NOT NULL, hint TEXT DEFAULT '',
      delete_token_hash TEXT NOT NULL, expires_at INTEGER,
      max_views INTEGER DEFAULT -1, view_count INTEGER DEFAULT 0,
      burn_after_read INTEGER DEFAULT 0, created_at INTEGER NOT NULL,
      pubkey_fingerprint TEXT
    )`)
    dbReady = true
  }
}

app.use('/api/*', async (c, next) => { await next(); c.header('Access-Control-Allow-Origin', c.req.header('Origin') || '*'); c.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS'); c.header('Access-Control-Allow-Headers', 'Content-Type, X-Delete-Token'); c.header('Cache-Control', 'no-store') })

app.post('/api/paste', async (c) => {
  const db = (c.env as any)?.DB
  if (!db) return c.json({ error: 'D1 database not bound' }, 500)

  await ensureDB(db)
  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const { mode, salt, encrypted_payload, hint = '', expires_in, max_views = -1, burn_after_read = 0, custom_id } = body
  if (!mode || !encrypted_payload) return c.json({ error: 'Missing fields' }, 400)
  if (!['password', 'symmetric', 'asymmetric'].includes(mode)) return c.json({ error: 'Invalid mode' }, 400)
  if (custom_id && (custom_id.length > 64 || custom_id.length < 4 || !/^[a-zA-Z0-9_-]+$/.test(custom_id))) return c.json({ error: 'Invalid custom_id (4-64 chars)' }, 400)

  const id = custom_id || randId()
  if (await db.prepare('SELECT id FROM pastes WHERE id=?').bind(id).first()) return c.json({ error: 'ID exists' }, 409)

  const { token, hash } = await genToken()
  const now = Date.now()
  let ea: number | null = null
  if (expires_in) { const ms = parseInt(String(expires_in), 10); if (ms > 0 && ms <= 365*24*60*60*1000) ea = now + ms }

  await db.prepare('INSERT INTO pastes (id,mode,salt,encrypted_payload,hint,delete_token_hash,expires_at,max_views,view_count,burn_after_read,created_at,pubkey_fingerprint) VALUES (?,?,?,?,?,?,?,?,0,?,?,?)')
    .bind(id, mode, salt || null, encrypted_payload, hint || '', hash, ea, max_views, burn_after_read ? 1 : 0, now, body.pubkey_fingerprint || null).run()

  return c.json({ id, delete_token: token, expires_at: ea }, 201)
})

app.get('/api/paste/:id', async (c) => {
  const db = (c.env as any)?.DB
  if (!db) return c.json({ error: 'D1 database not bound' }, 500)

  const id = c.req.param('id')
  const p = await db.prepare('SELECT * FROM pastes WHERE id=?').bind(id).first()
  if (!p) return c.json({ error: 'Not found' }, 404)

  if (p.expires_at && Date.now() > p.expires_at) { await db.prepare('DELETE FROM pastes WHERE id=?').bind(id).run(); return c.json({ error: 'Expired' }, 410) }
  if (p.max_views >= 0 && p.view_count >= p.max_views) { await db.prepare('DELETE FROM pastes WHERE id=?').bind(id).run(); return c.json({ error: 'Max views' }, 410) }

  return c.json({ encrypted_payload: p.encrypted_payload, expires_at: p.expires_at, view_count: p.view_count, max_views: p.max_views, burn_after_read: p.burn_after_read, created_at: p.created_at })
})

app.post('/api/paste/:id/view', async (c) => {
  const db = (c.env as any)?.DB
  if (!db) return c.json({ error: 'D1 database not bound' }, 500)

  const id = c.req.param('id')
  const p = await db.prepare('SELECT * FROM pastes WHERE id=?').bind(id).first()
  if (!p) return c.json({ error: 'Not found' }, 404)
  if (p.expires_at && Date.now() > p.expires_at) { await db.prepare('DELETE FROM pastes WHERE id=?').bind(id).run(); return c.json({ error: 'Expired' }, 410) }

  await db.prepare('UPDATE pastes SET view_count=view_count+1 WHERE id=?').bind(id).run()
  if (p.burn_after_read === 1) await db.prepare('DELETE FROM pastes WHERE id=?').bind(id).run()

  return c.json({ success: true, view_count: p.view_count + 1, burn_after_read: p.burn_after_read, max_views: p.max_views })
})

app.delete('/api/paste/:id', async (c) => {
  const db = (c.env as any)?.DB
  if (!db) return c.json({ error: 'D1 database not bound' }, 500)

  const id = c.req.param('id')
  const token = c.req.header('X-Delete-Token')
  if (!token) return c.json({ error: 'Token required' }, 401)

  const p = await db.prepare('SELECT delete_token_hash FROM pastes WHERE id=?').bind(id).first()
  if (!p) return c.json({ error: 'Not found' }, 404)
  if ((await sha256(token)) !== p.delete_token_hash) return c.json({ error: 'Invalid token' }, 401)

  await db.prepare('DELETE FROM pastes WHERE id=?').bind(id).run()
  return c.json({ success: true })
})

app.options('/api/*', c => c.text(''))

export default app
