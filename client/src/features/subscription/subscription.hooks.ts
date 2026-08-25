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
      toast.success('Plan upgraded successfully');
      onSuccess?.();
    },
    onError: (e) => toast.error('Could not upgrade plan', getApiErrorMessage(e)),
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
