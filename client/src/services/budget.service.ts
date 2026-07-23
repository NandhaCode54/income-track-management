import { api } from './api';
import { unwrap, type ApiEnvelope } from '@/types/api.types';
import type {
  Budget,
  BudgetPayload,
  BudgetPeriod,
  BudgetVsActual,
  CopyBudgetsPayload,
  CopyBudgetsResult,
} from '@/types/budget.types';

export const budgetApi = {
  async list(period: BudgetPeriod): Promise<Budget[]> {
    const { data } = await api.get<ApiEnvelope<{ budgets: Budget[] }>>('/budgets', {
      params: period,
    });
    return unwrap(data).budgets;
  },

  async vsActual(period: BudgetPeriod): Promise<BudgetVsActual> {
    const { data } = await api.get<ApiEnvelope<{ comparison: BudgetVsActual }>>(
      '/budgets/vs-actual',
      { params: period },
    );
    return unwrap(data).comparison;
  },

  async create(payload: BudgetPayload): Promise<Budget> {
    const { data } = await api.post<ApiEnvelope<{ budget: Budget }>>('/budgets', payload);
    return unwrap(data).budget;
  },

  async update(id: string, amount: number): Promise<Budget> {
    const { data } = await api.patch<ApiEnvelope<{ budget: Budget }>>(`/budgets/${id}`, {
      amount,
    });
    return unwrap(data).budget;
  },

  async remove(id: string): Promise<string> {
    const { data } = await api.delete<ApiEnvelope<never>>(`/budgets/${id}`);
    return data.message;
  },

  /** Returns the server's message as well — "copied 8, skipped 3" is the outcome. */
  async copy(
    payload: CopyBudgetsPayload,
  ): Promise<{ result: CopyBudgetsResult; message: string }> {
    const { data } = await api.post<ApiEnvelope<{ result: CopyBudgetsResult }>>(
      '/budgets/copy',
      payload,
    );
    return { result: unwrap(data).result, message: data.message };
  },
};
