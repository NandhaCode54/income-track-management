import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { emiApi } from '@/services/emi.service';
import { QK } from '@/constants/queryKeys';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import type {
  CalculatorInput,
  EmiFilters,
  EmiPayload,
  RecordPaymentPayload,
} from '@/types/emi.types';

// ── Queries ───────────────────────────────────────────────────────────────────

export const useEmis = (filters: EmiFilters) =>
  useQuery({
    queryKey: QK.EMI_LIST(filters),
    queryFn: () => emiApi.list(filters),
    // Keeps the table on screen while a filter or page changes.
    placeholderData: keepPreviousData,
  });

/** The detail query carries the schedule, so it is only fetched when a loan is opened. */
export const useEmi = (id: string | null) =>
  useQuery({
    queryKey: QK.EMI_DETAIL(id ?? ''),
    queryFn: () => emiApi.getOne(id as string),
    enabled: !!id,
  });

export const useUpcomingEmis = (days: number) =>
  useQuery({
    queryKey: QK.EMI_UPCOMING(days),
    queryFn: () => emiApi.upcoming(days),
    placeholderData: keepPreviousData,
  });

/**
 * The calculator writes nothing, so it is cached hard and never invalidated by a
 * mutation: the same three inputs always give the same answer. `enabled` keeps it
 * from firing on a half-typed form.
 */
export const useEmiCalculator = (input: CalculatorInput | null) =>
  useQuery({
    queryKey: QK.EMI_CALCULATOR(input),
    queryFn: () => emiApi.calculate(input as CalculatorInput),
    enabled: !!input,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Every EMI write moves the list, the loan's own schedule *and* the dashboard's
 * upcoming-payments feed, so both prefixes are invalidated rather than a
 * hand-picked set of keys — the next query added would otherwise be missed.
 */
const useEmiMutation = <TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  options: { successTitle: string; errorTitle: string },
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.EMIS });
      queryClient.invalidateQueries({ queryKey: QK.DASHBOARD });
      toast.success(options.successTitle);
    },
    onError: (error) => toast.error(options.errorTitle, getApiErrorMessage(error)),
  });
};

export const useCreateEmi = () =>
  useEmiMutation((payload: EmiPayload) => emiApi.create(payload), {
    successTitle: 'Loan added',
    errorTitle: 'Could not add the loan',
  });

export const useUpdateEmi = () =>
  useEmiMutation(
    (args: { id: string; payload: Partial<EmiPayload> }) => emiApi.update(args.id, args.payload),
    { successTitle: 'Loan updated', errorTitle: 'Could not update the loan' },
  );

export const useDeleteEmi = () =>
  useEmiMutation((id: string) => emiApi.remove(id), {
    successTitle: 'Loan removed',
    errorTitle: 'Could not remove the loan',
  });

export const useRecordEmiPayment = () =>
  useEmiMutation(
    (args: { id: string; payload: RecordPaymentPayload }) =>
      emiApi.recordPayment(args.id, args.payload),
    { successTitle: 'Payment recorded', errorTitle: 'Could not record the payment' },
  );
