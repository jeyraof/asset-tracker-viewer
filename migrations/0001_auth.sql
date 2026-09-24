-- asset-tracker-viewer auth schema.
-- Single user: a passkey credential is the identity; no users table.

CREATE TABLE IF NOT EXISTS passkey_credentials (
  id           TEXT    PRIMARY KEY,
  public_key   TEXT    NOT NULL,
  counter      INTEGER NOT NULL DEFAULT 0,
  transports   TEXT,
  device_type  TEXT,
  backed_up    INTEGER NOT NULL DEFAULT 0,
  rp_id        TEXT    NOT NULL,
  label        TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_passkey_credentials_rp
  ON passkey_credentials (rp_id);

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,
  challenge  TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires
  ON webauthn_challenges (expires_at);
