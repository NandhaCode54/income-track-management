import { AlertTriangle, CalendarClock, Landmark, Wallet } from 'lucide-react';
import StatCard from '@/components/common/StatCard';
import { useCurrency } from '@/hooks/useCurrency';
import type { EmiTotals, UpcomingEmis } from '@/types/emi.types';

interface EmiStatsProps {
  totals?: EmiTotals;
  upcoming?: UpcomingEmis;
  windowDays: number;
}

/**
 * The four numbers a household actually asks about its loans: what leaves every
 * month, what is still owed, what is due imminently, and what has been missed.
 *
 * None of these carries a period-over-period trend. A loan book does not move
 * month to month the way spending does — it changes when a loan is taken or
 * closed — so a "+0% vs last month" badge on every tile would be noise dressed
 * up as insight.
 */
const EmiStats = ({ totals, upcoming, windowDays }: EmiStatsProps) => {
  const { format } = useCurrency();

  const activeCount = totals?.activeCount ?? 0;
  const overdueCount = upcoming?.totals.overdueCount ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Monthly outgo"
        value={format(totals?.monthlyOutgo ?? 0)}
        subtitle={`Across ${activeCount} running ${activeCount === 1 ? 'loan' : 'loans'}`}
        icon={Wallet}
        variant="expense"
      />
      <StatCard
        title="Still to repay"
        value={format(totals?.outstanding ?? 0)}
        // Named precisely, because it is not the outstanding principal — it is
        // every unsettled instalment, interest included.
        subtitle="Every instalment not yet settled"
        icon={Landmark}
      />
      <StatCard
        title={`Due in ${windowDays} days`}
        value={format(upcoming?.totals.due ?? 0)}
        subtitle={`${upcoming?.totals.count ?? 0} ${
          upcoming?.totals.count === 1 ? 'instalment' : 'instalments'
        }`}
        icon={CalendarClock}
      />
      <StatCard
        title="Missed"
        value={format(upcoming?.totals.overdueAmount ?? 0)}
        subtitle={
          overdueCount === 1 ? '1 instalment past its date' : `${overdueCount} instalments past their date`
        }
        icon={AlertTriangle}
        variant={overdueCount > 0 ? 'expense' : 'default'}
      />
    </div>
  );
};

export default EmiStats;
