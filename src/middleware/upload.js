import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { config } from '../config/index.js';
import { HttpError } from '../utils/http-error.js';

const { maxTracks, maxFileBytes } = config.limits;
const allowed = new Set(config.allowedExtensions);

export const uploadTracks = multer({
  storage: multer.diskStorage({
    destination: config.paths.tmpDir,
    filename(req, file, cb) {
      cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: {
    fileSize: maxFileBytes,
    files: maxTracks,
    fields: 5,
    fieldSize: 1024,
    parts: maxTracks + 5,
  },
  fileFilter(req, file, cb) {
    if (allowed.has(path.extname(file.originalname).toLowerCase())) return cb(null, true);
    cb(new HttpError(400, 'FORMAT_UNSUPPORTED'));
  },
}).array('tracks', maxTracks);
