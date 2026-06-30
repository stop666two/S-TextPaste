import type { DB } from '../index'
import { constantTimeCompare } from '../utils/crypto'

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS pastes (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  salt TEXT,
  encrypted_payload TEXT NOT NULL,
  hint TEXT DEFAULT '',
  delete_token_hash TEXT NOT NULL,
  expires_at INTEGER,
  max_views INTEGER DEFAULT -1,
  view_count INTEGER DEFAULT 0,
  burn_after_read INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  pubkey_fingerprint TEXT
);
`

export async function initDatabase(db: DB): Promise<void> {
  await db.exec(INIT_SQL)
}

export interface PasteRecord {
  id: string
  mode: string
  salt: string | null
  encrypted_payload: string
  hint: string
  delete_token_hash: string
  expires_at: number | null
  max_views: number
  view_count: number
  burn_after_read: number
  created_at: number
  pubkey_fingerprint: string | null
}

export async function getPasteById(db: DB, id: string): Promise<PasteRecord | null> {
  const result = await db.prepare('SELECT * FROM pastes WHERE id = ?').bind(id).first()
  return result as PasteRecord | null
}

export async function createPaste(
  db: DB,
  record: PasteRecord
): Promise<void> {
  await db.prepare(
    `INSERT INTO pastes (id, mode, salt, encrypted_payload, hint, delete_token_hash, expires_at, max_views, view_count, burn_after_read, created_at, pubkey_fingerprint)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    record.id, record.mode, record.salt || null, record.encrypted_payload, record.hint || '',
    record.delete_token_hash, record.expires_at || null, record.max_views || -1,
    0, record.burn_after_read || 0, record.created_at || Date.now(), record.pubkey_fingerprint || null
  ).run()
}

export async function updateViewCount(db: DB, id: string): Promise<{ count: number; burn_after_read: number; max_views: number }> {
  await db.prepare(`UPDATE pastes SET view_count = view_count + 1 WHERE id = ?`).bind(id).run()
  const row = await db.prepare('SELECT view_count, max_views, burn_after_read FROM pastes WHERE id = ?').bind(id).first() as any
  return { count: row?.view_count || 0, burn_after_read: row?.burn_after_read || 0, max_views: row?.max_views || -1 }
}

export async function deletePaste(db: DB, id: string): Promise<void> {
  await db.prepare('DELETE FROM pastes WHERE id = ?').bind(id).run()
}

export async function deletePasteByToken(db: DB, id: string, tokenHash: string): Promise<boolean> {
  const row = await db.prepare('SELECT delete_token_hash FROM pastes WHERE id = ?').bind(id).first() as any
  if (!row) return false
  if (!constantTimeCompare(row.delete_token_hash, tokenHash)) return false
  await db.prepare('DELETE FROM pastes WHERE id = ?').bind(id).run()
  return true
}
