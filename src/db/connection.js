import path from 'path';
import Database from 'better-sqlite3';
import { config } from '../config/index.js';

export function openDatabase() {
  const db = new Database(path.join(config.paths.dataDir, 'autoplay.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  return db;
}
