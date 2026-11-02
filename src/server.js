import { config } from './config/index.js';
import { closeDb } from './db/index.js';
import { createApp } from './app.js';
import { scheduleTmpSweep } from './services/tmp-cleaner.js';

scheduleTmpSweep();

const server = createApp().listen(config.port, config.host, () => {
  console.log(`Autoplay rodando em http://${config.host}:${config.port} (${config.env})`);
});

function shutdown() {
  server.close(() => {
    closeDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
