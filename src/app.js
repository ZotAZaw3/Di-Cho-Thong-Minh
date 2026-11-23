import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { rateLimiter } from './middlewares/rateLimit.js';
import { requestLog } from './middlewares/requestLog.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { apiRouter } from './routes/index.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY) app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  // Ảnh upload khi STORAGE_DRIVER=local.
  if (env.STORAGE_DRIVER === 'local') {
    app.use(`${env.API_PREFIX}/uploads`, express.static(path.resolve(env.UPLOAD_DIR), { maxAge: '7d' }));
  }

  app.use(env.API_PREFIX, rateLimiter, requestLog, apiRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
