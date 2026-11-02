import multer from 'multer';
import { config } from '../config/index.js';
import { translate } from '../i18n/index.js';
import { HttpError } from '../utils/http-error.js';

function normalizeError(err) {
  if (err instanceof HttpError) return err;

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return new HttpError(400, 'FILE_TOO_LARGE', { mb: config.limits.maxFileBytes / 1024 / 1024 });
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return new HttpError(400, 'TRACKS_LIMIT', { max: config.limits.maxTracks });
    }
    return new HttpError(400, 'UPLOAD_FAILED');
  }

  if (err.type === 'entity.parse.failed') return new HttpError(400, 'BAD_REQUEST');
  if (err.type === 'entity.too.large') return new HttpError(413, 'PAYLOAD_TOO_LARGE');

  console.error(err);
  return new HttpError(500, 'INTERNAL');
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const normalized = normalizeError(err);
  res.status(normalized.status).json({
    error: translate(req.lang, normalized.code, normalized.params),
    code: normalized.code,
  });
}
