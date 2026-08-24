import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useAuthStore } from '@/store/auth.store';
import { getApiErrorMessage } from '@/lib/api-error';
import { MONTH_NAMES } from '@/utils/formatDate';
import BudgetSnapshotCard from '@/features/dashboard/BudgetSnapshotCard';
import CashFlowChart from '@/features/dashboard/CashFlowChart';
import DashboardStats from '@/features/dashboard/DashboardStats';
import InsightsPanel from '@/features/dashboard/InsightsPanel';
import MemberContributions from '@/features/dashboard/MemberContributions';
import SpendingByCategory from '@/features/dashboard/SpendingByCategory';
import TopExpensesCard from '@/features/dashboard/TopExpensesCard';
import UpcomingPaymentsCard from '@/features/dashboard/UpcomingPaymentsCard';
import { UPCOMING_WINDOW_DAYS } from '@/features/dashboard/dashboard.constants';
import {
  useDashboardCharts,
  useDashboardSummary,
  useFamilyContribution,
  useTopExpenses,
  useUpcomingPayments,
} from '@/features/dashboard/dashboard.hooks';
import type { DashboardPeriod } from '@/types/dashboard.types';

const years = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - index);

/**
 * One control row above everything it scopes, never a filter per card — every
 * period-scoped card on the page re-renders against the same month.
 */
const MonthPicker = ({
  value,
  onChange,
}: {
  value: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
}) => (
  <div className="flex items-center gap-2">
    <Select
      className="h-9 w-36"
      aria-label="Dashboard month"
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
      aria-label="Dashboard year"
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

const DashboardPage = () => {
  const firstName = useAuthStore((state) => state.user?.firstName);

  const [period, setPeriod] = useState<DashboardPeriod>(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });

  const summary = useDashboardSummary(period);
  const charts = useDashboardCharts(period);
  const upcoming = useUpcomingPayments(UPCOMING_WINDOW_DAYS);
  const top = useTopExpenses(period);
  const contribution = useFamilyContribution(period);

  const periodLabel = `${MONTH_NAMES[period.month - 1]} ${period.year}`;

  // The summary is the page's spine: if it cannot load, the rest is noise.
  if (summary.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="This month at a glance." />
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={AlertCircle}
              title="Couldn't load the dashboard"
              description={getApiErrorMessage(summary.error)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : 'Dashboard'}
        description={`How ${periodLabel} is going for the family.`}
        actions={<MonthPicker value={period} onChange={setPeriod} />}
      />

      <DashboardStats
        summary={summary.data}
        // `isFetching` alone would blank the tiles on every background refetch;
        // the data on screen while a month loads is the previous month's, which the
        // cards below dim rather than replace.
        isLoading={summary.isPending}
        periodLabel={periodLabel}
      />

      <CashFlowChart
        points={charts.data?.cashFlow ?? []}
        year={period.year}
        month={period.month}
        isStale={charts.isFetching}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SpendingByCategory
          slices={charts.data?.categorySplit ?? []}
          periodLabel={periodLabel}
          isStale={charts.isFetching}
        />
        <UpcomingPaymentsCard data={upcoming.data} isLoading={upcoming.isPending} />
        <BudgetSnapshotCard
          snapshot={summary.data?.budget ?? null}
          periodLabel={periodLabel}
          isLoading={summary.isPending}
        />
        <TopExpensesCard data={top.data} isLoading={top.isPending} periodLabel={periodLabel} />
      </div>

      <InsightsPanel period={period} />

      <MemberContributions
        data={contribution.data}
        isLoading={contribution.isPending}
        periodLabel={periodLabel}
      />
    </div>
  );
};

export default DashboardPage;
