import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Plus, Wallet } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import Pagination from '@/components/common/Pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { useDebounce } from '@/hooks/useDebounce';
import { usePermission } from '@/hooks/usePermission';
import { getApiErrorMessage } from '@/lib/api-error';
import IncomeBreakdownSection from '@/features/income/IncomeBreakdown';
import IncomeFiltersBar from '@/features/income/IncomeFilters';
import IncomeFormDialog from '@/features/income/IncomeFormDialog';
import IncomeStats from '@/features/income/IncomeStats';
import IncomeTable from '@/features/income/IncomeTable';
import PeriodSelector from '@/features/income/PeriodSelector';
import RecurringIncomePanel from '@/features/income/RecurringIncomePanel';
import { useIncomeList, useIncomeSummary } from '@/features/income/income.hooks';
import type { Income, IncomeFilters, IncomeSummaryParams } from '@/types/income.types';

const DEFAULT_FILTERS: IncomeFilters = {
  page: 1,
  perPage: 20,
  sortBy: 'date',
  sortOrder: 'desc',
};

const IncomePage = () => {
  const { can } = usePermission();
  const { format } = useCurrency();

  const [filters, setFilters] = useState<IncomeFilters>(DEFAULT_FILTERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState<IncomeSummaryParams>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);

  const debouncedSearch = useDebounce(searchTerm);

  const activeFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch.trim() || undefined }),
    [filters, debouncedSearch],
  );

  // A new search term must restart paging, or page 4 of the old result set is requested.
  useEffect(() => {
    setFilters((current) => (current.page === 1 ? current : { ...current, page: 1 }));
  }, [debouncedSearch]);

  const listQuery = useIncomeList(activeFilters);
  const summaryQuery = useIncomeSummary(period);

  const applyFilters = (patch: Partial<IncomeFilters>) =>
    setFilters((current) => ({ ...current, ...patch, page: 1 }));

  const resetFilters = () => {
    setSearchTerm('');
    setFilters(DEFAULT_FILTERS);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (entry: Income) => {
    setEditing(entry);
    setFormOpen(true);
  };

  const income = listQuery.data?.items ?? [];
  const isFiltered = !!(
    activeFilters.search ||
    activeFilters.type ||
    activeFilters.memberId ||
    activeFilters.from ||
    activeFilters.to ||
    activeFilters.isRecurring !== undefined
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income"
        description="Everything coming into the family, and where it came from."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodSelector value={period} onChange={setPeriod} />
            {can('FINANCE_WRITE') && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add income
              </Button>
            )}
          </div>
        }
      />

      <IncomeStats summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />

      <IncomeBreakdownSection
        byType={summaryQuery.data?.byType ?? []}
        byMember={summaryQuery.data?.byMember ?? []}
      />

      <RecurringIncomePanel />

      <IncomeFiltersBar
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
              title="Couldn't load income"
              description={getApiErrorMessage(listQuery.error)}
            />
          ) : income.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title={isFiltered ? 'No matching income' : 'No income recorded yet'}
              description={
                isFiltered
                  ? 'Try widening the date range or clearing a filter.'
                  : 'Add your first entry to start tracking what the family earns.'
              }
              action={
                isFiltered ? (
                  <Button variant="outline" onClick={resetFilters}>
                    Clear filters
                  </Button>
                ) : can('FINANCE_WRITE') ? (
                  <Button onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Add income
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* Totals the whole filtered set, not just the rows on this page. */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  {listQuery.data?.meta.total ?? 0} matching{' '}
                  {listQuery.data?.meta.total === 1 ? 'entry' : 'entries'}
                </span>
                <span className="font-medium">
                  Total{' '}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {format(listQuery.data?.filteredTotal ?? 0)}
                  </span>
                </span>
              </div>

              <IncomeTable income={income} onEdit={openEdit} />

              {listQuery.data && (
                <Pagination
                  meta={listQuery.data.meta}
                  label="entries"
                  onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <IncomeFormDialog open={formOpen} onOpenChange={setFormOpen} income={editing} />
    </div>
  );
};

export default IncomePage;
