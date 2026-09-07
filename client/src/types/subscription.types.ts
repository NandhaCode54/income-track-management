export const PLAN_TYPES = ['FREE', 'PRO', 'FAMILY', 'ENTERPRISE'] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export const SUBSCRIPTION_STATUSES = ['TRIAL', 'ACTIVE', 'INACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING_PAYMENT'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

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
  monthlyEquivalent: number;
  features: PlanFeature[];
}

export interface Subscription {
  id: string;
  plan: PlanType;
  status: SubscriptionStatus;
  startDate: string;
  renewalDate: string | null;
  cancelledAt: string | null;
  trialEndsAt: string | null;
  paymentMethod: string | null;
  /** Set while `status = PENDING_PAYMENT` — the upgrade waits on the payment. */
  pendingPlan: PlanType | null;
  pendingBillingCycle: string | null;
  pendingAmount: number | null;
  createdAt: string;
  updatedAt: string;
  planDetails: PlanDefinition;
}

export interface PlanStatus {
  plan: PlanType;
  status: SubscriptionStatus;
  isPremium: boolean;
  /** The dev/demo provider is available — "complete demo payment" works. */
  demoMode: boolean;
}

export interface UpgradePayload {
  plan: PlanType;
  billingCycle: 'monthly' | 'yearly';
  paymentMethod?: string;
}

export const PLAN_LABELS: Record<PlanType, string> = {
  FREE: 'Free',
  PRO: 'Pro',
  FAMILY: 'Family',
  ENTERPRISE: 'Enterprise',
};

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIAL: 'Trial',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  PENDING_PAYMENT: 'Awaiting payment',
};

export const STATUS_VARIANTS: Record<SubscriptionStatus, 'default' | 'success' | 'warning' | 'destructive' | 'muted'> = {
  TRIAL: 'warning',
  ACTIVE: 'success',
  INACTIVE: 'muted',
  CANCELLED: 'destructive',
  EXPIRED: 'destructive',
  PENDING_PAYMENT: 'warning',
};
