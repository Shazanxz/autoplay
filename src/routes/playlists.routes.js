import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { streamUrl } from '../utils/url.js';
import { translate } from '../i18n/index.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { checkQuota } from '../middleware/quota.js';
import { uploadTracks } from '../middleware/upload.js';
import { requireAuth } from '../auth/middleware.js';
import {
  createPlaylist,
  getPlaylist,
  listPlaylists,
  deletePlaylist,
  checkSlug,
} from '../services/playlist-service.js';

const router = Router();

const limitCreate = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  key: (req) => req.user.nick,
  code: 'RATE_CREATE',
});
const limitSlugCheck = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  key: (req) => req.ip,
  code: 'RATE_SLUG',
});

const present = (req, playlist) => ({
  slug: playlist.slug,
  url: streamUrl(req, playlist.slug),
  tracks: playlist.tracks,
  trackCount: playlist.tracks.length,
  totalDuration: playlist.totalDuration,
  createdAt: playlist.createdAt,
});

router.get('/check-slug/:slug', limitSlugCheck, (req, res) => {
  const { code, ...result } = checkSlug(req.params.slug);
  res.json(code ? { ...result, reason: translate(req.lang, code) } : result);
});

router.post(
  '/create-playlist',
  requireAuth,
  limitCreate,
  checkQuota,
  uploadTracks,
  asyncHandler(async (req, res) => {
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });

    const playlist = await createPlaylist({
      nick: req.user.nick,
      rawSlug: req.body.slug,
      files: req.files || [],
      signal: controller.signal,
    });
    if (!playlist) return;

    res.json({ success: true, owner: req.user.nick, ...present(req, playlist) });
  })
);

router.get('/playlist/:slug', (req, res) => {
  const playlist = getPlaylist(req.params.slug);
  res.json({ ...present(req, playlist), owner: playlist.owner });
});

router.get('/my/playlists', requireAuth, (req, res) => {
  const playlists = listPlaylists(req.user.nick).map((p) => present(req, p));
  res.json({ nick: req.user.nick, playlists });
});

router.delete('/playlist/:slug', requireAuth, (req, res) => {
  res.json({ success: true, slug: deletePlaylist(req.params.slug, req.user.nick) });
});

export default router;
