import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QK } from '@/constants/queryKeys';
import { paymentsApi, type PaymentPayload, type RecordPaymentPayload } from '@/services/payments.service';
import type { PaymentFilters, PaymentKind } from '@/types/payments.types';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';

const KIND_KEY: Record<PaymentKind, readonly string[]> = {
  bill: QK.BILLS,
  rent: QK.RENT,
  schoolFee: QK.SCHOOL_FEES,
};

/**
 * Every write also invalidates the dashboard prefix: the upcoming-bills strip
 * reads bills/rent/fees directly, so a payment recorded here must not leave
 * the dashboard showing something already settled.
 */
export const invalidatePayments = (
  queryClient: ReturnType<typeof useQueryClient>,
  kind: PaymentKind,
) => {
  void queryClient.invalidateQueries({ queryKey: KIND_KEY[kind] });
  void queryClient.invalidateQueries({ queryKey: QK.DASHBOARD });
};

export const usePaymentsList = (kind: PaymentKind, filters: PaymentFilters) =>
  useQuery({
    queryKey: [...KIND_KEY[kind], 'list', filters],
    queryFn: () => paymentsApi.list(kind, filters),
  });

interface PaymentMutationCallbacks {
  onSuccess?: () => void;
}

export const useCreatePayment = (kind: PaymentKind, { onSuccess }: PaymentMutationCallbacks = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PaymentPayload) => paymentsApi.create(kind, payload),
    onSuccess: () => {
      invalidatePayments(queryClient, kind);
      toast.success('Saved');
      onSuccess?.();
    },
    onError: (e) => toast.error('Could not save', getApiErrorMessage(e)),
  });
};

export const useUpdatePayment = (kind: PaymentKind, { onSuccess }: PaymentMutationCallbacks = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PaymentPayload> }) =>
      paymentsApi.update(kind, id, payload),
    onSuccess: () => {
      invalidatePayments(queryClient, kind);
      toast.success('Updated');
      onSuccess?.();
    },
    onError: (e) => toast.error('Could not update', getApiErrorMessage(e)),
  });
};

export const useRecordPayment = (kind: PaymentKind) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RecordPaymentPayload }) =>
      paymentsApi.recordPayment(kind, id, payload),
    onSuccess: () => {
      invalidatePayments(queryClient, kind);
      toast.success('Payment recorded');
    },
    onError: (e) => toast.error('Could not record payment', getApiErrorMessage(e)),
  });
};

export const useRemovePayment = (kind: PaymentKind) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentsApi.remove(kind, id),
    onSuccess: () => {
      invalidatePayments(queryClient, kind);
      toast.success('Deleted');
    },
    onError: (e) => toast.error('Could not delete', getApiErrorMessage(e)),
  });
};
