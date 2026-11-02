import crypto from 'crypto';
import { config } from '../config/index.js';
import { signToken } from './tokens.js';
import {
  insertSession,
  findSession,
  touchSession,
  removeSession,
  pruneSessions,
} from '../db/sessions.js';

const { inactivityMs, tokenTtlSeconds } = config.auth;

function pruneExpired() {
  pruneSessions(Date.now() - inactivityMs);
}

setInterval(pruneExpired, 5 * 60 * 1000).unref();

export function openSession(nick) {
  const jti = crypto.randomUUID();
  pruneExpired();
  insertSession(jti, nick, Date.now());
  return { token: signToken(nick, jti), expiresIn: tokenTtlSeconds };
}

export function closeSession(jti) {
  removeSession(jti);
}

export function touchActiveSession(jti) {
  const session = findSession(jti);
  if (!session) return null;

  const now = Date.now();
  if (now - session.lastSeenAt > inactivityMs) {
    removeSession(jti);
    return null;
  }

  touchSession(jti, now);
  return session;
}

export function refreshedToken(nick, jti) {
  return signToken(nick, jti);
}
