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
import { PLAN_DEFINITIONS, PLAN_MEMBER_LIMITS } from './subscription.types';

export const subscriptionService = {
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

    const row = await subscriptionRepository.upgrade(familyId, input);
    const planDetails = PLAN_DEFINITIONS.find((p) => p.plan === row.plan) ?? PLAN_DEFINITIONS[0];
    return { ...this.toDto(row), planDetails };
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

  async getPlanStatus(familyId: string): Promise<{ plan: PlanType; status: SubscriptionStatus; isPremium: boolean }> {
    const { plan, status } = await subscriptionRepository.getPlanStatus(familyId);
    return {
      plan,
      status,
      isPremium: plan !== PlanType.FREE && (status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIAL),
    };
  },

  toDto(row: { id: string; plan: PlanType; status: SubscriptionStatus; startDate: Date; renewalDate: Date | null; cancelledAt: Date | null; trialEndsAt: Date | null; paymentMethod: string | null; createdAt: Date; updatedAt: Date }): SubscriptionDto {
    return {
      id: row.id,
      plan: row.plan,
      status: row.status,
      startDate: row.startDate,
      renewalDate: row.renewalDate,
      cancelledAt: row.cancelledAt,
      trialEndsAt: row.trialEndsAt,
      paymentMethod: row.paymentMethod,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },
};
