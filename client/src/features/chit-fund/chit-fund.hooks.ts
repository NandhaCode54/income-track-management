import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QK } from '@/constants/queryKeys';
import { chitFundApi } from '@/services/chit-fund.service';
import type { CreateChitFundPayload, RecordChitPaymentPayload } from '@/types/chit-fund.types';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';

const invalidateChitFunds = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: QK.CHIT_FUNDS });
  void queryClient.invalidateQueries({ queryKey: QK.DASHBOARD });
};

export const useChitFunds = () =>
  useQuery({ queryKey: QK.CHIT_FUNDS, queryFn: () => chitFundApi.list() });

export const useCreateChitFund = ({ onSuccess }: { onSuccess?: () => void } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateChitFundPayload) => chitFundApi.create(payload),
    onSuccess: () => {
      invalidateChitFunds(queryClient);
      toast.success('Chit fund added');
      onSuccess?.();
    },
    onError: (e) => toast.error('Could not add chit fund', getApiErrorMessage(e)),
  });
};

export const useRecordChitPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RecordChitPaymentPayload }) =>
      chitFundApi.recordPayment(id, payload),
    onSuccess: () => {
      invalidateChitFunds(queryClient);
      toast.success('Monthly payment recorded');
    },
    onError: (e) => toast.error('Could not record payment', getApiErrorMessage(e)),
  });
};

export const useRemoveChitFund = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chitFundApi.remove(id),
    onSuccess: () => {
      invalidateChitFunds(queryClient);
      toast.success('Chit fund deleted');
    },
    onError: (e) => toast.error('Could not delete chit fund', getApiErrorMessage(e)),
  });
};
