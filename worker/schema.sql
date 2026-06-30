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
