import { api } from './api';
import { unwrap, type ApiEnvelope } from '@/types/api.types';
import type {
  DashboardCharts,
  DashboardPeriod,
  DashboardSummary,
  FamilyContribution,
  TopExpenses,
  UpcomingPayments,
} from '@/types/dashboard.types';

export const dashboardApi = {
  async summary(period: DashboardPeriod): Promise<DashboardSummary> {
    const { data } = await api.get<ApiEnvelope<{ summary: DashboardSummary }>>(
      '/dashboard/summary',
      { params: period },
    );
    return unwrap(data).summary;
  },

  /** A forward window in days, not a calendar month — next month's bills count too. */
  async upcoming(days: number): Promise<UpcomingPayments> {
    const { data } = await api.get<ApiEnvelope<{ upcoming: UpcomingPayments }>>(
      '/dashboard/upcoming',
      { params: { days } },
    );
    return unwrap(data).upcoming;
  },

  async charts(period: DashboardPeriod): Promise<DashboardCharts> {
    const { data } = await api.get<ApiEnvelope<{ charts: DashboardCharts }>>('/dashboard/charts', {
      params: period,
    });
    return unwrap(data).charts;
  },

  async topExpenses(period: DashboardPeriod, limit?: number): Promise<TopExpenses> {
    const { data } = await api.get<ApiEnvelope<{ top: TopExpenses }>>('/dashboard/top-expenses', {
      params: { ...period, ...(limit ? { limit } : {}) },
    });
    return unwrap(data).top;
  },

  async familyContribution(period: DashboardPeriod): Promise<FamilyContribution> {
    const { data } = await api.get<ApiEnvelope<{ contribution: FamilyContribution }>>(
      '/dashboard/family-contribution',
      { params: period },
    );
    return unwrap(data).contribution;
  },
};
