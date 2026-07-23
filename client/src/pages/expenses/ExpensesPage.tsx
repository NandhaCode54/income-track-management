import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, Loader2, Plus, Receipt, Tags, Upload } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import Pagination from '@/components/common/Pagination';
import PeriodSelector from '@/components/common/PeriodSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { useDebounce } from '@/hooks/useDebounce';
import { usePermission } from '@/hooks/usePermission';
import { getApiErrorMessage } from '@/lib/api-error';
import CategoryManagerDialog from '@/features/expenses/CategoryManagerDialog';
import ExpenseBreakdownSection from '@/features/expenses/ExpenseBreakdown';
import ExpenseFiltersBar, { hasActiveFilters } from '@/features/expenses/ExpenseFilters';
import ExpenseFormDialog from '@/features/expenses/ExpenseFormDialog';
import ExpenseStats from '@/features/expenses/ExpenseStats';
import ExpenseTable from '@/features/expenses/ExpenseTable';
import ImportExpensesDialog from '@/features/expenses/ImportExpensesDialog';
import ReceiptsDialog from '@/features/expenses/ReceiptsDialog';
import {
  useExpenseList,
  useExpenseSummary,
  useExportExpenses,
} from '@/features/expenses/expense.hooks';
import type { Expense, ExpenseFilters, ExpenseSummaryParams } from '@/types/expense.types';

const DEFAULT_FILTERS: ExpenseFilters = {
  page: 1,
  perPage: 20,
  sortBy: 'date',
  sortOrder: 'desc',
};

const ExpensesPage = () => {
  const { can } = usePermission();
  const { format } = useCurrency();

  const [filters, setFilters] = useState<ExpenseFilters>(DEFAULT_FILTERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState<ExpenseSummaryParams>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [receiptTargetId, setReceiptTargetId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchTerm);

  const activeFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch.trim() || undefined }),
    [filters, debouncedSearch],
  );

  // A new search term must restart paging, or page 4 of the old result set is requested.
  useEffect(() => {
    setFilters((current) => (current.page === 1 ? current : { ...current, page: 1 }));
  }, [debouncedSearch]);

  const listQuery = useExpenseList(activeFilters);
  const summaryQuery = useExpenseSummary(period);
  const exportExpenses = useExportExpenses();

  const expenses = listQuery.data?.items ?? [];

  // Resolved from the live list rather than held in state, so an upload or a
  // delete is reflected in the open dialog without it having to be reopened.
  const receiptTarget = expenses.find((expense) => expense.id === receiptTargetId) ?? null;

  const applyFilters = (patch: Partial<ExpenseFilters>) =>
    setFilters((current) => ({ ...current, ...patch, page: 1 }));

  const resetFilters = () => {
    setSearchTerm('');
    setFilters(DEFAULT_FILTERS);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setFormOpen(true);
  };

  const isFiltered = hasActiveFilters(activeFilters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Everything the family spends, categorised and searchable."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodSelector value={period} onChange={setPeriod} />
            <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
              <Tags className="h-4 w-4" />
              Categories
            </Button>
            {can('FINANCE_WRITE') && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add expense
              </Button>
            )}
          </div>
        }
      />

      <ExpenseStats summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />

      <ExpenseBreakdownSection
        byCategory={summaryQuery.data?.byCategory ?? []}
        byMember={summaryQuery.data?.byMember ?? []}
        byPaymentMethod={summaryQuery.data?.byPaymentMethod ?? []}
        topExpenses={summaryQuery.data?.topExpenses ?? []}
      />

      <ExpenseFiltersBar
        filters={activeFilters}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onChange={applyFilters}
        onReset={resetFilters}
      />

      <Card>
        <CardContent className="p-0">
          {listQuery.isLoading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : listQuery.isError ? (
            <EmptyState
              icon={AlertCircle}
              title="Couldn't load expenses"
              description={getApiErrorMessage(listQuery.error)}
            />
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={isFiltered ? 'No matching expenses' : 'No expenses recorded yet'}
              description={
                isFiltered
                  ? 'Try widening the date range or clearing a filter.'
                  : 'Add your first entry, or import a statement you already have.'
              }
              action={
                isFiltered ? (
                  <Button variant="outline" onClick={resetFilters}>
                    Clear filters
                  </Button>
                ) : can('FINANCE_WRITE') ? (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button onClick={openCreate}>
                      <Plus className="h-4 w-4" />
                      Add expense
                    </Button>
                    <Button variant="outline" onClick={() => setImportOpen(true)}>
                      <Upload className="h-4 w-4" />
                      Import CSV
                    </Button>
                  </div>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* Totals the whole filtered set, not just the rows on this page. */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  {listQuery.data?.meta.total ?? 0} matching{' '}
                  {listQuery.data?.meta.total === 1 ? 'expense' : 'expenses'}
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium">
                    Total{' '}
                    <span className="text-rose-600 dark:text-rose-400">
                      {format(listQuery.data?.filteredTotal ?? 0)}
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={exportExpenses.isPending}
                      onClick={() => exportExpenses.mutate(activeFilters)}
                    >
                      {exportExpenses.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Export
                    </Button>
                    {can('FINANCE_WRITE') && (
                      <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)}>
                        <Upload className="h-4 w-4" />
                        Import
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <ExpenseTable
                expenses={expenses}
                onEdit={openEdit}
                onManageReceipts={(expense) => setReceiptTargetId(expense.id)}
              />

              {listQuery.data && (
                <Pagination
                  meta={listQuery.data.meta}
                  label="expenses"
                  onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ExpenseFormDialog open={formOpen} onOpenChange={setFormOpen} expense={editing} />
      <CategoryManagerDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />
      <ImportExpensesDialog open={importOpen} onOpenChange={setImportOpen} />
      <ReceiptsDialog
        open={!!receiptTarget}
        onOpenChange={(open) => !open && setReceiptTargetId(null)}
        expense={receiptTarget}
      />
    </div>
  );
};

export default ExpensesPage;
