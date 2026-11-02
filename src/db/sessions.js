import { db } from './index.js';

const stmt = {
  insert: db.prepare('INSERT INTO sessions (jti, nick, created_at, last_seen_at) VALUES (?, ?, ?, ?)'),
  find: db.prepare('SELECT nick, last_seen_at AS lastSeenAt FROM sessions WHERE jti = ?'),
  touch: db.prepare('UPDATE sessions SET last_seen_at = ? WHERE jti = ?'),
  remove: db.prepare('DELETE FROM sessions WHERE jti = ?'),
  prune: db.prepare('DELETE FROM sessions WHERE last_seen_at < ?'),
};

export const insertSession = (jti, nick, now) => stmt.insert.run(jti, nick, now, now);
export const findSession = (jti) => stmt.find.get(jti);
export const touchSession = (jti, now) => stmt.touch.run(now, jti);
export const removeSession = (jti) => stmt.remove.run(jti);
export const pruneSessions = (olderThan) => stmt.prune.run(olderThan);
