-- Verified-upgrade payment intent
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';

-- A pending upgrade records the plan it asked for, the chosen billing cycle
-- and the price due; it becomes the live plan only after a verified payment.
ALTER TABLE "subscriptions"
  ADD COLUMN "pendingPlan" "PlanType",
  ADD COLUMN "pendingBillingCycle" TEXT,
  ADD COLUMN "pendingAmount" DECIMAL(10,2);