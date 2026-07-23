import { CalendarClock, Receipt, Repeat, TrendingDown } from 'lucide-react';
import StatCard from '@/components/common/StatCard';
import { useCurrency } from '@/hooks/useCurrency';
import { MONTH_NAMES } from '@/utils/formatDate';
import type { ExpenseSummary } from '@/types/expense.types';

interface ExpenseStatsProps {
  summary?: ExpenseSummary;
  isLoading: boolean;
}

const periodLabel = (summary: ExpenseSummary): string =>
  summary.period.month
    ? `${MONTH_NAMES[summary.period.month - 1]} ${summary.period.year}`
    : `${summary.period.year}`;

const ExpenseStats = ({ summary, isLoading }: ExpenseStatsProps) => {
  const { format } = useCurrency();

  if (isLoading || !summary) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[104px] animate-pulse rounded-xl border bg-muted/40" />
        ))}
      </div>
    );
  }

  const comparison = summary.period.month ? 'vs last month' : 'vs last year';
  const topCategory = summary.byCategory[0];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Total spent"
        value={format(summary.total)}
        subtitle={periodLabel(summary)}
        icon={TrendingDown}
        variant="expense"
        // Growth from a zero baseline has no meaningful percentage — the API sends null.
        trend={
          summary.changePercent === null
            ? undefined
            : { value: summary.changePercent, label: comparison }
        }
      />
      <StatCard
        title="Entries"
        value={String(summary.count)}
        subtitle={summary.count === 1 ? '1 record' : `${summary.count} records`}
        icon={Receipt}
      />
      <StatCard
        title="Average entry"
        value={format(summary.average)}
        subtitle={`Largest ${format(summary.highest)}`}
        icon={CalendarClock}
      />
      <StatCard
        title="Biggest category"
        value={topCategory ? format(topCategory.total) : format(0)}
        subtitle={
          topCategory ? `${topCategory.label} · ${topCategory.percentage}%` : 'Nothing spent yet'
        }
        icon={Repeat}
        variant="savings"
      />
    </div>
  );
};

export default ExpenseStats;
