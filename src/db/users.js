import { db } from './index.js';

const stmt = {
  find: db.prepare('SELECT nick, salt, password_hash AS passwordHash FROM users WHERE nick = ?'),
  insert: db.prepare('INSERT INTO users (nick, salt, password_hash, created_at) VALUES (?, ?, ?, ?)'),
  updateHash: db.prepare('UPDATE users SET salt = ?, password_hash = ? WHERE nick = ?'),
};

export const findUser = (nick) => stmt.find.get(nick);
export const insertUser = (nick, passwordHash) => stmt.insert.run(nick, '', passwordHash, new Date().toISOString());
export const updatePasswordHash = (nick, passwordHash) => stmt.updateHash.run('', passwordHash, nick);
