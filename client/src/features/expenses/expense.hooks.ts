import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { expenseApi } from '@/services/expense.service';
import { QK } from '@/constants/queryKeys';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import type {
  CategoryPayload,
  ExpenseCategory,
  ExpenseFilters,
  ExpensePayload,
  ExpenseSummaryParams,
} from '@/types/expense.types';

// ── Queries ───────────────────────────────────────────────────────────────────

/** `keepPreviousData` stops the table flashing empty while a page or filter changes. */
export const useExpenseList = (filters: ExpenseFilters) =>
  useQuery({
    queryKey: QK.EXPENSE_LIST(filters),
    queryFn: () => expenseApi.list(filters),
    placeholderData: keepPreviousData,
  });

export const useExpenseSummary = (params: ExpenseSummaryParams) =>
  useQuery({
    queryKey: QK.EXPENSE_SUMMARY(params),
    queryFn: () => expenseApi.summary(params),
    placeholderData: keepPreviousData,
  });

export const useExpenseCategories = () =>
  useQuery({ queryKey: QK.EXPENSE_CATEGORIES, queryFn: expenseApi.listCategories });

/** Parents and children in one flat list, for pickers that cannot render a tree. */
export const flattenCategories = (
  categories: ExpenseCategory[],
): { id: string; label: string; color: string | null; icon: string | null }[] =>
  categories.flatMap((category) => [
    { id: category.id, label: category.name, color: category.color, icon: category.icon },
    ...category.children.map((child) => ({
      id: child.id,
      label: `${category.name} › ${child.name}`,
      color: child.color ?? category.color,
      icon: child.icon ?? category.icon,
    })),
  ]);

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Every expense write shifts totals, the category counts and the dashboard, so
 * each one invalidates the whole `['expenses']` prefix rather than a hand-picked
 * subset. Categories live under that prefix too, which is what an import needs.
 */
const useExpenseMutation = <TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  options: { successTitle: string; errorTitle: string },
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.EXPENSES });
      queryClient.invalidateQueries({ queryKey: QK.DASHBOARD_SUMMARY });
      queryClient.invalidateQueries({ queryKey: QK.BUDGET_VS_ACTUAL });
      toast.success(options.successTitle);
    },
    onError: (error) => toast.error(options.errorTitle, getApiErrorMessage(error)),
  });
};

export const useCreateExpense = () =>
  useExpenseMutation((payload: ExpensePayload) => expenseApi.create(payload), {
    successTitle: 'Expense added',
    errorTitle: 'Could not add expense',
  });

export const useUpdateExpense = () =>
  useExpenseMutation(
    (args: { id: string; payload: Partial<ExpensePayload> }) =>
      expenseApi.update(args.id, args.payload),
    { successTitle: 'Expense updated', errorTitle: 'Could not update expense' },
  );

export const useDeleteExpense = () =>
  useExpenseMutation((id: string) => expenseApi.remove(id), {
    successTitle: 'Expense deleted',
    errorTitle: 'Could not delete expense',
  });

export const useCreateCategory = () =>
  useExpenseMutation((payload: CategoryPayload) => expenseApi.createCategory(payload), {
    successTitle: 'Category created',
    errorTitle: 'Could not create category',
  });

export const useUpdateCategory = () =>
  useExpenseMutation(
    (args: { id: string; payload: Partial<CategoryPayload> }) =>
      expenseApi.updateCategory(args.id, args.payload),
    { successTitle: 'Category updated', errorTitle: 'Could not update category' },
  );

/** The server's message says how many expenses were left uncategorised. */
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => expenseApi.removeCategory(id),
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: QK.EXPENSES });
      queryClient.invalidateQueries({ queryKey: QK.DASHBOARD_SUMMARY });
      toast.success('Category deleted', message);
    },
    onError: (error) => toast.error('Could not delete category', getApiErrorMessage(error)),
  });
};

export const useUploadReceipt = () =>
  useExpenseMutation(
    (args: { expenseId: string; file: File }) =>
      expenseApi.uploadReceipt(args.expenseId, args.file),
    { successTitle: 'Receipt uploaded', errorTitle: 'Could not upload receipt' },
  );

export const useDeleteReceipt = () =>
  useExpenseMutation(
    (args: { expenseId: string; receiptId: string }) =>
      expenseApi.removeReceipt(args.expenseId, args.receiptId),
    { successTitle: 'Receipt deleted', errorTitle: 'Could not delete receipt' },
  );

/**
 * Import reports its own outcome — a partial success with row errors is normal,
 * so the caller renders the result rather than a single toast.
 */
export const useImportExpenses = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { file: File; createMissingCategories: boolean }) =>
      expenseApi.importCsv(args.file, args.createMissingCategories),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.EXPENSES });
      queryClient.invalidateQueries({ queryKey: QK.DASHBOARD_SUMMARY });
    },
    onError: (error) => toast.error('Import failed', getApiErrorMessage(error)),
  });
};

/** Streams the filtered set to a file. Nothing is cached — it is a download, not state. */
export const useExportExpenses = () =>
  useMutation({
    mutationFn: (filters: Partial<ExpenseFilters>) => expenseApi.exportCsv(filters),
    onSuccess: ({ blob, fileName }) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      // Revoking immediately would cancel the download in some browsers.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Export ready', `Saved as ${fileName}.`);
    },
    onError: (error) => toast.error('Could not export', getApiErrorMessage(error)),
  });
