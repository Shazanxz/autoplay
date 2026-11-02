import { resolveLanguage } from '../i18n/index.js';

export function detectLanguage(req, res, next) {
  req.lang = resolveLanguage(req);
  next();
}
