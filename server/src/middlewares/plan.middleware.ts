import type { NextFunction, Request, Response } from 'express';
import { PlanType, SubscriptionStatus } from '@prisma/client';
import { subscriptionService } from '../modules/subscription/subscription.service';
import { PLAN_FEATURE_ACCESS, type PlanFeatureKey } from '../modules/subscription/subscription.types';
import { PaymentRequiredError } from '../shared/errors/PaymentRequiredError';
import { actorFrom } from '../shared/utils/request.util';

/**
 * Gates a route behind one-or-more paid-plan entitlements. A FREE (or
 * non-active) subscription is rejected with 402/UPGRADE_REQUIRED; the enum
 * rather than UI copy is the source of truth for what a plan unlocks, so the
 * PAYMENT flow can never be bypassed by assuming entitlement from an HTTP verb.
 *
 * Feature entitlement is deliberately read live from the subscription row —
 * there is no entitlement cookie or client-supplied flag to forge.
 */
export const requirePlan =
  (...features: PlanFeatureKey[]) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const row = await subscriptionService.getPlan(actorFrom(req).familyId);
      const plan = row?.plan ?? PlanType.FREE;
      const status = row?.status ?? SubscriptionStatus.TRIAL;

      // TRIAL and ACTIVE both grant the plan's entitlements; everything else
      // (CANCELLED, EXPIRED, INACTIVE, PENDING_PAYMENT) withholds them.
      const isActiveSubscription =
        status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIAL;
      if (!isActiveSubscription) {
        throw new PaymentRequiredError();
      }
      if (!features.every((feature) => PLAN_FEATURE_ACCESS[feature].includes(plan))) {
        throw new PaymentRequiredError();
      }
      next();
    } catch (e) {
      next(e);
    }
  };