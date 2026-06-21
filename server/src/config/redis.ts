import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  enableOfflineQueue: false,
  lazyConnect: true,
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err.message));

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
  } catch {
    console.warn('⚠️  Redis unavailable — continuing without cache');
  }
}
