import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { HttpError } from '../utils/http-error.js';
import { slugify, isValidSlug } from '../utils/slug.js';
import { formatDuration, fixFileName } from '../utils/format.js';
import { inspectTrack, mergeTracks } from './audio.js';
import { runJob } from './job-queue.js';
import {
  isSlugTaken,
  getUsage,
  reserveSlug,
  dropReservation,
  finalizePlaylist,
  findReady,
  listReadyByOwner,
  getTracks,
  removePlaylist,
} from '../db/playlists.js';

const { maxTracks, maxTrackSeconds, userQuotaBytes } = config.limits;
const { tmpDir, streamsDir } = config.paths;

async function readTracks(files) {
  const tracks = [];
  for (const file of files) {
    const name = fixFileName(file.originalname);
    let duration = null;
    try {
      duration = await inspectTrack(file.path);
    } catch {
      duration = null;
    }
    if (!duration) throw new HttpError(400, 'TRACK_UNREADABLE', { name });
    if (duration > maxTrackSeconds) {
      throw new HttpError(400, 'TRACK_TOO_LONG', {
        name,
        duration: formatDuration(duration),
        max: formatDuration(maxTrackSeconds),
      });
    }
    tracks.push({ name, path: file.path, duration });
  }
  return tracks;
}

export async function createPlaylist({ nick, rawSlug, files, signal }) {
  const slug = slugify(rawSlug);
  const outputTmp = path.join(tmpDir, `${crypto.randomUUID()}.out.mp3`);
  const finalPath = path.join(streamsDir, `${slug}.mp3`);
  let reserved = false;
  let published = false;

  try {
    if (!files.length) throw new HttpError(400, 'TRACKS_REQUIRED');
    if (files.length > maxTracks) throw new HttpError(400, 'TRACKS_LIMIT', { max: maxTracks });
    if (!isValidSlug(slug)) throw new HttpError(400, 'SLUG_INVALID');
    if (isSlugTaken(slug)) throw new HttpError(409, 'SLUG_TAKEN');

    const tracks = await readTracks(files);

    reserveSlug(slug, nick);
    reserved = true;

    await runJob(() => mergeTracks(tracks.map((t) => t.path), outputTmp, signal));

    const sizeBytes = fs.statSync(outputTmp).size;
    if (getUsage(nick).bytes + sizeBytes > userQuotaBytes) throw new HttpError(413, 'QUOTA_EXCEEDED_NEW');

    fs.renameSync(outputTmp, finalPath);
    published = true;

    const totalDuration = tracks.reduce((sum, t) => sum + t.duration, 0);
    finalizePlaylist(slug, nick, tracks.map(({ name, duration }) => ({ name, duration })), totalDuration, sizeBytes);
    reserved = false;

    return findReady(slug);
  } catch (err) {
    if (published) fs.unlink(finalPath, () => {});
    if (reserved) dropReservation(slug, nick);
    if (err.aborted) return null;
    if (err.ffmpeg) {
      console.error('[FFMPEG]', err.message);
      throw new HttpError(422, 'PROCESSING_FAILED');
    }
    throw err;
  } finally {
    fs.unlink(outputTmp, () => {});
    for (const file of files) fs.unlink(file.path, () => {});
  }
}

export function getPlaylist(rawSlug) {
  const playlist = findReady(slugify(rawSlug));
  if (!playlist) throw new HttpError(404, 'NOT_FOUND');
  return playlist;
}

export function listPlaylists(nick) {
  return listReadyByOwner(nick).map((row) => ({ ...row, tracks: getTracks(row.slug) }));
}

export function deletePlaylist(rawSlug, nick) {
  const slug = slugify(rawSlug);
  removePlaylist(slug, nick);
  fs.unlink(path.join(streamsDir, `${slug}.mp3`), () => {});
  return slug;
}

export function checkSlug(rawSlug) {
  const slug = slugify(rawSlug);
  if (!isValidSlug(slug)) return { valid: false, available: false, slug, code: 'SLUG_INVALID' };
  return { valid: true, available: !isSlugTaken(slug), slug };
}
