import type { Response } from 'express';
import { env } from '../../config/env';
import { parseDurationMs } from './date.util';

export const REFRESH_COOKIE = 'refreshToken';

/** Refresh cookie lifetime derived from the JWT refresh expiry config. */
export const REFRESH_COOKIE_MAX_AGE = parseDurationMs(env.JWT_REFRESH_EXPIRES_IN) || 7 * 24 * 60 * 60 * 1000;

// Scope the cookie to auth routes only — it is never needed elsewhere.
const COOKIE_PATH = '/api/v1/auth';

const baseOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: COOKIE_PATH,
};

export const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE, token, { ...baseOptions, maxAge: REFRESH_COOKIE_MAX_AGE });
};

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE, baseOptions);
};
