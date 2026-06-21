import type { Response } from 'express';
import type { ApiResponse, PaginationMeta } from '../types/api-response';

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200,
  meta?: PaginationMeta,
): Response => {
  const response: ApiResponse<T> = { success: true, message, data, meta };
  return res.status(statusCode).json(response);
};

export const sendCreated = <T>(res: Response, message: string, data?: T): Response => {
  return sendSuccess(res, message, data, 201);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errors?: Record<string, string[]>,
): Response => {
  const response: ApiResponse = { success: false, message, errors };
  return res.status(statusCode).json(response);
};
