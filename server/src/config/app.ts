import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { corsOptions } from './cors';
import { generalLimiter } from '../middlewares/rateLimit.middleware';
import { errorMiddleware, notFoundMiddleware } from '../middlewares/error.middleware';
import { env } from './env';

export const createApp = (): express.Application => {
  const app = express();

  // ── Security headers
  app.use(helmet());
  app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

  // ── CORS
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // ── Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // ── Compression
  app.use(compression());

  // ── HTTP logging (dev only)
  if (env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  // ── Rate limiting
  app.use('/api', generalLimiter);

  // ── Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', env: env.NODE_ENV, timestamp: new Date().toISOString() });
  });

  // ── API routes (registered in server.ts)
  app.set('trust proxy', 1);

  // ── 404 handler
  app.use(notFoundMiddleware);

  // ── Global error handler (must be last)
  app.use(errorMiddleware);

  return app;
};
