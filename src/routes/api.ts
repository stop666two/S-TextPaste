import { Hono } from 'hono'

const app = new Hono()
const m = new Map<string, any>()

// ============ Crypto ============
async function h(s: string) {
  const d = new TextEncoder().encode(s)
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', d))).map(b => b.toString(16).padStart(2, '0')).join('')
}
function rid(n = 32) {
  const c = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'
  const b = crypto.getRandomValues(new Uint8Array(n * 2)); let r = ''
  for (let i = 0; i < b.length && r.length < n; i++) { const x = b[i] & 63; if (x < c.length) r += c[x] }
  return r
}
async function tok() { const t = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join(''); return { t, h: await h(t) } }

// ============ Storage: D1 if available, else memory ============
async function db(c: any) {
  const env = (c.env as any) || {}
  return env.DB || {
    _m: m,
    async prepare(sql: string) {
      return { async bind(...args: any[]) { return this }, async first() { return null }, async run() { return { success: true } }, async all() { return { results: [] } } }
    }
  }
}

async function get(db: any, id: string) { return db._m ? db._m.get(id) : (await db.prepare('SELECT * FROM pastes WHERE id = ?').bind(id).first()) }
async function put(db: any, r: any) {
  if (db._m) { db._m.set(r.id, r); return }
  await db.prepare('CREATE TABLE IF NOT EXISTS pastes (id TEXT PRIMARY KEY, mode TEXT NOT NULL, salt TEXT, encrypted_payload TEXT NOT NULL, hint TEXT DEFAULT "", delete_token_hash TEXT NOT NULL, expires_at INTEGER, max_views INTEGER DEFAULT -1, view_count INTEGER DEFAULT 0, burn_after_read INTEGER DEFAULT 0, created_at INTEGER NOT NULL, pubkey_fingerprint TEXT)').run()
  const existing = await db.prepare('SELECT id FROM pastes WHERE id = ?').bind(r.id).first()
  if (existing) await db.prepare('UPDATE pastes SET mode=?,salt=?,encrypted_payload=?,hint=?,delete_token_hash=?,expires_at=?,max_views=?,view_count=?,burn_after_read=?,created_at=?,pubkey_fingerprint=? WHERE id=?').bind(r.mode,r.salt,r.encrypted_payload,r.hint,r.delete_token_hash,r.expires_at,r.max_views,r.view_count,r.burn_after_read,r.created_at,r.pubkey_fingerprint,r.id).run()
  else await db.prepare('INSERT INTO pastes (id,mode,salt,encrypted_payload,hint,delete_token_hash,expires_at,max_views,view_count,burn_after_read,created_at,pubkey_fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(r.id,r.mode,r.salt,r.encrypted_payload,r.hint,r.delete_token_hash,r.expires_at,r.max_views,r.view_count,r.burn_after_read,r.created_at,r.pubkey_fingerprint).run()
}
async function del(db: any, id: string) { if (db._m) { db._m.delete(id); return } await db.prepare('DELETE FROM pastes WHERE id = ?').bind(id).run() }

// ============ CORS ============
app.use('/api/*', async (c, n) => { await n(); c.header('Access-Control-Allow-Origin', c.req.header('Origin') || '*'); c.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS'); c.header('Access-Control-Allow-Headers', 'Content-Type, X-Delete-Token'); c.header('Content-Security-Policy', "default-src 'self'; script-src 'self'"); c.header('Cache-Control', 'no-store') })

// ============ POST /api/paste ============
app.post('/api/paste', async (c) => {
  const d = await db(c)
  let b: any; try { b = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }
  const { mode, salt, encrypted_payload, hint = '', expires_in, max_views = -1, burn_after_read = 0, custom_id } = b
  if (!mode || !encrypted_payload) return c.json({ error: 'Missing fields' }, 400)
  if (!['password', 'symmetric', 'asymmetric'].includes(mode)) return c.json({ error: 'Invalid mode' }, 400)
  if (custom_id && (custom_id.length > 64 || custom_id.length < 4 || !/^[a-zA-Z0-9_-]+$/.test(custom_id))) return c.json({ error: 'Invalid custom_id' }, 400)

  const id = custom_id || rid()
  if (await get(d, id)) return c.json({ error: 'ID exists' }, 409)
  const { t, h: hash } = await tok()
  const now = Date.now(); let ea: number | null = null
  if (expires_in) { const ms = parseInt(String(expires_in), 10); if (ms > 0 && ms <= 365*24*60*60*1000) ea = now + ms }

  await put(d, { id, mode, salt: salt || null, encrypted_payload, hint: hint || '', delete_token_hash: hash, expires_at: ea, max_views: parseInt(String(max_views), 10), view_count: 0, burn_after_read: burn_after_read ? 1 : 0, created_at: now, pubkey_fingerprint: b.pubkey_fingerprint || null })
  return c.json({ id, delete_token: t, expires_at: ea }, 201)
})

// ============ GET /api/paste/:id ============
app.get('/api/paste/:id', async (c) => {
  const d = await db(c); const id = c.req.param('id'); const p = await get(d, id)
  if (!p) return c.json({ error: 'Not found' }, 404)
  if (p.expires_at && Date.now() > p.expires_at) { await del(d, id); return c.json({ error: 'Expired' }, 410) }
  if (p.max_views >= 0 && p.view_count >= p.max_views) { await del(d, id); return c.json({ error: 'Max views' }, 410) }
  return c.json({ encrypted_payload: p.encrypted_payload, expires_at: p.expires_at, view_count: p.view_count, max_views: p.max_views, burn_after_read: p.burn_after_read, created_at: p.created_at })
})

// ============ POST /api/paste/:id/view ============
app.post('/api/paste/:id/view', async (c) => {
  const d = await db(c); const id = c.req.param('id'); const p = await get(d, id)
  if (!p) return c.json({ error: 'Not found' }, 404)
  if (p.expires_at && Date.now() > p.expires_at) { await del(d, id); return c.json({ error: 'Expired' }, 410) }
  p.view_count++
  await put(d, p)
  if (p.burn_after_read === 1) await del(d, id)
  return c.json({ success: true, view_count: p.view_count, burn_after_read: p.burn_after_read, max_views: p.max_views })
})

// ============ DELETE /api/paste/:id ============
app.delete('/api/paste/:id', async (c) => {
  const d = await db(c); const id = c.req.param('id'); const token = c.req.header('X-Delete-Token')
  if (!token) return c.json({ error: 'Token required' }, 401)
  const p = await get(d, id); if (!p) return c.json({ error: 'Not found' }, 404)
  if ((await h(token)) !== p.delete_token_hash) return c.json({ error: 'Invalid token' }, 401)
  await del(d, id)
  return c.json({ success: true })
})

app.options('/api/*', (c) => c.text(''))

export default app
