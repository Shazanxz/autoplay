import { config } from '../config/index.js';
import { HttpError } from '../utils/http-error.js';
import { findUser, insertUser, updatePasswordHash } from '../db/users.js';
import { normalizeNick, isValidNick, assertPasswordAllowed } from './validators.js';
import { hashPassword, verifyPassword, burnDummyVerification } from './passwords.js';
import { openSession } from './sessions.js';

export async function registerUser(rawNick, password) {
  const nick = normalizeNick(rawNick);
  if (!isValidNick(nick)) throw new HttpError(400, 'NICK_INVALID');
  assertPasswordAllowed(password, nick);

  const hash = await hashPassword(password);

  try {
    insertUser(nick, hash);
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') throw new HttpError(409, 'NICK_TAKEN');
    throw err;
  }

  return { nick, ...openSession(nick) };
}

export async function loginUser(rawNick, password) {
  const nick = normalizeNick(rawNick);
  const candidate =
    typeof password === 'string' && password.length <= config.auth.password.maxLength ? password : '';

  const user = findUser(nick);
  if (!user) {
    await burnDummyVerification(candidate);
    throw new HttpError(401, 'CREDENTIALS_INVALID');
  }

  const { valid, needsRehash } = await verifyPassword(candidate, user);
  if (!valid) throw new HttpError(401, 'CREDENTIALS_INVALID');

  if (needsRehash) {
    try {
      updatePasswordHash(nick, await hashPassword(candidate));
    } catch (err) {
      console.error('[AUTH] Falha ao atualizar o hash da senha:', err.message);
    }
  }

  return { nick, ...openSession(nick) };
}
