import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../shared/errors/AppError';
import { ValidationError } from '../shared/errors/ValidationError';
import { sendError } from '../shared/utils/api-response.util';
import { env } from '../config/env';

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ValidationError) {
    sendError(res, err.message, 422, err.errors);
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode);
    return;
  }

  if (err instanceof ZodError) {
    const errors = err.flatten().fieldErrors as Record<string, string[]>;
    sendError(res, 'Validation failed', 422, errors);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      sendError(res, 'A record with this value already exists.', 409);
      return;
    }
    if (err.code === 'P2025') {
      sendError(res, 'Record not found.', 404);
      return;
    }
  }

  // Unhandled errors — log in production, expose in dev
  console.error('Unhandled error:', err);
  const message = env.NODE_ENV === 'development' ? err.message : 'Something went wrong.';
  sendError(res, message, 500);
};

export const notFoundMiddleware = (_req: Request, res: Response): void => {
  sendError(res, `Route ${_req.originalUrl} not found`, 404);
};
