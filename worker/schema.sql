CREATE TABLE IF NOT EXISTS pastes (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK(mode IN ('password', 'symmetric', 'asymmetric')),
  salt TEXT DEFAULT NULL,
  encrypted_payload TEXT NOT NULL,
  hint TEXT DEFAULT '',
  delete_token_hash TEXT NOT NULL,
  expires_at INTEGER CHECK(expires_at IS NULL OR expires_at > 0),
  max_views INTEGER DEFAULT -1 CHECK(max_views >= -1),
  view_count INTEGER DEFAULT 0 CHECK(view_count >= 0),
  burn_after_read INTEGER DEFAULT 0 CHECK(burn_after_read IN (0, 1)),
  created_at INTEGER NOT NULL,
  pubkey_fingerprint TEXT
);

CREATE INDEX IF NOT EXISTS idx_pastes_expires_at ON pastes(expires_at);
CREATE INDEX IF NOT EXISTS idx_pastes_created_at ON pastes(created_at);
