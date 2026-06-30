import { Hono } from 'hono'
import { initDatabase, getPasteById, createPaste, updateViewCount, deletePaste, deletePasteByToken } from '../db/pastes'
import { sha256, generateDeleteToken, generateShortId } from '../utils/crypto'

const app = new Hono()

// CORS + Security middleware
app.use('*', async (c, next) => {
  await next()
  const origin = c.req.header('Origin')
  c.header('Access-Control-Allow-Origin', origin || '*')
  c.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, X-Delete-Token')
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:")
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Cache-Control', 'no-store')
})

let dbInitialized = false
async function ensureDb(c: any) {
  if (!dbInitialized) {
    const env = c.env as any
    if (env.DB) {
      await initDatabase(env.DB)
      dbInitialized = true
    }
  }
}

// POST /paste - Create
app.post('/paste', async (c) => {
  await ensureDb(c)
  const env = c.env as any
  const db = env.DB
  if (!db) return c.json({ error: 'Database not configured' }, 500)

  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const { mode, salt, encrypted_payload, hint = '', expires_in, max_views = -1, burn_after_read = 0, custom_id } = body

  if (!mode || !encrypted_payload) return c.json({ error: 'Missing required fields' }, 400)
  if (!['password', 'symmetric', 'asymmetric'].includes(mode)) return c.json({ error: 'Invalid mode' }, 400)

  // Validate custom_id
  if (custom_id) {
    if (custom_id.length > 64 || custom_id.length < 8 || !/^[a-zA-Z0-9_-]+$/.test(custom_id)) {
      return c.json({ error: 'Invalid custom_id (8-64 chars)' }, 400)
    }
  }

  let id = custom_id || generateShortId(32)

  const existing = await getPasteById(db, id)
  if (existing) return c.json({ error: 'ID already exists' }, 409)

  const { token, hash } = generateDeleteToken()

  let expires_at: number | null = null
  if (expires_in) {
    const ms = parseInt(expires_in, 10)
    const MAX_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000
    if (ms > 0 && ms <= MAX_EXPIRY_MS) {
      expires_at = Date.now() + ms
    }
  }

  const created_at = Date.now()

  await createPaste(db, {
    id, mode, salt: salt || null, encrypted_payload, hint,
    delete_token_hash: hash, expires_at,
    max_views: parseInt(String(max_views), 10),
    burn_after_read: burn_after_read ? 1 : 0,
    created_at,
    pubkey_fingerprint: body.pubkey_fingerprint || null
  })

  return c.json({
    id,
    delete_token: token,
    expires_at,
    url: `${c.req.url.replace('/paste', '')}/${id}`
  }, 201)
})

// GET /paste/:id - Get
app.get('/paste/:id', async (c) => {
  await ensureDb(c)
  const env = c.env as any
  const db = env.DB
  if (!db) return c.json({ error: 'Database not configured' }, 500)

  const id = c.req.param('id')
  const paste = await getPasteById(db, id)
  if (!paste) return c.json({ error: 'Not found' }, 404)

  if (paste.expires_at && Date.now() > paste.expires_at) {
    await deletePaste(db, id)
    return c.json({ error: 'Paste has expired' }, 410)
  }
  if (paste.max_views >= 0 && paste.view_count >= paste.max_views) {
    await deletePaste(db, id)
    return c.json({ error: 'Maximum views reached' }, 410)
  }

  return c.json({
    encrypted_payload: paste.encrypted_payload,
    expires_at: paste.expires_at, view_count: paste.view_count,
    max_views: paste.max_views, burn_after_read: paste.burn_after_read,
    created_at: paste.created_at
  })
})

// POST /paste/:id/view - Record view
app.post('/paste/:id/view', async (c) => {
  await ensureDb(c)
  const env = c.env as any
  const db = env.DB
  if (!db) return c.json({ error: 'Database not configured' }, 500)

  const id = c.req.param('id')
  const paste = await getPasteById(db, id)
  if (!paste) return c.json({ error: 'Not found' }, 404)

  if (paste.expires_at && Date.now() > paste.expires_at) {
    await deletePaste(db, id)
    return c.json({ error: 'Paste has expired' }, 410)
  }
  if (paste.max_views >= 0 && paste.view_count >= paste.max_views) {
    await deletePaste(db, id)
    return c.json({ error: 'Maximum views reached' }, 410)
  }

  const result = await updateViewCount(db, id)

  // Burn after read: delete after recording the view
  if (result.burn_after_read === 1) {
    await deletePaste(db, id)
  }

  return c.json({
    success: true,
    view_count: result.count,
    burn_after_read: result.burn_after_read,
    max_views: result.max_views
  })
})

// DELETE /paste/:id - Delete
app.delete('/paste/:id', async (c) => {
  await ensureDb(c)
  const env = c.env as any
  const db = env.DB
  if (!db) return c.json({ error: 'Database not configured' }, 500)

  const id = c.req.param('id')
  const deleteToken = c.req.header('X-Delete-Token')
  if (!deleteToken) return c.json({ error: 'Delete token required' }, 401)

  const tokenHash = sha256(deleteToken)
  const success = await deletePasteByToken(db, id, tokenHash)
  if (!success) return c.json({ error: 'Invalid delete token or not found' }, 401)

  return c.json({ success: true })
})

app.options('*', async (c) => c.text(''))

export default app
