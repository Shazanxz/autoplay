import { config } from '../config/index.js';
import { HttpError } from '../utils/http-error.js';
import { getUsage } from '../db/playlists.js';

export function checkQuota(req, res, next) {
  const { count, bytes } = getUsage(req.user.nick);
  const { maxPlaylistsPerUser, userQuotaBytes } = config.limits;

  if (count >= maxPlaylistsPerUser) return next(new HttpError(403, 'LIMIT_PLAYLISTS', { max: maxPlaylistsPerUser }));
  if (bytes >= userQuotaBytes) return next(new HttpError(403, 'QUOTA_EXCEEDED'));
  next();
}
