import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

function readLegacy(file) {
  if (!fs.existsSync(file)) return { exists: false, data: null };
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { exists: true, data: data && typeof data === 'object' ? data : null };
  } catch {
    return { exists: true, data: null };
  }
}

export function migrateLegacyJson(db) {
  const { dataDir, streamsDir } = config.paths;
  const usersFile = path.join(dataDir, 'users.json');
  const playlistsFile = path.join(dataDir, 'playlists.json');
  const sessionsFile = path.join(dataDir, 'sessions.json');

  const users = readLegacy(usersFile);
  const playlists = readLegacy(playlistsFile);
  if (!users.exists && !playlists.exists && !fs.existsSync(sessionsFile)) return;

  const insertUser = db.prepare(
    'INSERT OR IGNORE INTO users (nick, salt, password_hash, created_at) VALUES (?, ?, ?, ?)'
  );
  const insertPlaylist = db.prepare(
    `INSERT OR IGNORE INTO playlists (slug, owner, status, total_duration, size_bytes, created_at)
     VALUES (?, ?, 'ready', ?, ?, ?)`
  );
  const insertTrack = db.prepare(
    'INSERT OR IGNORE INTO tracks (slug, position, name, duration) VALUES (?, ?, ?, ?)'
  );
  const userExists = db.prepare('SELECT 1 FROM users WHERE nick = ?');

  db.transaction(() => {
    if (users.data) {
      for (const [key, u] of Object.entries(users.data)) {
        if (!u || !u.salt || !u.passwordHash) continue;
        insertUser.run(u.nick || key, u.salt, u.passwordHash, u.createdAt || new Date().toISOString());
      }
    }
    if (playlists.data) {
      for (const [key, p] of Object.entries(playlists.data)) {
        if (!p || !userExists.get(p.owner)) continue;
        const slug = p.slug || key;
        const file = path.join(streamsDir, `${slug}.mp3`);
        if (!fs.existsSync(file)) continue;
        insertPlaylist.run(
          slug,
          p.owner,
          Number(p.totalDuration) || 0,
          fs.statSync(file).size,
          p.createdAt || new Date().toISOString()
        );
        (p.tracks || []).forEach((t, i) => insertTrack.run(slug, i, String(t.name || ''), Number(t.duration) || 0));
      }
    }
  })();

  for (const [file, parsed] of [[usersFile, users], [playlistsFile, playlists]]) {
    if (parsed.exists && parsed.data) fs.renameSync(file, `${file}.migrated`);
  }
  if (fs.existsSync(sessionsFile)) fs.renameSync(sessionsFile, `${sessionsFile}.migrated`);
}
