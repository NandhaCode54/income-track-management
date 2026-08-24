import { api } from './api';
import { unwrap, type ApiEnvelope } from '@/types/api.types';
import type { Insights } from '@/types/insights.types';
import type { DashboardPeriod } from '@/types/dashboard.types';

export const insightsApi = {
  async get(period: DashboardPeriod): Promise<Insights> {
    const { data } = await api.get<ApiEnvelope<Insights>>('/insights', {
      params: { month: period.month, year: period.year },
    });
    return unwrap(data);
  },
};
