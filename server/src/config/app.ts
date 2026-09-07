import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { corsOptions } from './cors';
import { generalLimiter } from '../middlewares/rateLimit.middleware';
import { errorMiddleware, notFoundMiddleware } from '../middlewares/error.middleware';
import { apiRoutes } from '../routes';
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
  // The payment-provider webhook verifies an HMAC over the *raw* body, so it
  // must be captured before express.json() converts it. That consumer is routed
  // later as /api/v1/subscriptions/webhook.
  app.use('/api/v1/subscriptions/webhook', express.raw({ type: () => true }));
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

  app.set('trust proxy', 1);

  // ── API routes
  app.use('/api/v1', apiRoutes);

  // ── 404 handler
  app.use(notFoundMiddleware);

  // ── Global error handler (must be last)
  app.use(errorMiddleware);

  return app;
};
