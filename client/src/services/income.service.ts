import { api } from './api';
import { unwrap, type ApiEnvelope } from '@/types/api.types';
import type {
  Income,
  IncomeFilters,
  IncomeListResult,
  IncomePayload,
  IncomeSummary,
  IncomeSummaryParams,
} from '@/types/income.types';

/** Axios serialises `undefined` away, so only the filters actually set are sent. */
const toParams = (filters: IncomeFilters): Record<string, unknown> => ({
  page: filters.page,
  perPage: filters.perPage,
  sortBy: filters.sortBy,
  sortOrder: filters.sortOrder,
  type: filters.type,
  memberId: filters.memberId,
  from: filters.from,
  to: filters.to,
  search: filters.search || undefined,
  isRecurring: filters.isRecurring,
});

export const incomeApi = {
  async list(filters: IncomeFilters): Promise<IncomeListResult> {
    const { data } = await api.get<ApiEnvelope<{ income: Income[]; filteredTotal: number }>>(
      '/income',
      { params: toParams(filters) },
    );
    const payload = unwrap(data);
    return {
      items: payload.income,
      filteredTotal: payload.filteredTotal,
      meta: data.meta ?? {
        total: payload.income.length,
        page: filters.page,
        perPage: filters.perPage,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };
  },

  async getById(id: string): Promise<Income> {
    const { data } = await api.get<ApiEnvelope<{ income: Income }>>(`/income/${id}`);
    return unwrap(data).income;
  },

  async create(payload: IncomePayload): Promise<Income> {
    const { data } = await api.post<ApiEnvelope<{ income: Income }>>('/income', payload);
    return unwrap(data).income;
  },

  async update(id: string, payload: Partial<IncomePayload>): Promise<Income> {
    const { data } = await api.patch<ApiEnvelope<{ income: Income }>>(`/income/${id}`, payload);
    return unwrap(data).income;
  },

  async remove(id: string): Promise<string> {
    const { data } = await api.delete<ApiEnvelope<never>>(`/income/${id}`);
    return data.message;
  },

  async summary(params: IncomeSummaryParams): Promise<IncomeSummary> {
    const { data } = await api.get<ApiEnvelope<{ summary: IncomeSummary }>>('/income/summary', {
      params,
    });
    return unwrap(data).summary;
  },

  async listRecurring(): Promise<Income[]> {
    const { data } = await api.get<ApiEnvelope<{ income: Income[] }>>('/income/recurring');
    return unwrap(data).income;
  },
};
