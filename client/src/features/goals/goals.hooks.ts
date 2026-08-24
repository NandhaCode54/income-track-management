import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QK } from '@/constants/queryKeys';
import { goalsApi } from '@/services/goals.service';
import type { ContributePayload, GoalPayload } from '@/types/goals.types';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';

/**
 * Goal writes also refresh the dashboard prefix — the summary reads savings
 * across ledgers, so a new contribution moves more than this list.
 */
const invalidateGoals = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: QK.GOALS });
  void queryClient.invalidateQueries({ queryKey: QK.DASHBOARD });
};

export const useGoals = () =>
  useQuery({ queryKey: QK.GOALS, queryFn: () => goalsApi.list() });

export const useCreateGoal = ({ onSuccess }: { onSuccess?: () => void } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GoalPayload) => goalsApi.create(payload),
    onSuccess: () => {
      invalidateGoals(queryClient);
      toast.success('Goal created');
      onSuccess?.();
    },
    onError: (e) => toast.error('Could not create goal', getApiErrorMessage(e)),
  });
};

export const useUpdateGoal = ({ onSuccess }: { onSuccess?: () => void } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<GoalPayload> }) =>
      goalsApi.update(id, payload),
    onSuccess: () => {
      invalidateGoals(queryClient);
      toast.success('Goal updated');
      onSuccess?.();
    },
    onError: (e) => toast.error('Could not update goal', getApiErrorMessage(e)),
  });
};

export const useContributeToGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ContributePayload }) =>
      goalsApi.contribute(id, payload),
    onSuccess: (goal) => {
      invalidateGoals(queryClient);
      toast.success(`Added to ${goal.name}`);
    },
    onError: (e) => toast.error('Could not add contribution', getApiErrorMessage(e)),
  });
};

export const useRemoveGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsApi.remove(id),
    onSuccess: () => {
      invalidateGoals(queryClient);
      toast.success('Goal deleted');
    },
    onError: (e) => toast.error('Could not delete goal', getApiErrorMessage(e)),
  });
};
