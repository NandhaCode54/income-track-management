import { CalendarClock, Coins, Repeat, Wallet } from 'lucide-react';
import StatCard from '@/components/common/StatCard';
import { useCurrency } from '@/hooks/useCurrency';
import { MONTH_NAMES } from '@/utils/formatDate';
import type { IncomeSummary } from '@/types/income.types';

interface IncomeStatsProps {
  summary?: IncomeSummary;
  isLoading: boolean;
}

const periodLabel = (summary: IncomeSummary): string =>
  summary.period.month
    ? `${MONTH_NAMES[summary.period.month - 1]} ${summary.period.year}`
    : `${summary.period.year}`;

const IncomeStats = ({ summary, isLoading }: IncomeStatsProps) => {
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

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Total income"
        value={format(summary.total)}
        subtitle={periodLabel(summary)}
        icon={Wallet}
        variant="income"
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
        icon={Coins}
      />
      <StatCard
        title="Average entry"
        value={format(summary.average)}
        subtitle={`Largest ${format(summary.highest)}`}
        icon={CalendarClock}
      />
      <StatCard
        title="Recurring"
        value={format(summary.recurringTotal)}
        subtitle={
          summary.total === 0
            ? 'No income yet'
            : `${Math.round((summary.recurringTotal / summary.total) * 100)}% of the period`
        }
        icon={Repeat}
        variant="savings"
      />
    </div>
  );
};

export default IncomeStats;
