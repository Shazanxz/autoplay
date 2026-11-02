import { config } from '../config/index.js';
import { HttpError } from '../utils/http-error.js';

const COMMON_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', '12341234', '00000000', '11111111',
  'password', 'password1', 'password123', 'qwertyui', 'qwerty123', 'abc12345',
  'iloveyou', 'letmein1', 'admin123', 'senha123', 'senha1234', 'minhasenha',
  'brasil123', 'mudar123',
]);

export function normalizeNick(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-_]/g, '');
}

export function isValidNick(nick) {
  return /^[a-z0-9][a-z0-9-_]{1,22}[a-z0-9]$/.test(nick);
}

export function assertPasswordAllowed(password, nick) {
  const { minLength, maxLength } = config.auth.password;

  if (typeof password !== 'string' || password.length < minLength || password.length > maxLength) {
    throw new HttpError(400, 'PASSWORD_INVALID', { min: minLength, max: maxLength });
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase()) || password.toLowerCase() === nick) {
    throw new HttpError(400, 'PASSWORD_WEAK');
  }
}
