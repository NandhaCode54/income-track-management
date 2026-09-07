import { Loader2 } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import { useSubscription, useUpgradePlan } from '@/features/subscription/subscription.hooks';
import PlanCard from '@/features/subscription/PlanCard';
import SubscriptionInfo from '@/features/subscription/SubscriptionInfo';
import type { PlanDefinition } from '@/types/subscription.types';

const PLAN_DEFS: PlanDefinition[] = [
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

const SubscriptionPage = () => {
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const upgrade = useUpgradePlan();

  if (subLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const awaitingPayment = subscription?.status === 'PENDING_PAYMENT';

  const handleSelectPlan = (plan: PlanDefinition, billingCycle: 'monthly' | 'yearly') => {
    if (awaitingPayment) return;
    upgrade.mutate({ plan: plan.plan, billingCycle });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription"
        description="Manage your family plan and billing."
      />

      {subscription && <SubscriptionInfo subscription={subscription} />}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {PLAN_DEFS.map((plan) => (
            <PlanCard
              key={plan.plan}
              plan={plan}
              currentPlan={subscription?.plan ?? 'FREE'}
              subscription={subscription ?? null}
              onSelectPlan={handleSelectPlan}
              isPending={upgrade.isPending}
              awaitingPayment={awaitingPayment}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
