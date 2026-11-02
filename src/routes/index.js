import { Router } from 'express';
import { HttpError } from '../utils/http-error.js';
import authRoutes from './auth.routes.js';
import playlistRoutes from './playlists.routes.js';

const router = Router();

router.use(authRoutes);
router.use(playlistRoutes);
router.use((req, res, next) => next(new HttpError(404, 'NOT_FOUND')));

export default router;
