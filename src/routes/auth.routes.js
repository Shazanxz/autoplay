import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { requireAuth } from '../auth/middleware.js';
import { registerUser, loginUser } from '../auth/service.js';
import { closeSession } from '../auth/sessions.js';
import { normalizeNick } from '../auth/validators.js';
import { config } from '../config/index.js';

const router = Router();

const limitAuthPerIp = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  key: (req) => req.ip,
  code: 'RATE_AUTH',
});
const limitLoginPerNick = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  key: (req) => `${req.ip}|${normalizeNick(req.body && req.body.nick)}`,
  code: 'RATE_LOGIN',
});
const limitRegister = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  key: (req) => req.ip,
  code: 'RATE_REGISTER',
});

router.post('/register', limitAuthPerIp, limitRegister, asyncHandler(async (req, res) => {
  const { nick, password } = req.body || {};
  res.json({ success: true, ...(await registerUser(nick, password)) });
}));

router.post('/login', limitAuthPerIp, limitLoginPerNick, asyncHandler(async (req, res) => {
  const { nick, password } = req.body || {};
  res.json({ success: true, ...(await loginUser(nick, password)) });
}));

router.post('/logout', requireAuth, (req, res) => {
  closeSession(req.user.jti);
  res.removeHeader('X-Session-Token');
  res.json({ success: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    nick: req.user.nick,
    inactivityLimitSeconds: Math.floor(config.auth.inactivityMs / 1000),
  });
});

export default router;
