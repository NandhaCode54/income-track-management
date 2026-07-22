import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { incomeApi } from '@/services/income.service';
import { QK } from '@/constants/queryKeys';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import type {
  IncomeFilters,
  IncomePayload,
  IncomeSummaryParams,
} from '@/types/income.types';

// ── Queries ───────────────────────────────────────────────────────────────────

/** `keepPreviousData` stops the table flashing empty while a page or filter changes. */
export const useIncomeList = (filters: IncomeFilters) =>
  useQuery({
    queryKey: QK.INCOME_LIST(filters),
    queryFn: () => incomeApi.list(filters),
    placeholderData: keepPreviousData,
  });

export const useIncomeSummary = (params: IncomeSummaryParams) =>
  useQuery({
    queryKey: QK.INCOME_SUMMARY(params),
    queryFn: () => incomeApi.summary(params),
    placeholderData: keepPreviousData,
  });

export const useRecurringIncome = () =>
  useQuery({ queryKey: QK.INCOME_RECURRING, queryFn: incomeApi.listRecurring });

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Every income write shifts totals, the recurring list and the dashboard, so each
 * one invalidates the whole `['income']` prefix rather than a hand-picked subset.
 */
const useIncomeMutation = <TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  options: { successTitle: string; errorTitle: string },
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.INCOME });
      queryClient.invalidateQueries({ queryKey: QK.DASHBOARD_SUMMARY });
      toast.success(options.successTitle);
    },
    onError: (error) => toast.error(options.errorTitle, getApiErrorMessage(error)),
  });
};

export const useCreateIncome = () =>
  useIncomeMutation((payload: IncomePayload) => incomeApi.create(payload), {
    successTitle: 'Income added',
    errorTitle: 'Could not add income',
  });

export const useUpdateIncome = () =>
  useIncomeMutation(
    (args: { id: string; payload: Partial<IncomePayload> }) =>
      incomeApi.update(args.id, args.payload),
    { successTitle: 'Income updated', errorTitle: 'Could not update income' },
  );

export const useDeleteIncome = () =>
  useIncomeMutation((id: string) => incomeApi.remove(id), {
    successTitle: 'Income deleted',
    errorTitle: 'Could not delete income',
  });
