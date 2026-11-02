export function applySchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      nick TEXT PRIMARY KEY,
      salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      jti TEXT PRIMARY KEY,
      nick TEXT NOT NULL REFERENCES users(nick) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_last_seen ON sessions(last_seen_at);
    CREATE TABLE IF NOT EXISTS playlists (
      slug TEXT PRIMARY KEY,
      owner TEXT NOT NULL REFERENCES users(nick) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'processing',
      total_duration REAL NOT NULL DEFAULT 0,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_playlists_owner ON playlists(owner, created_at);
    CREATE TABLE IF NOT EXISTS tracks (
      slug TEXT NOT NULL REFERENCES playlists(slug) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      name TEXT NOT NULL,
      duration REAL NOT NULL,
      PRIMARY KEY (slug, position)
    );
  `);
}
