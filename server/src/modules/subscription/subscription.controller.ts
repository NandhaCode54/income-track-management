import type { NextFunction, Request, Response } from 'express';
import { subscriptionService } from './subscription.service';
import { actorFrom } from '../../shared/utils/request.util';
import { sendSuccess } from '../../shared/utils/api-response.util';
import { MSG } from '../../shared/constants/messages';
import type { UpgradePlanInput } from './subscription.types';

export const subscriptionController = {
  getCurrent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscription = await subscriptionService.getCurrent(actorFrom(req).familyId);
      sendSuccess(res, MSG.FETCHED, { subscription });
    } catch (e) {
      next(e);
    }
  },

  getPlans: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const plans = await subscriptionService.getAvailablePlans();
      sendSuccess(res, MSG.FETCHED, { plans });
    } catch (e) {
      next(e);
    }
  },

  upgrade: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscription = await subscriptionService.upgrade(
        actorFrom(req).familyId,
        req.body as UpgradePlanInput,
      );
      sendSuccess(res, MSG.SUBSCRIPTION_UPGRADED, { subscription });
    } catch (e) {
      next(e);
    }
  },

  cancel: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscription = await subscriptionService.cancel(actorFrom(req).familyId);
      sendSuccess(res, MSG.SUBSCRIPTION_CANCELLED, { subscription });
    } catch (e) {
      next(e);
    }
  },

  reactivate: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscription = await subscriptionService.reactivate(actorFrom(req).familyId);
      sendSuccess(res, MSG.SUBSCRIPTION_REACTIVATED, { subscription });
    } catch (e) {
      next(e);
    }
  },

  getPlanStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await subscriptionService.getPlanStatus(actorFrom(req).familyId);
      sendSuccess(res, MSG.FETCHED, status);
    } catch (e) {
      next(e);
    }
  },
};
