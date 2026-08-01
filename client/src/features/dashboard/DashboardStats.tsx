import { CalendarClock, PiggyBank, TrendingDown, TrendingUp } from 'lucide-react';
import StatCard from '@/components/common/StatCard';
import { useCurrency } from '@/hooks/useCurrency';
import type { DashboardSummary } from '@/types/dashboard.types';

interface DashboardStatsProps {
  summary?: DashboardSummary;
  isLoading: boolean;
  periodLabel: string;
}

/**
 * The four numbers the month comes down to. These are **stat tiles, not charts** —
 * a single current value with a delta is exactly what a tile is for, and a one-bar
 * chart would say the same thing with more ink.
 */
const DashboardStats = ({ summary, isLoading, periodLabel }: DashboardStatsProps) => {
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

  const { income, expense, net, obligations } = summary;
  const overspent = net.total < 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Income"
        value={format(income.total)}
        subtitle={`${income.count} ${income.count === 1 ? 'entry' : 'entries'} · ${periodLabel}`}
        icon={TrendingUp}
        variant="income"
        // Growth from a zero baseline has no meaningful percentage — the API sends null.
        trend={
          income.changePercent === null
            ? undefined
            : { value: income.changePercent, label: 'vs last month' }
        }
      />
      <StatCard
        title="Expenses"
        value={format(expense.total)}
        subtitle={`${expense.count} ${expense.count === 1 ? 'entry' : 'entries'} · ${periodLabel}`}
        icon={TrendingDown}
        variant="expense"
        trend={
          expense.changePercent === null
            ? undefined
            : { value: expense.changePercent, label: 'vs last month', upIsGood: false }
        }
      />
      <StatCard
        // The headline changes with the sign, so the label never has to be read
        // together with a minus sign to make sense of the figure.
        title={overspent ? 'Overspent' : 'Kept this month'}
        value={format(Math.abs(net.total))}
        subtitle={
          net.savingsRate === null
            ? 'No income recorded yet'
            : `${net.savingsRate}% of income ${overspent ? 'over' : 'saved'}`
        }
        icon={PiggyBank}
        variant={overspent ? 'expense' : 'savings'}
      />
      <StatCard
        title="Due soon"
        value={format(obligations.total)}
        subtitle={
          obligations.overdueCount > 0
            ? `${obligations.overdueCount} overdue · ${format(obligations.overdueTotal)}`
            : `${obligations.count} ${obligations.count === 1 ? 'payment' : 'payments'} in ${obligations.windowDays} days`
        }
        icon={CalendarClock}
        variant={obligations.overdueCount > 0 ? 'expense' : 'default'}
      />
    </div>
  );
};

export default DashboardStats;
