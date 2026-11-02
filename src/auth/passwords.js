import crypto from 'crypto';
import { promisify } from 'util';
import argon2 from 'argon2';
import { config } from '../config/index.js';
import { Semaphore } from '../utils/semaphore.js';

const scrypt = promisify(crypto.scrypt);
const { pepper, argon2: params } = config.auth;

const hashOptions = {
  type: argon2.argon2id,
  memoryCost: params.memoryCost,
  timeCost: params.timeCost,
  parallelism: params.parallelism,
  ...(pepper ? { secret: Buffer.from(pepper) } : {}),
};
const verifyOptions = pepper ? { secret: Buffer.from(pepper) } : {};
const rehashParams = {
  memoryCost: params.memoryCost,
  timeCost: params.timeCost,
  parallelism: params.parallelism,
};

const gate = new Semaphore(params.maxConcurrent);

const isArgon2Hash = (hash) => hash.startsWith('$argon2');

async function verifyLegacyScrypt(password, salt, expectedHex) {
  const actual = await scrypt(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function hashPassword(password) {
  return gate.run(() => argon2.hash(password, hashOptions));
}

export async function verifyPassword(password, record) {
  if (isArgon2Hash(record.passwordHash)) {
    const valid = await gate.run(() => argon2.verify(record.passwordHash, password, verifyOptions));
    return { valid, needsRehash: valid && argon2.needsRehash(record.passwordHash, rehashParams) };
  }
  const valid = await gate.run(() => verifyLegacyScrypt(password, record.salt, record.passwordHash));
  return { valid, needsRehash: valid };
}

let dummyHash = null;

export async function burnDummyVerification(password) {
  if (!dummyHash) dummyHash = hashPassword(crypto.randomBytes(16).toString('hex'));
  const hash = await dummyHash;
  await gate.run(() => argon2.verify(hash, password, verifyOptions)).catch(() => false);
}
