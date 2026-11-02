import { config } from '../config/index.js';
import { HttpError } from '../utils/http-error.js';
import { verifyToken } from './tokens.js';
import { touchActiveSession, refreshedToken } from './sessions.js';

export function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return next(new HttpError(401, 'NO_TOKEN'));

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return next(new HttpError(401, 'SESSION_EXPIRED'));
  }

  const session = payload.jti ? touchActiveSession(payload.jti) : null;
  if (!session) return next(new HttpError(401, 'SESSION_EXPIRED'));

  req.user = { nick: session.nick, jti: payload.jti };
  res.setHeader('X-Session-Token', refreshedToken(session.nick, payload.jti));
  res.setHeader('X-Session-Expires-In', String(Math.floor(config.auth.inactivityMs / 1000)));
  next();
}
