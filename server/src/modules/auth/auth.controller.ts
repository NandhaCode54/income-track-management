import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import type { RequestContext } from './auth.types';
import {
  setRefreshCookie,
  clearRefreshCookie,
  REFRESH_COOKIE,
} from '../../shared/utils/cookie.util';
import { sendSuccess, sendCreated } from '../../shared/utils/api-response.util';
import { AuthError } from '../../shared/errors/AuthError';
import { MSG } from '../../shared/constants/messages';

const contextFrom = (req: Request): RequestContext => ({
  ip: req.ip,
  userAgent: req.get('user-agent') ?? undefined,
});

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.register(req.body);
      sendCreated(res, MSG.AUTH_REGISTER_SUCCESS);
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken, ...result } = await authService.login(req.body, contextFrom(req));
      setRefreshCookie(res, refreshToken);
      sendSuccess(res, MSG.AUTH_LOGIN_SUCCESS, result);
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
      const { refreshToken, ...result } = await authService.refresh(token, contextFrom(req));
      setRefreshCookie(res, refreshToken);
      sendSuccess(res, MSG.AUTH_TOKEN_REFRESHED, result);
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
      await authService.logout(token);
      clearRefreshCookie(res);
      sendSuccess(res, MSG.AUTH_LOGOUT_SUCCESS);
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.verifyEmail(req.body.token);
      sendSuccess(res, MSG.AUTH_EMAIL_VERIFIED);
    } catch (err) {
      next(err);
    }
  },

  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.resendVerification(req.body.email);
      sendSuccess(res, MSG.AUTH_VERIFICATION_SENT);
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.forgotPassword(req.body.email);
      sendSuccess(res, MSG.AUTH_RESET_EMAIL_SENT);
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.resetPassword(req.body);
      sendSuccess(res, MSG.AUTH_PASSWORD_RESET);
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AuthError();
      await authService.changePassword(req.user.id, req.body);
      clearRefreshCookie(res);
      sendSuccess(res, MSG.AUTH_PASSWORD_CHANGED);
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AuthError();
      const profile = await authService.getProfile(req.user.id);
      sendSuccess(res, MSG.FETCHED, profile);
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AuthError();
      const user = await authService.updateProfile(req.user.id, req.body);
      sendSuccess(res, MSG.UPDATED, { user });
    } catch (err) {
      next(err);
    }
  },
};
