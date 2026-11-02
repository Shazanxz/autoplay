import express from 'express';
import { config } from './config/index.js';
import { securityHeaders } from './middleware/security.js';
import { detectLanguage } from './middleware/language.js';
import { errorHandler } from './middleware/error-handler.js';
import apiRoutes from './routes/index.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  app.use(securityHeaders());
  app.use(detectLanguage);
  app.use(express.json({ limit: '10kb' }));

  app.use(express.static(config.paths.publicDir));
  app.use(express.static(config.paths.streamsDir, {
    index: false,
    dotfiles: 'ignore',
    setHeaders(res, filePath) {
      if (filePath.endsWith('.mp3')) res.setHeader('Content-Type', 'audio/mpeg');
    },
  }));

  app.use('/api', apiRoutes);
  app.use(errorHandler);

  return app;
}
