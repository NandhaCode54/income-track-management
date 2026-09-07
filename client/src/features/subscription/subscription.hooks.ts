import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QK } from '@/constants/queryKeys';
import { subscriptionApi } from '@/services/subscription.service';
import type { UpgradePayload } from '@/types/subscription.types';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';

const invalidateSubscription = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: QK.SUBSCRIPTION });
  void queryClient.invalidateQueries({ queryKey: QK.SUBSCRIPTION_STATUS });
};

export const useSubscription = () =>
  useQuery({ queryKey: QK.SUBSCRIPTION, queryFn: () => subscriptionApi.getCurrent() });

export const useSubscriptionPlans = () =>
  useQuery({ queryKey: QK.SUBSCRIPTION_PLANS, queryFn: () => subscriptionApi.getPlans() });

export const useSubscriptionStatus = () =>
  useQuery({ queryKey: QK.SUBSCRIPTION_STATUS, queryFn: () => subscriptionApi.getPlanStatus() });

export const useUpgradePlan = ({ onSuccess }: { onSuccess?: () => void } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpgradePayload) => subscriptionApi.upgrade(payload),
    onSuccess: () => {
      invalidateSubscription(queryClient);
      // Upgrades now *request* the plan; activation waits on the payment.
      toast.success('Upgrade requested — the new plan activates once the payment is confirmed.');
      onSuccess?.();
    },
    onError: (e) => toast.error('Could not request plan upgrade', getApiErrorMessage(e)),
  });
};

export const useDemoPay = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => subscriptionApi.demoPay(),
    onSuccess: () => {
      invalidateSubscription(queryClient);
      toast.success('Plan upgraded successfully');
    },
    onError: (e) => toast.error('Could not complete demo payment', getApiErrorMessage(e)),
  });
};

export const useCancelSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => subscriptionApi.cancel(),
    onSuccess: () => {
      invalidateSubscription(queryClient);
      toast.success('Subscription cancelled');
    },
    onError: (e) => toast.error('Could not cancel subscription', getApiErrorMessage(e)),
  });
};

export const useReactivateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => subscriptionApi.reactivate(),
    onSuccess: () => {
      invalidateSubscription(queryClient);
      toast.success('Subscription reactivated');
    },
    onError: (e) => toast.error('Could not reactivate subscription', getApiErrorMessage(e)),
  });
};
