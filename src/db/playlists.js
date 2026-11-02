import { db } from './index.js';
import { config } from '../config/index.js';
import { HttpError } from '../utils/http-error.js';

const stmt = {
  slugTaken: db.prepare('SELECT 1 FROM playlists WHERE slug = ?'),
  usage: db.prepare('SELECT COUNT(*) AS count, COALESCE(SUM(size_bytes), 0) AS bytes FROM playlists WHERE owner = ?'),
  reserve: db.prepare("INSERT INTO playlists (slug, owner, status, created_at) VALUES (?, ?, 'processing', ?)"),
  dropProcessing: db.prepare("DELETE FROM playlists WHERE slug = ? AND owner = ? AND status = 'processing'"),
  finalize: db.prepare(
    "UPDATE playlists SET status = 'ready', total_duration = ?, size_bytes = ? WHERE slug = ? AND owner = ? AND status = 'processing'"
  ),
  insertTrack: db.prepare('INSERT INTO tracks (slug, position, name, duration) VALUES (?, ?, ?, ?)'),
  getReady: db.prepare(
    "SELECT slug, owner, total_duration AS totalDuration, created_at AS createdAt FROM playlists WHERE slug = ? AND status = 'ready'"
  ),
  listByOwner: db.prepare(
    "SELECT slug, total_duration AS totalDuration, created_at AS createdAt FROM playlists WHERE owner = ? AND status = 'ready' ORDER BY created_at DESC"
  ),
  tracksOf: db.prepare('SELECT name, duration FROM tracks WHERE slug = ? ORDER BY position'),
  remove: db.prepare('DELETE FROM playlists WHERE slug = ? AND owner = ?'),
};

export const isSlugTaken = (slug) => Boolean(stmt.slugTaken.get(slug));
export const getUsage = (nick) => stmt.usage.get(nick);
export const dropReservation = (slug, nick) => stmt.dropProcessing.run(slug, nick);
export const getTracks = (slug) => stmt.tracksOf.all(slug);
export const listReadyByOwner = (nick) => stmt.listByOwner.all(nick);

export function findReady(slug) {
  const row = stmt.getReady.get(slug);
  return row ? { ...row, tracks: stmt.tracksOf.all(slug) } : null;
}

export const reserveSlug = db.transaction((slug, nick) => {
  const { count } = stmt.usage.get(nick);
  if (count >= config.limits.maxPlaylistsPerUser) {
    throw new HttpError(403, 'LIMIT_PLAYLISTS', { max: config.limits.maxPlaylistsPerUser });
  }
  try {
    stmt.reserve.run(slug, nick, new Date().toISOString());
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') throw new HttpError(409, 'SLUG_TAKEN');
    throw err;
  }
});

export const finalizePlaylist = db.transaction((slug, nick, tracks, totalDuration, sizeBytes) => {
  const result = stmt.finalize.run(totalDuration, sizeBytes, slug, nick);
  if (result.changes !== 1) throw new Error('Reserva da playlist não encontrada.');
  tracks.forEach((track, index) => stmt.insertTrack.run(slug, index, track.name, track.duration));
});

export const removePlaylist = db.transaction((slug, nick) => {
  const row = stmt.getReady.get(slug);
  if (!row) throw new HttpError(404, 'NOT_FOUND');
  if (row.owner !== nick) throw new HttpError(403, 'FORBIDDEN');
  stmt.remove.run(slug, nick);
});
