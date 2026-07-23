import { api } from './api';
import { unwrap, type ApiEnvelope } from '@/types/api.types';
import type {
  CategoryPayload,
  Expense,
  ExpenseCategory,
  ExpenseFilters,
  ExpenseListResult,
  ExpensePayload,
  ExpenseSummary,
  ExpenseSummaryParams,
  ImportResult,
  Receipt,
} from '@/types/expense.types';

/** Axios serialises `undefined` away, so only the filters actually set are sent. */
const toParams = (filters: Partial<ExpenseFilters>): Record<string, unknown> => ({
  page: filters.page,
  perPage: filters.perPage,
  sortBy: filters.sortBy,
  sortOrder: filters.sortOrder,
  categoryId: filters.categoryId,
  memberId: filters.memberId,
  paymentMethod: filters.paymentMethod,
  tag: filters.tag || undefined,
  from: filters.from,
  to: filters.to,
  minAmount: filters.minAmount,
  maxAmount: filters.maxAmount,
  search: filters.search || undefined,
  isRecurring: filters.isRecurring,
  uncategorized: filters.uncategorized,
});

export const expenseApi = {
  async list(filters: ExpenseFilters): Promise<ExpenseListResult> {
    const { data } = await api.get<ApiEnvelope<{ expenses: Expense[]; filteredTotal: number }>>(
      '/expenses',
      { params: toParams(filters) },
    );
    const payload = unwrap(data);
    return {
      items: payload.expenses,
      filteredTotal: payload.filteredTotal,
      meta: data.meta ?? {
        total: payload.expenses.length,
        page: filters.page,
        perPage: filters.perPage,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };
  },

  async getById(id: string): Promise<Expense> {
    const { data } = await api.get<ApiEnvelope<{ expense: Expense }>>(`/expenses/${id}`);
    return unwrap(data).expense;
  },

  async create(payload: ExpensePayload): Promise<Expense> {
    const { data } = await api.post<ApiEnvelope<{ expense: Expense }>>('/expenses', payload);
    return unwrap(data).expense;
  },

  async update(id: string, payload: Partial<ExpensePayload>): Promise<Expense> {
    const { data } = await api.patch<ApiEnvelope<{ expense: Expense }>>(
      `/expenses/${id}`,
      payload,
    );
    return unwrap(data).expense;
  },

  async remove(id: string): Promise<string> {
    const { data } = await api.delete<ApiEnvelope<never>>(`/expenses/${id}`);
    return data.message;
  },

  async summary(params: ExpenseSummaryParams): Promise<ExpenseSummary> {
    const { data } = await api.get<ApiEnvelope<{ summary: ExpenseSummary }>>('/expenses/summary', {
      params,
    });
    return unwrap(data).summary;
  },

  async listRecurring(): Promise<Expense[]> {
    const { data } = await api.get<ApiEnvelope<{ expenses: Expense[] }>>('/expenses/recurring');
    return unwrap(data).expenses;
  },

  // ── Categories ──────────────────────────────────────────────────────────────

  async listCategories(): Promise<ExpenseCategory[]> {
    const { data } = await api.get<ApiEnvelope<{ categories: ExpenseCategory[] }>>(
      '/expenses/categories',
    );
    return unwrap(data).categories;
  },

  async createCategory(payload: CategoryPayload): Promise<ExpenseCategory> {
    const { data } = await api.post<ApiEnvelope<{ category: ExpenseCategory }>>(
      '/expenses/categories',
      payload,
    );
    return unwrap(data).category;
  },

  async updateCategory(id: string, payload: Partial<CategoryPayload>): Promise<ExpenseCategory> {
    const { data } = await api.patch<ApiEnvelope<{ category: ExpenseCategory }>>(
      `/expenses/categories/${id}`,
      payload,
    );
    return unwrap(data).category;
  },

  async removeCategory(id: string): Promise<string> {
    const { data } = await api.delete<ApiEnvelope<{ uncategorisedCount: number }>>(
      `/expenses/categories/${id}`,
    );
    // The server's message names how many expenses were left uncategorised.
    return data.message;
  },

  // ── Receipts ────────────────────────────────────────────────────────────────

  async uploadReceipt(expenseId: string, file: File): Promise<Receipt> {
    const form = new FormData();
    form.append('receipt', file);

    // Axios strips the instance's JSON content-type for FormData so the browser
    // can set `multipart/form-data` with the boundary multer needs.
    const { data } = await api.post<ApiEnvelope<{ receipt: Receipt }>>(
      `/expenses/${expenseId}/receipt`,
      form,
    );
    return unwrap(data).receipt;
  },

  async removeReceipt(expenseId: string, receiptId: string): Promise<string> {
    const { data } = await api.delete<ApiEnvelope<never>>(
      `/expenses/${expenseId}/receipts/${receiptId}`,
    );
    return data.message;
  },

  // ── CSV ─────────────────────────────────────────────────────────────────────

  async importCsv(file: File, createMissingCategories: boolean): Promise<ImportResult> {
    const form = new FormData();
    form.append('file', file);
    form.append('createMissingCategories', String(createMissingCategories));

    const { data } = await api.post<ApiEnvelope<{ result: ImportResult }>>(
      '/expenses/import',
      form,
    );
    return unwrap(data).result;
  },

  /**
   * Downloads the current filter selection as a file. The response is a CSV
   * body, not the usual envelope, so it is handed to the browser directly.
   */
  async exportCsv(filters: Partial<ExpenseFilters>): Promise<{ blob: Blob; fileName: string }> {
    const response = await api.get('/expenses/export', {
      params: toParams({ ...filters, page: undefined, perPage: undefined }),
      responseType: 'blob',
    });

    const disposition = String(response.headers['content-disposition'] ?? '');
    const match = /filename="?([^";]+)"?/.exec(disposition);

    return {
      blob: response.data as Blob,
      fileName: match?.[1] ?? 'expenses.csv',
    };
  },
};
