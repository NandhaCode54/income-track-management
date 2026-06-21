import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { sendError } from '../shared/utils/api-response.util';

export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => sendError(res, 'Too many requests. Please try again later.', 429),
});

export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    sendError(res, 'Too many authentication attempts. Please try again in 15 minutes.', 429),
  skipSuccessfulRequests: true,
});
