import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { budgetApi } from '@/services/budget.service';
import { QK } from '@/constants/queryKeys';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import type { BudgetPayload, BudgetPeriod, CopyBudgetsPayload } from '@/types/budget.types';

// ── Queries ───────────────────────────────────────────────────────────────────

export const useBudgetVsActual = (period: BudgetPeriod) =>
  useQuery({
    queryKey: QK.BUDGET_VS_ACTUAL(period),
    queryFn: () => budgetApi.vsActual(period),
    // Keeps the table on screen while the month is switched.
    placeholderData: keepPreviousData,
  });

export const useBudgets = (period: BudgetPeriod) =>
  useQuery({
    queryKey: QK.BUDGET_LIST(period),
    queryFn: () => budgetApi.list(period),
    placeholderData: keepPreviousData,
  });

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Any budget write changes the comparison for that month, so the whole
 * `['budgets']` prefix is invalidated rather than a hand-picked period key.
 */
const useBudgetMutation = <TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  options: { successTitle: string; errorTitle: string },
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.BUDGETS });
      queryClient.invalidateQueries({ queryKey: QK.DASHBOARD });
      toast.success(options.successTitle);
    },
    onError: (error) => toast.error(options.errorTitle, getApiErrorMessage(error)),
  });
};

export const useCreateBudget = () =>
  useBudgetMutation((payload: BudgetPayload) => budgetApi.create(payload), {
    successTitle: 'Budget set',
    errorTitle: 'Could not set budget',
  });

export const useUpdateBudget = () =>
  useBudgetMutation(
    (args: { id: string; amount: number }) => budgetApi.update(args.id, args.amount),
    { successTitle: 'Budget updated', errorTitle: 'Could not update budget' },
  );

export const useDeleteBudget = () =>
  useBudgetMutation((id: string) => budgetApi.remove(id), {
    successTitle: 'Budget removed',
    errorTitle: 'Could not remove budget',
  });

/** Reports its own counts, so it carries the server's message into the toast. */
export const useCopyBudgets = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CopyBudgetsPayload) => budgetApi.copy(payload),
    onSuccess: ({ result, message }) => {
      queryClient.invalidateQueries({ queryKey: QK.BUDGETS });
      const detail = [
        result.copied > 0 ? `${result.copied} copied` : null,
        result.overwritten > 0 ? `${result.overwritten} replaced` : null,
        result.skipped > 0 ? `${result.skipped} left alone` : null,
      ]
        .filter(Boolean)
        .join(' · ');
      toast.success(message, detail || undefined);
    },
    onError: (error) => toast.error('Could not copy budgets', getApiErrorMessage(error)),
  });
};
