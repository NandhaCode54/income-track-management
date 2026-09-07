import type { NextFunction, Request, Response } from 'express';
import { PlanType } from '@prisma/client';
import { subscriptionService } from './subscription.service';
import { actorFrom } from '../../shared/utils/request.util';
import { sendSuccess } from '../../shared/utils/api-response.util';
import { MSG } from '../../shared/constants/messages';
import { AppError } from '../../shared/errors/AppError';
import { env } from '../../config/env';
import { verifyWebhookSignature } from '../../shared/utils/webhook.util';
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
      sendSuccess(res, MSG.SUBSCRIPTION_PENDING_PAYMENT, { subscription });
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

  /**
   * Signed provider callback. Public, so the *signature* is the credential —
   * the payload must be verified against `PAYMENT_WEBHOOK_SECRET` before a
   * single entitlement is changed. Without a configured secret this fails
   * closed (503), which is the correct state for a deploy with no gateway.
   */
  webhook: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const secret = env.PAYMENT_WEBHOOK_SECRET;
      if (!secret) {
        throw new AppError('Payment webhooks are not configured.', 503, 'WEBHOOK_NOT_CONFIGURED');
      }

      const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
      const signature = req.get('x-webhook-signature');
      if (!verifyWebhookSignature(raw.toString('utf8'), signature, secret)) {
        throw new AppError('Invalid webhook signature', 401, 'INVALID_SIGNATURE');
      }

      const event = JSON.parse(raw.toString('utf8')) as {
        event: string;
        data?: {
          familyId?: string;
          plan?: PlanType;
          billingCycle?: string;
          reference?: string;
        };
      };

      // Acknowledge unrelated provider events so the provider does not retry them.
      if (event.event !== 'subscription.paid') {
        sendSuccess(res, 'Event ignored', {});
        return;
      }

      const { familyId, plan, billingCycle, reference } = event.data ?? {};
      if (
        !familyId ||
        (plan !== PlanType.PRO && plan !== PlanType.FAMILY) ||
        (billingCycle !== 'monthly' && billingCycle !== 'yearly') ||
        !reference
      ) {
        throw new AppError('Malformed webhook payload', 422, 'INVALID_WEBHOOK_PAYLOAD');
      }

      const subscription = await subscriptionService.activateVerifiedPayment(
        familyId,
        plan,
        billingCycle,
        reference,
      );
      sendSuccess(res, MSG.SUBSCRIPTION_UPGRADED, { subscription });
    } catch (e) {
      next(e);
    }
  },

  /**
   * Development/demo stand-in for the payment provider: it completes the
   * pending upgrade exactly as a verified webhook would. Guarded so it is
   * unreachable in production and whenever `PAYMENT_DEMO_MODE` is off.
   */
  demoPay: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!env.PAYMENT_DEMO_MODE || env.NODE_ENV === 'production') {
        throw new AppError('Demo payments are not available in this environment.', 404, 'NOT_FOUND');
      }
      const subscription = await subscriptionService.completeDemoPayment(
        actorFrom(req).familyId,
        `demo_${Date.now()}`,
      );
      sendSuccess(res, MSG.SUBSCRIPTION_UPGRADED, { subscription });
    } catch (e) {
      next(e);
    }
  },
};
