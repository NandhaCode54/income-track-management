import type { PlanType, SubscriptionStatus } from '@prisma/client';
import type { Subscription } from '@prisma/client';

// ─── Plan Definitions ────────────────────────────────────────────────────────

export interface PlanFeature {
  label: string;
  included: boolean;
  limit?: number | string;
}

export interface PlanDefinition {
  plan: PlanType;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  /** The yearly price shown as "per month" on the billing toggle. */
  monthlyEquivalent: number;
  features: PlanFeature[];
}

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    plan: 'FREE',
    name: 'Free',
    description: 'For individuals getting started with expense tracking.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyEquivalent: 0,
    features: [
      { label: 'Up to 3 family members', included: true, limit: 3 },
      { label: 'Basic income & expense tracking', included: true },
      { label: 'Up to 5 budget categories', included: true, limit: 5 },
      { label: 'Basic reports', included: true },
      { label: 'EMI tracking', included: true },
      { label: 'Bill reminders', included: true },
      { label: 'CSV export', included: true },
      { label: 'AI insights', included: false },
      { label: 'Receipt scanning', included: false },
      { label: 'Priority support', included: false },
    ],
  },
  {
    plan: 'PRO',
    name: 'Pro',
    description: 'For families that need deeper insights and unlimited tracking.',
    monthlyPrice: 299,
    yearlyPrice: 2499,
    monthlyEquivalent: 208,
    features: [
      { label: 'Up to 10 family members', included: true, limit: 10 },
      { label: 'Unlimited budget categories', included: true },
      { label: 'Advanced reports & charts', included: true },
      { label: 'AI spending insights', included: true },
      { label: 'Receipt scanning', included: true },
      { label: 'Goal tracking', included: true },
      { label: 'Investment portfolio', included: true },
      { label: 'CSV & PDF export', included: true },
      { label: 'Email reminders', included: true },
      { label: 'Priority support', included: false },
    ],
  },
  {
    plan: 'FAMILY',
    name: 'Family',
    description: 'Full access for large families and joint households.',
    monthlyPrice: 599,
    yearlyPrice: 4999,
    monthlyEquivalent: 417,
    features: [
      { label: 'Unlimited family members', included: true, limit: 'Unlimited' },
      { label: 'Everything in Pro', included: true },
      { label: 'Chit fund tracking', included: true },
      { label: 'Asset & liability management', included: true },
      { label: 'School fee tracking', included: true },
      { label: 'Multi-workspace support', included: true },
      { label: 'Custom categories', included: true },
      { label: 'Priority email support', included: true },
      { label: 'Early access to features', included: true },
    ],
  },
];

/** Maximum members allowed per plan. `null` means unlimited. */
export const PLAN_MEMBER_LIMITS: Record<PlanType, number | null> = {
  FREE: 3,
  PRO: 10,
  FAMILY: null,
  ENTERPRISE: null,
};

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface SubscriptionDto {
  id: string;
  plan: PlanType;
  status: SubscriptionStatus;
  startDate: Date;
  renewalDate: Date | null;
  cancelledAt: Date | null;
  trialEndsAt: Date | null;
  paymentMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionWithPlanDto extends SubscriptionDto {
  planDetails: PlanDefinition;
}

// ─── Inputs ──────────────────────────────────────────────────────────────────

export interface UpgradePlanInput {
  plan: PlanType;
  billingCycle: 'monthly' | 'yearly';
  paymentMethod?: string;
  externalId?: string;
}

export interface CancelSubscriptionInput {
  reason?: string;
}

// ─── Mapping ─────────────────────────────────────────────────────────────────

const toDto = (row: Subscription): SubscriptionDto => ({
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
});

export const toDtoWithPlan = (row: Subscription): SubscriptionWithPlanDto => ({
  ...toDto(row),
  planDetails: PLAN_DEFINITIONS.find((p) => p.plan === row.plan) ?? PLAN_DEFINITIONS[0],
});
