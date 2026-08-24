import './config/env'; // validates env first
import { createApp } from './config/app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { env } from './config/env';
import { logger } from './shared/utils/logger';
import { startScheduler, stopScheduler } from './jobs/scheduler';

const bootstrap = async (): Promise<void> => {
  const app = createApp();

  await connectDatabase();
  await connectRedis();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  // After the database is up: a tick that fires against a closed pool is a
  // logged error and a reminder nobody gets.
  startScheduler();

  // ── Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    // Stop scheduling before closing the database, so no tick starts against a
    // pool that is about to disappear.
    stopScheduler();
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Server closed');
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
  });
};

bootstrap();
