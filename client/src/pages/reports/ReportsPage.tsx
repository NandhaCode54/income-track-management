import { useState } from 'react';
import { Download, FileSpreadsheet, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import {
  useCategoryWise,
  useExportReport,
  useExportReportExcel,
  useMemberWise,
  useMonthlyReport,
  useYearlyReport,
} from '@/features/reports/reports.hooks';
import { ROLE_LABELS } from '@/types/report.types';
import { cn } from '@/lib/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const money = (value: number): string =>
  `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

type View = 'monthly' | 'yearly';

const StatCard = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone?: string;
}) => (
  <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
    <div className={cn('rounded-lg p-2', tone ?? 'bg-primary/10 text-primary')}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  </div>
);

const CashFlowBars = ({ months }: { months: { month: number; label: string; income: number; expense: number; net: number }[] }) => {
  const max = Math.max(...months.map((point) => Math.max(point.income, point.expense)), 1);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {months.map((point) => (
        <div key={point.month} className="rounded-lg border border-border/60 p-2">
          <p className="mb-1.5 flex items-center justify-between text-xs font-medium">
            {point.label}
            <span
              className={cn(
                'text-[11px]',
                point.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
              )}
            >
              {money(point.net)}
            </span>
          </p>
          <div className="space-y-1">
            <div className="h-1.5 rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${(point.income / max) * 100}%` }} />
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${(point.expense / max) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * The reports screen: pick a month or the whole year, read the P&L with its
 * category and member tables, then download either as PDF or Excel. Aggregation
 * happens server-side — every query keys on (view, month/year), so changing the
 * period refetches rather than filters.
 */
const ReportsPage = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [view, setView] = useState<View>('monthly');

  const range = view === 'monthly' ? { month, year } : { year };

  const monthlyQuery = useMonthlyReport(month, year);
  // The yearly view composes three reads: totals + cash flow, then the same two
  // breakdowns as the monthly view, just over twelve months.
  const yearlyQuery = useYearlyReport(year);
  const categoryQuery = useCategoryWise(view === 'yearly' ? { year } : { month, year });
  const memberQuery = useMemberWise(view === 'yearly' ? { year } : { month, year });

  const exportPdf = useExportReport();
  const exportExcel = useExportReportExcel();

  const totals =
    view === 'monthly' ? monthlyQuery.data?.totals : yearlyQuery.data?.totals;
  const categories =
    view === 'monthly'
      ? (monthlyQuery.data?.byCategory ?? [])
      : (categoryQuery.data ?? []);
  const members =
    view === 'monthly' ? (monthlyQuery.data?.byMember ?? []) : (memberQuery.data ?? []);

  const isLoading =
    view === 'monthly' ? monthlyQuery.isLoading : yearlyQuery.isLoading || categoryQuery.isLoading;

  const years = Array.from({ length: 5 }, (_, index) => now.getUTCFullYear() - 4 + index);
  const periodLabel = view === 'monthly' ? `${MONTHS[month - 1]} ${year}` : String(year);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Profit &amp; loss for this workspace.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportPdf.mutate({ scope: view, range })}
            disabled={exportPdf.isPending || isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            PDF
          </button>
          <button
            onClick={() => exportExcel.mutate({ scope: view, range })}
            disabled={exportExcel.isPending || isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {(['monthly', 'yearly'] as View[]).map((value) => (
            <button
              key={value}
              onClick={() => setView(value)}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors',
                view === value ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
              )}
            >
              {value}
            </button>
          ))}
        </div>

        {view === 'monthly' && (
          <select
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            aria-label="Month"
          >
            {MONTHS.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
        )}

        <select
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          aria-label="Year"
        >
          {years.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <p className="py-12 text-center text-sm text-muted-foreground">Building report…</p>
      )}

      {!isLoading && !totals && (
        <EmptyState
          icon={Wallet}
          title="No data for this period"
          description="Try a different month or year."
        />
      )}

      {!isLoading && totals && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={TrendingUp} label="Income" value={money(totals.income)} tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
            <StatCard icon={TrendingDown} label="Expenses" value={money(totals.expense)} tone="bg-destructive/10 text-destructive" />
            <StatCard
              icon={Wallet}
              label="Net"
              value={money(totals.net)}
              tone={totals.net >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}
            />
          </div>

          {view === 'yearly' && yearlyQuery.data && (
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Cash flow by month</h2>
              <CashFlowBars months={yearlyQuery.data.months} />
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">
                Spending by category — {periodLabel}
              </h2>
              {categories.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No expenses recorded this period.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {categories.map((row) => (
                      <tr key={row.categoryId ?? 'uncategorised'} className="border-b border-border/60 last:border-b-0">
                        <td className="px-4 py-2.5">{row.label}</td>
                        <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                          {row.count} entries · {row.percentage}%
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">{money(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">
                By member — {periodLabel}
              </h2>
              {members.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No member activity this period.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {members.map((row) => (
                      <tr key={row.memberId} className="border-b border-border/60 last:border-b-0">
                        <td className="px-4 py-2.5">
                          {row.name}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {ROLE_LABELS[row.role] ?? row.role}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {row.percentage}% of spending
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                          {money(row.income)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-destructive">
                          {money(row.expense)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
