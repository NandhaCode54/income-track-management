import { PlanType, SubscriptionStatus } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { ValidationError } from '../../shared/errors/ValidationError';
import { MSG } from '../../shared/constants/messages';
import { subscriptionRepository, canTransition } from './subscription.repository';
import type {
  SubscriptionDto,
  SubscriptionWithPlanDto,
  UpgradePlanInput,
} from './subscription.types';
import { PLAN_DEFINITIONS, PLAN_MEMBER_LIMITS, planPriceFor } from './subscription.types';
import { env } from '../../config/env';

export const subscriptionService = {
  /** The family's current plan row — used by the `requirePlan` middleware. */
  async getPlan(
    familyId: string,
  ): Promise<{ plan: PlanType; status: SubscriptionStatus } | null> {
    const row = await subscriptionRepository.findByFamilyId(familyId);
    return row ? { plan: row.plan, status: row.status } : null;
  },

  async getCurrent(familyId: string): Promise<SubscriptionWithPlanDto> {
    const row = await subscriptionRepository.findByFamilyId(familyId);
    if (!row) throw new NotFoundError('Subscription');

    const planDetails = PLAN_DEFINITIONS.find((p) => p.plan === row.plan) ?? PLAN_DEFINITIONS[0];
    return { ...this.toDto(row), planDetails };
  },

  async getAvailablePlans(): Promise<typeof PLAN_DEFINITIONS> {
    return PLAN_DEFINITIONS;
  },

  async upgrade(familyId: string, input: UpgradePlanInput): Promise<SubscriptionWithPlanDto> {
    const current = await subscriptionRepository.findByFamilyId(familyId);
    if (!current) throw new NotFoundError('Subscription');

    // Validate plan transition
    if (!canTransition(current.plan, input.plan)) {
      throw new ValidationError(MSG.VALIDATION_ERROR, {
        plan: [`Cannot switch from ${current.plan} to ${input.plan}`],
      });
    }

    // Check member limit when upgrading to a plan with fewer seats
    const targetLimit = PLAN_MEMBER_LIMITS[input.plan];
    if (targetLimit !== null) {
      const { current: memberCount } = await subscriptionRepository.isWithinMemberLimit(familyId);
      if (memberCount > targetLimit) {
        throw new ValidationError(MSG.VALIDATION_ERROR, {
          plan: [
            `${input.plan} plan allows a maximum of ${targetLimit} member${targetLimit === 1 ? '' : 's'}, but your family has ${memberCount}.`,
          ],
        });
      }
    }

    // An upgrade is only ever an *intent* here. The plan does not change until a
    // verified payment activates it (signed webhook, or the dev-only demo
    // provider). The client-supplied `externalId` is no longer accepted as proof
    // of payment — that avenue is what let anyone self-assign PRO/FAMILY.
    const amount = planPriceFor(input.plan, input.billingCycle);
    const row = await subscriptionRepository.createPendingUpgrade(familyId, {
      ...input,
      amount,
    });
    const planDetails = PLAN_DEFINITIONS.find((p) => p.plan === row.plan) ?? PLAN_DEFINITIONS[0];
    return { ...this.toDto(row), planDetails };
  },

  /**
   * Applies a verified, paid-for upgrade. Reached only through the signature-
   * checked webhook or the development-only demo provider — never from client input.
   * The pending intent must still match what was paid for, so a stale or
   * mismatched webhook cannot surprise-activate a different plan.
   */
  async activateVerifiedPayment(
    familyId: string,
    plan: PlanType,
    billingCycle: 'monthly' | 'yearly',
    reference: string,
  ): Promise<SubscriptionWithPlanDto> {
    const current = await subscriptionRepository.findByFamilyId(familyId);
    if (!current) throw new NotFoundError('Subscription');

    if (
      current.status !== SubscriptionStatus.PENDING_PAYMENT ||
      current.pendingPlan !== plan ||
      current.pendingBillingCycle !== billingCycle
    ) {
      throw new ValidationError(MSG.VALIDATION_ERROR, {
        plan: ['No matching pending upgrade for this payment.'],
      });
    }

    const row = await subscriptionRepository.activateVerifiedPayment(
      familyId,
      plan,
      billingCycle,
      reference,
    );
    const planDetails = PLAN_DEFINITIONS.find((p) => p.plan === row.plan) ?? PLAN_DEFINITIONS[0];
    return { ...this.toDto(row), planDetails };
  },

  /** The dev/demo stand-in for the payment provider's webhook call. */
  async completeDemoPayment(familyId: string, reference: string): Promise<SubscriptionWithPlanDto> {
    const current = await subscriptionRepository.findByFamilyId(familyId);
    if (!current || current.status !== SubscriptionStatus.PENDING_PAYMENT || !current.pendingPlan) {
      throw new ValidationError(MSG.VALIDATION_ERROR, {
        plan: ['No payment is awaiting confirmation on this subscription.'],
      });
    }
    return this.activateVerifiedPayment(
      familyId,
      current.pendingPlan,
      (current.pendingBillingCycle as 'monthly' | 'yearly') ?? 'monthly',
      reference,
    );
  },

  async cancel(familyId: string): Promise<SubscriptionWithPlanDto> {
    const current = await subscriptionRepository.findByFamilyId(familyId);
    if (!current) throw new NotFoundError('Subscription');

    if (current.plan === PlanType.FREE && current.status === SubscriptionStatus.TRIAL) {
      throw new ValidationError(MSG.VALIDATION_ERROR, {
        plan: ['Free trial cannot be cancelled. Upgrade to a paid plan to continue.'],
      });
    }

    if (current.status === SubscriptionStatus.CANCELLED) {
      throw new ValidationError(MSG.VALIDATION_ERROR, {
        plan: ['Subscription is already cancelled.'],
      });
    }

    const row = await subscriptionRepository.cancel(familyId);
    const planDetails = PLAN_DEFINITIONS.find((p) => p.plan === row.plan) ?? PLAN_DEFINITIONS[0];
    return { ...this.toDto(row), planDetails };
  },

  async reactivate(familyId: string): Promise<SubscriptionWithPlanDto> {
    const current = await subscriptionRepository.findByFamilyId(familyId);
    if (!current) throw new NotFoundError('Subscription');

    if (current.status !== SubscriptionStatus.CANCELLED) {
      throw new ValidationError(MSG.VALIDATION_ERROR, {
        plan: ['Only cancelled subscriptions can be reactivated.'],
      });
    }

    const row = await subscriptionRepository.reactivate(familyId);
    const planDetails = PLAN_DEFINITIONS.find((p) => p.plan === row.plan) ?? PLAN_DEFINITIONS[0];
    return { ...this.toDto(row), planDetails };
  },

async getPlanStatus(familyId: string): Promise<{
    plan: PlanType;
    status: SubscriptionStatus;
    isPremium: boolean;
    demoMode: boolean;
  }> {
    const { plan, status } = await subscriptionRepository.getPlanStatus(familyId);
    return {
      plan,
      status,
      isPremium:
        plan !== PlanType.FREE &&
        (status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIAL),
      // Lets the client unveil the "complete demo payment" button for a
      // PENDING_PAYMENT intent; unreachable in production.
      demoMode: env.PAYMENT_DEMO_MODE && env.NODE_ENV !== 'production',
    };
  },

  toDto(row: { id: string; plan: PlanType; status: SubscriptionStatus; startDate: Date; renewalDate: Date | null; cancelledAt: Date | null; trialEndsAt: Date | null; paymentMethod: string | null; pendingPlan: PlanType | null; pendingBillingCycle: string | null; pendingAmount: { toString(): string } | number | null; createdAt: Date; updatedAt: Date }): SubscriptionDto {
    return {
      id: row.id,
      plan: row.plan,
      status: row.status,
      startDate: row.startDate,
      renewalDate: row.renewalDate,
      cancelledAt: row.cancelledAt,
      trialEndsAt: row.trialEndsAt,
      paymentMethod: row.paymentMethod,
      pendingPlan: row.pendingPlan,
      pendingBillingCycle: row.pendingBillingCycle,
      pendingAmount: row.pendingAmount ? Number(row.pendingAmount) : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },
};
