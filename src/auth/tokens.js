import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

const { jwtSecret, jwtIssuer, tokenTtlSeconds } = config.auth;
const ALGORITHM = 'HS256';

export function signToken(nick, jti) {
  return jwt.sign({ nick }, jwtSecret, {
    algorithm: ALGORITHM,
    issuer: jwtIssuer,
    subject: nick,
    jwtid: jti,
    expiresIn: tokenTtlSeconds,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, jwtSecret, { algorithms: [ALGORITHM], issuer: jwtIssuer });
}
