import { AlertTriangle, ArrowDownRight, ArrowUpRight, Info, PiggyBank, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInsights } from '@/features/insights/insights.hooks';
import type { BudgetRecommendation, Insights } from '@/types/insights.types';
import { cn } from '@/lib/utils';

const money = (value: number): string =>
  `₹${Math.round(value).toLocaleString('en-IN')}`;

const ACTION_COPY: Record<BudgetRecommendation['action'], string> = {
  create: 'No budget set yet — consider one',
  raise: 'Budget may be too tight — consider raising it',
  ok: 'On track',
};

const RecommendationRow = ({ recommendation }: { recommendation: BudgetRecommendation }) => (
  <div className="flex items-start justify-between gap-3 py-2.5">
    <div className="min-w-0">
      <p className="truncate text-sm font-medium">{recommendation.label}</p>
      <p className="text-xs text-muted-foreground">
        Based on {recommendation.basisMonths} of the last 3 months · spent{' '}
        {money(recommendation.currentMonthSpend)} so far
      </p>
    </div>
    <div className="shrink-0 text-right">
      <p className="text-sm font-semibold tabular-nums">{money(recommendation.suggestedMonthly)}/mo</p>
      <p
        className={cn(
          'text-xs',
          recommendation.action === 'ok' && 'text-muted-foreground',
          recommendation.action === 'create' && 'text-primary',
          recommendation.action === 'raise' && 'text-amber-600 dark:text-amber-400',
        )}
      >
        {ACTION_COPY[recommendation.action]}
      </p>
    </div>
  </div>
);

/**
 * The dashboard's insight cards. Everything shown is a deterministic statistic
 * over the family's own ledgers for the selected period — no black box: every
 * line carries its own basis ("versus a ₹X average", "based on N months").
 */
const InsightsPanel = ({ period }: { period: { month: number; year: number } }) => {
  const query = useInsights(period);
  const insights: Insights | undefined = query.data;

  if (query.isPending || query.isError || !insights) return null;

  const hasAnomalies = insights.anomalies.length > 0;
  const hasRecommendations = insights.budgetRecommendations.length > 0;
  const hasPatterns =
    insights.patterns.avgDailySpend > 0 ||
    insights.patterns.topMovers.length > 0;

  // Nothing to say happens with fresh workspaces; an empty card would just be
  // chrome, so the whole panel stays out of the way.
  if (!hasAnomalies && !hasRecommendations && !hasPatterns) return null;

  const savingsTrend = insights.patterns.savingsRateTrend.slice(-6);
  const maxRate = Math.max(...savingsTrend.map((point) => Math.abs(point.rate)), 0.01);

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        {hasAnomalies && (
          <section className="space-y-2.5">
            {insights.anomalies.map((anomaly) => (
              <div key={`${anomaly.kind}-${anomaly.title}`} className="flex items-start gap-3">
                {anomaly.severity === 'warning' ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                ) : (
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">{anomaly.title}</p>
                  <p className="text-xs text-muted-foreground">{anomaly.detail}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        {hasPatterns && (
          <section className="grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg daily spend</p>
              <p className="text-lg font-semibold tabular-nums">{money(insights.patterns.avgDailySpend)}</p>
              {insights.patterns.previousAvgDailySpend !== null &&
                insights.patterns.previousAvgDailySpend > 0 && (
                  <p
                    className={cn(
                      'inline-flex items-center gap-1 text-xs',
                      insights.patterns.avgDailySpend > insights.patterns.previousAvgDailySpend
                        ? 'text-destructive'
                        : 'text-emerald-600 dark:text-emerald-400',
                    )}
                  >
                    {insights.patterns.avgDailySpend >
                    insights.patterns.previousAvgDailySpend ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    vs {money(insights.patterns.previousAvgDailySpend)} last month
                  </p>
                )}
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Weekday spending</p>
              <p className="text-lg font-semibold tabular-nums">{insights.patterns.weekdaySharePct}%</p>
              <p className="text-xs text-muted-foreground">of the window's expenses</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Savings rate</p>
              <div className="mt-1 flex h-8 items-end gap-1" aria-label="Savings rate trend">
                {savingsTrend.map((point) => (
                  <div
                    key={point.label}
                    title={`${point.label}: ${(point.rate * 100).toFixed(0)}%`}
                    className={cn(
                      'w-full rounded-t',
                      point.rate >= 0
                        ? 'bg-emerald-500/70'
                        : 'bg-destructive/70',
                    )}
                    style={{ height: `${Math.max(Math.abs(point.rate / maxRate) * 100, 6)}%` }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{savingsTrend[0]?.label} → {savingsTrend[savingsTrend.length - 1]?.label}</p>
            </div>
          </section>
        )}

        {insights.patterns.topMovers.length > 0 && (
          <section className="border-t border-border pt-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              Biggest movers vs last month
            </p>
            <div className="flex flex-wrap gap-2">
              {insights.patterns.topMovers.map((mover) => (
                <span
                  key={mover.categoryId ?? 'uncategorised'}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs"
                >
                  {mover.label}
                  <span
                    className={cn(
                      'inline-flex items-center font-medium',
                      mover.changePct > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400',
                    )}
                  >
                    {mover.changePct > 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(mover.changePct)}%
                  </span>
                </span>
              ))}
            </div>
          </section>
        )}

        {hasRecommendations && (
          <section className="border-t border-border pt-4">
            <p className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              <PiggyBank className="h-3.5 w-3.5" />
              Budget suggestions for next month
            </p>
            <div className="divide-y divide-border/60">
              {insights.budgetRecommendations.map((recommendation) => (
                <RecommendationRow key={recommendation.categoryId} recommendation={recommendation} />
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
};

export default InsightsPanel;
