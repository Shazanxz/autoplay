import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveJwtSecret } from './secret.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = process.env;

function toNumber(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const nodeEnv = env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const paths = {
  root: ROOT,
  publicDir: path.join(ROOT, 'public'),
  dataDir: path.resolve(ROOT, env.DATA_DIR || 'data'),
  streamsDir: path.resolve(ROOT, env.STREAMS_DIR || 'streams'),
  tmpDir: path.resolve(ROOT, env.TMP_DIR || 'tmp_uploads'),
};

for (const dir of [paths.dataDir, paths.streamsDir, paths.tmpDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

export const config = {
  env: nodeEnv,
  isProduction,
  port: toNumber(env.PORT, 3000),
  host: env.HOST || '0.0.0.0',
  trustProxy: toNumber(env.TRUST_PROXY, 1),
  streamProtocol: env.STREAM_PROTOCOL || 'http',
  publicHost: env.PUBLIC_HOST || '',
  defaultLanguage: 'pt-BR',
  paths,
  auth: {
    jwtSecret: resolveJwtSecret({ dataDir: paths.dataDir, isProduction }),
    jwtIssuer: 'autoplay',
    tokenTtlSeconds: 60 * 60,
    inactivityMs: 60 * 60 * 1000,
    pepper: env.PASSWORD_PEPPER || '',
    password: { minLength: 8, maxLength: 128 },
    argon2: {
      memoryCost: toNumber(env.ARGON2_MEMORY_KIB, 19456),
      timeCost: toNumber(env.ARGON2_TIME_COST, 2),
      parallelism: toNumber(env.ARGON2_PARALLELISM, 1),
      maxConcurrent: toNumber(env.ARGON2_MAX_CONCURRENT, 2),
    },
  },
  limits: {
    maxTracks: 10,
    maxTrackSeconds: 6 * 60,
    maxFileBytes: 20 * 1024 * 1024,
    maxPlaylistsPerUser: toNumber(env.MAX_PLAYLISTS_PER_USER, 20),
    userQuotaBytes: toNumber(env.USER_QUOTA_MB, 300) * 1024 * 1024,
    maxConcurrentJobs: toNumber(env.MAX_CONCURRENT_JOBS, 2),
    maxQueuedJobs: 20,
    ffmpegTimeoutMs: 10 * 60 * 1000,
    tmpMaxAgeMs: 60 * 60 * 1000,
  },
  allowedExtensions: ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.opus', '.webm'],
  reservedSlugs: ['index', 'style', 'app', 'api', 'favicon', 'static', 'assets', 'admin', 'icons', 'css', 'js', 'locales'],
};
