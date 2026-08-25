import { useState } from 'react';
import { AlertCircle, Copy, Loader2, PiggyBank, Plus, Target, TrendingDown, Wallet } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatCard from '@/components/common/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useCurrency } from '@/hooks/useCurrency';
import { usePermission } from '@/hooks/usePermission';
import { getApiErrorMessage } from '@/lib/api-error';
import { MONTH_NAMES } from '@/utils/formatDate';
import BudgetFormDialog from '@/features/budget/BudgetFormDialog';
import BudgetLines from '@/features/budget/BudgetLines';
import BudgetProgress from '@/features/budget/BudgetProgress';
import CopyBudgetsDialog from '@/features/budget/CopyBudgetsDialog';
import UnbudgetedPanel from '@/features/budget/UnbudgetedPanel';
import { useBudgetVsActual } from '@/features/budget/budget.hooks';
import type { BudgetLine, BudgetPeriod } from '@/types/budget.types';

const years = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - index);

/** A budget is set for one month at a time, so the page is always month-scoped. */
const MonthPicker = ({
  value,
  onChange,
}: {
  value: BudgetPeriod;
  onChange: (period: BudgetPeriod) => void;
}) => (
  <div className="flex items-center gap-2">
    <Select
      className="h-9 w-36"
      aria-label="Budget month"
      value={value.month}
      onChange={(event) => onChange({ ...value, month: Number(event.target.value) })}
    >
      {MONTH_NAMES.map((name, index) => (
        <option key={name} value={index + 1}>
          {name}
        </option>
      ))}
    </Select>
    <Select
      className="h-9 w-28"
      aria-label="Budget year"
      value={value.year}
      onChange={(event) => onChange({ ...value, year: Number(event.target.value) })}
    >
      {years.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </Select>
  </div>
);

const BudgetPage = () => {
  const { can } = usePermission();
  const { format } = useCurrency();

  const [period, setPeriod] = useState<BudgetPeriod>(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetLine | null>(null);
  const [presetCategoryId, setPresetCategoryId] = useState<string | undefined>();
  const [copyOpen, setCopyOpen] = useState(false);

  const query = useBudgetVsActual(period);
  const comparison = query.data;

  const canManage = can('BUDGET_MANAGE');
  const periodLabel = `${MONTH_NAMES[period.month - 1]} ${period.year}`;

  const openCreate = (categoryId?: string) => {
    setEditing(null);
    setPresetCategoryId(categoryId);
    setFormOpen(true);
  };

  const openEdit = (line: BudgetLine) => {
    setEditing(line);
    setPresetCategoryId(undefined);
    setFormOpen(true);
  };

  const lines = comparison?.categories ?? [];
  const takenCategoryIds = lines
    .map((line) => line.categoryId)
    .filter((id): id is string => id !== null);

  const hasAnything = !!comparison && (lines.length > 0 || comparison.overall !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget"
        description="Set a limit per category, then watch the month against it."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker value={period} onChange={setPeriod} />
            {canManage && (
              <>
                <Button variant="outline" onClick={() => setCopyOpen(true)}>
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <Button onClick={() => openCreate()}>
                  <Plus className="h-4 w-4" />
                  Set budget
                </Button>
              </>
            )}
          </div>
        }
      />

      {query.isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : query.isError ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={AlertCircle}
              title="Couldn't load budgets"
              description={getApiErrorMessage(query.error)}
              action={<Button variant="outline" onClick={() => query.refetch()}>Try again</Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Budgeted"
              value={format(comparison?.totals.categoryBudgeted ?? 0)}
              subtitle={`${lines.length} ${lines.length === 1 ? 'category' : 'categories'} · ${periodLabel}`}
              icon={Target}
            />
            <StatCard
              title="Spent"
              value={format(comparison?.totals.spent ?? 0)}
              subtitle="Every expense this month"
              icon={TrendingDown}
              variant="expense"
            />
            <StatCard
              title="Left to spend"
              value={format(
                Math.max((comparison?.totals.categoryBudgeted ?? 0) - (comparison?.totals.spent ?? 0), 0),
              )}
              subtitle={
                (comparison?.totals.spent ?? 0) > (comparison?.totals.categoryBudgeted ?? 0)
                  ? 'Budget exceeded'
                  : 'Against budgeted categories'
              }
              icon={PiggyBank}
              variant="savings"
            />
            <StatCard
              title="Over budget"
              value={String(comparison?.totals.overspentCount ?? 0)}
              subtitle={
                comparison?.totals.overspentCount === 1
                  ? '1 category over its limit'
                  : `${comparison?.totals.overspentCount ?? 0} categories over their limit`
              }
              icon={Wallet}
              variant={comparison?.totals.overspentCount ? 'expense' : 'default'}
            />
          </div>

          {comparison?.overall && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Family-wide budget</CardTitle>
                <CardDescription>
                  A single cap across everything spent in {periodLabel}, whatever the category.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <BudgetProgress
                  budgeted={comparison.overall.budgeted}
                  spent={comparison.overall.spent}
                  percentUsed={comparison.overall.percentUsed}
                  status={comparison.overall.status}
                  size="lg"
                />
                {canManage && (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(comparison.overall as BudgetLine)}
                    >
                      Adjust the cap
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              {lines.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title={hasAnything ? 'No category budgets yet' : `Nothing budgeted for ${periodLabel}`}
                  description={
                    canManage
                      ? 'Set a limit on the categories you want to keep an eye on, or copy last month.'
                      : 'A family head can set the limits for this month.'
                  }
                  action={
                    canManage ? (
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button onClick={() => openCreate()}>
                          <Plus className="h-4 w-4" />
                          Set budget
                        </Button>
                        <Button variant="outline" onClick={() => setCopyOpen(true)}>
                          <Copy className="h-4 w-4" />
                          Copy a month
                        </Button>
                      </div>
                    ) : undefined
                  }
                />
              ) : (
                <BudgetLines lines={lines} onEdit={openEdit} />
              )}
            </CardContent>
          </Card>

          <UnbudgetedPanel
            lines={comparison?.unbudgeted ?? []}
            total={comparison?.totals.unbudgetedSpent ?? 0}
            onSetBudget={openCreate}
          />
        </>
      )}

      <BudgetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        period={period}
        line={editing}
        takenCategoryIds={takenCategoryIds}
        hasOverall={!!comparison?.overall}
        defaultCategoryId={presetCategoryId}
      />
      <CopyBudgetsDialog open={copyOpen} onOpenChange={setCopyOpen} target={period} />
    </div>
  );
};

export default BudgetPage;
