import { HttpError } from '../utils/http-error.js';

export function rateLimit({ windowMs, max, key, code }) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [k, entry] of hits) if (entry.reset <= now) hits.delete(k);
  }, windowMs).unref();

  return (req, res, next) => {
    const id = key(req);
    const now = Date.now();
    let entry = hits.get(id);

    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(id, entry);
    }

    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return next(new HttpError(429, code));
    }
    next();
  };
}
