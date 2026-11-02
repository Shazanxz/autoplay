import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const MIN_LENGTH = 32;

export function resolveJwtSecret({ dataDir, isProduction }) {
  const fromEnv = process.env.JWT_SECRET;

  if (fromEnv) {
    if (fromEnv.length < MIN_LENGTH) {
      throw new Error(`JWT_SECRET precisa ter pelo menos ${MIN_LENGTH} caracteres. Gere um com: npm run gen-secret`);
    }
    return fromEnv;
  }

  if (isProduction) {
    throw new Error('JWT_SECRET não definido. Em produção ele é obrigatório. Gere um com: npm run gen-secret');
  }

  const file = path.join(dataDir, 'jwt-secret.key');
  if (fs.existsSync(file)) {
    const saved = fs.readFileSync(file, 'utf8').trim();
    if (saved.length >= MIN_LENGTH) return saved;
  }

  const generated = crypto.randomBytes(48).toString('hex');
  try {
    fs.writeFileSync(file, generated, { mode: 0o600, flag: 'wx' });
    return generated;
  } catch {
    return fs.readFileSync(file, 'utf8').trim();
  }
}
