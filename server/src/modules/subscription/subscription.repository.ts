import { PlanType, Prisma, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import type { UpgradePlanInput } from './subscription.types';
import { PLAN_MEMBER_LIMITS } from './subscription.types';

export const subscriptionSelect = {
  id: true,
  plan: true,
  status: true,
  startDate: true,
  renewalDate: true,
  cancelledAt: true,
  trialEndsAt: true,
  paymentMethod: true,
  externalId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SubscriptionSelect;

export type SubscriptionRow = Prisma.SubscriptionGetPayload<{ select: typeof subscriptionSelect }>;

/** Plan transition rules: which plans can upgrade/downgrade to which. */
const PLAN_ORDER: PlanType[] = ['FREE', 'PRO', 'FAMILY', 'ENTERPRISE'];

const planRank = (plan: PlanType): number => PLAN_ORDER.indexOf(plan);

export const canTransition = (from: PlanType, to: PlanType): boolean => {
  // Any non-ENTERPRISE plan can go to any other non-ENTERPRISE plan.
  if (to === 'ENTERPRISE') return false;
  if (from === 'ENTERPRISE') return false;
  return from !== to;
};

export const subscriptionRepository = {
  findByFamilyId(familyId: string): Promise<SubscriptionRow | null> {
    return prisma.subscription.findUnique({
      where: { familyId },
      select: subscriptionSelect,
    });
  },

  create(familyId: string): Promise<SubscriptionRow> {
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);

    return prisma.subscription.create({
      data: {
        familyId,
        plan: PlanType.FREE,
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: trialEnds,
      },
      select: subscriptionSelect,
    });
  },

  async upgrade(familyId: string, input: UpgradePlanInput): Promise<SubscriptionRow> {
    const renewalDate = new Date();
    if (input.billingCycle === 'monthly') {
      renewalDate.setMonth(renewalDate.getMonth() + 1);
    } else {
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    }

    return prisma.subscription.update({
      where: { familyId },
      data: {
        plan: input.plan,
        status: SubscriptionStatus.ACTIVE,
        renewalDate,
        cancelledAt: null,
        trialEndsAt: null,
        ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
        ...(input.externalId ? { externalId: input.externalId } : {}),
      },
      select: subscriptionSelect,
    });
  },

  async cancel(familyId: string): Promise<SubscriptionRow> {
    return prisma.subscription.update({
      where: { familyId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      select: subscriptionSelect,
    });
  },

  async reactivate(familyId: string): Promise<SubscriptionRow> {
    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + 1);

    return prisma.subscription.update({
      where: { familyId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        renewalDate,
        cancelledAt: null,
      },
      select: subscriptionSelect,
    });
  },

  /** Check if a family has exceeded its plan's member limit. */
  async isWithinMemberLimit(familyId: string): Promise<{ within: boolean; current: number; limit: number | null }> {
    const subscription = await prisma.subscription.findUnique({
      where: { familyId },
      select: { plan: true },
    });
    const plan = subscription?.plan ?? PlanType.FREE;
    const limit = PLAN_MEMBER_LIMITS[plan];

    const current = await prisma.familyMember.count({
      where: { familyId, isActive: true },
    });

    return {
      within: limit === null || current < limit,
      current,
      limit,
    };
  },

  /** Check if a specific feature is available on the current plan. */
  async getPlanStatus(familyId: string): Promise<{ plan: PlanType; status: SubscriptionStatus }> {
    const sub = await prisma.subscription.findUnique({
      where: { familyId },
      select: { plan: true, status: true },
    });
    return sub ?? { plan: PlanType.FREE, status: SubscriptionStatus.TRIAL };
  },
};
