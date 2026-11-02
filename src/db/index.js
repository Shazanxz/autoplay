import { openDatabase } from './connection.js';
import { applySchema } from './schema.js';
import { migrateLegacyJson } from './legacy-json.js';

export const db = openDatabase();

applySchema(db);
migrateLegacyJson(db);
db.prepare("DELETE FROM playlists WHERE status = 'processing'").run();

export function closeDb() {
  try {
    db.close();
  } catch {}
}
