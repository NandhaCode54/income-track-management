import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QK } from '@/constants/queryKeys';
import {
  portfolioApi,
  type PortfolioPayload,
} from '@/services/portfolio.service';
import type { PortfolioKind } from '@/types/portfolio.types';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';

const KIND_KEY: Record<PortfolioKind, readonly string[]> = {
  investment: QK.INVESTMENTS,
  asset: QK.ASSETS,
  liability: QK.LIABILITIES,
};

/**
 * Portfolio writes refresh every ledger plus the dashboard prefix: the
 * ledgers feed each other through the net-worth figure, and the dashboard
 * reads across all of them.
 */
const invalidatePortfolio = (
  queryClient: ReturnType<typeof useQueryClient>,
  kind: PortfolioKind,
) => {
  void queryClient.invalidateQueries({ queryKey: KIND_KEY[kind] });
  void queryClient.invalidateQueries({ queryKey: QK.PORTFOLIO_NET_WORTH });
  void queryClient.invalidateQueries({ queryKey: QK.DASHBOARD });
};

const listKeyOf = (kind: PortfolioKind) => KIND_KEY[kind];

export const usePortfolioList = (kind: PortfolioKind) =>
  useQuery({ queryKey: listKeyOf(kind), queryFn: () => portfolioApi.list(kind) });

interface PortfolioMutationOptions {
  onSuccess?: () => void;
}

export const useCreatePortfolioItem = (
  kind: PortfolioKind,
  { onSuccess }: PortfolioMutationOptions = {},
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PortfolioPayload) => portfolioApi.create(kind, payload),
    onSuccess: () => {
      invalidatePortfolio(queryClient, kind);
      toast.success('Added');
      onSuccess?.();
    },
    onError: (e) => toast.error('Could not save', getApiErrorMessage(e)),
  });
};

export const useUpdatePortfolioItem = (
  kind: PortfolioKind,
  { onSuccess }: PortfolioMutationOptions = {},
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PortfolioPayload> }) =>
      portfolioApi.update(kind, id, payload),
    onSuccess: () => {
      invalidatePortfolio(queryClient, kind);
      toast.success('Updated');
      onSuccess?.();
    },
    onError: (e) => toast.error('Could not update', getApiErrorMessage(e)),
  });
};

export const useRemovePortfolioItem = (kind: PortfolioKind) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => portfolioApi.remove(kind, id),
    onSuccess: () => {
      invalidatePortfolio(queryClient, kind);
      toast.success('Deleted');
    },
    onError: (e) => toast.error('Could not delete', getApiErrorMessage(e)),
  });
};

export const useNetWorth = (enabled: boolean) =>
  useQuery({
    queryKey: QK.PORTFOLIO_NET_WORTH,
    queryFn: () => portfolioApi.netWorth(),
    enabled,
  });
