import { useQuery } from '@tanstack/react-query';
import { QK } from '@/constants/queryKeys';
import { insightsApi } from '@/services/insight.service';
import type { DashboardPeriod } from '@/types/dashboard.types';

/**
 * Insights recompute server-side per period, so the key carries the period —
 * switching months on the dashboard refetches rather than shows stale advice.
 */
export const useInsights = (period: DashboardPeriod) =>
  useQuery({
    queryKey: [...QK.INSIGHTS, period],
    queryFn: () => insightsApi.get(period),
  });
