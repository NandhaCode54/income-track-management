import { insightsRepository } from './insights.repository';
import type {
  AnomalyDto,
  BudgetAction,
  BudgetRecommendationDto,
  CategoryMoverDto,
  InsightsPeriodQuery,
  InsightsDto,
  SavingsRatePointDto,
  SpendingPatternsDto,
} from './insights.types';
import { INSIGHT_WINDOW_MONTHS } from './insights.types';

/**
 * "AI Insights" without an LLM: every card is a small, explainable statistic
 * over the family's own ledgers — ratios, medians, deviations. That is a
 * deliberate trade: an LLM could phrase things more charmingly, but these
 * numbers must be reproducible and cheap enough to compute on every dashboard
 * load, and a wrong-but-confident generated sentence about someone's money is
 * worse than a plain one that is always true.
 *
 * All heuristics share one window: the queried month plus
 * `INSIGHT_WINDOW_MONTHS` full months before it, read once and bucketed in
 * memory — a few thousand rows is well within reason for a family workspace.
 */

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** Below this a category is noise, not behaviour — flagging ₹12 spikes is how insights get muted. */
const MIN_CATEGORY_TOTAL = 500;
const MOVER_CHANGE_PCT = 20;
const SPIKE_MULTIPLIER = 2;
const INCOME_DROP_RATIO = 0.7;
const RAISE_BUDGET_RATIO = 1.2;
const MAX_MOVERS = 5;
const MAX_RECOMMENDATIONS = 8;

type ExpenseRow = Awaited<ReturnType<typeof insightsRepository.expensesInWindow>>[number];
type IncomeRow = Awaited<ReturnType<typeof insightsRepository.incomesInWindow>>[number];

interface Bucket {
  year: number;
  month: number;
  key: string;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

const money = (value: number): string =>
  `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const bucketOf = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

/** The queried month plus the N full months before it, oldest first. */
const windowBuckets = (query: InsightsPeriodQuery): Bucket[] => {
  const buckets: Bucket[] = [];
  let year = query.year;
  let month = query.month;

  for (let index = 0; index <= INSIGHT_WINDOW_MONTHS; index += 1) {
    buckets.unshift({ year, month, key: `${year}-${String(month).padStart(2, '0')}` });
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }

  return buckets;
};

const labelOf = (row: ExpenseRow): string => {
  if (!row.category) return 'Uncategorised';
  return row.category.parent
    ? `${row.category.parent.name} › ${row.category.name}`
    : row.category.name;
};

const sumBy = <T>(rows: T[], value: (row: T) => number): number =>
  rows.reduce((sum, row) => sum + value(row), 0);

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

export const insightsService = {
  async build(familyId: string, query: InsightsPeriodQuery): Promise<InsightsDto> {
    const buckets = windowBuckets(query);
    const first = buckets[0];
    const last = buckets[buckets.length - 1];
    const { from } = insightsRepository.monthBounds(first.month, first.year);
    const { to } = insightsRepository.monthBounds(last.month, last.year);

    const [expenses, incomes, budgetLines] = await Promise.all([
      insightsRepository.expensesInWindow(familyId, from, to),
      insightsRepository.incomesInWindow(familyId, from, to),
      insightsRepository.budgetLinesFor(familyId, query.month, query.year),
    ]);

    // One pass per ledger into per-bucket rows — every heuristic below reads
    // these maps instead of touching the database again.
    const expensesByBucket = new Map<string, ExpenseRow[]>();
    for (const row of expenses) {
      const key = bucketOf(row.date);
      const existing = expensesByBucket.get(key) ?? [];
      existing.push(row);
      expensesByBucket.set(key, existing);
    }

    const incomeByBucket = new Map<string, number>();
    for (const row of incomes) {
      const key = bucketOf(row.date);
      incomeByBucket.set(key, (incomeByBucket.get(key) ?? 0) + Number(row.amount));
    }

    const currentKey = `${query.year}-${String(query.month).padStart(2, '0')}`;
    const currentIndex = buckets.findIndex((bucket) => bucket.key === currentKey);
    const previousBuckets = buckets.slice(0, Math.max(currentIndex, 0));
    const previousKey = currentIndex > 0 ? buckets[currentIndex - 1].key : null;

    const currentExpenses = expensesByBucket.get(currentKey) ?? [];
    const currentTotal = round2(sumBy(currentExpenses, (row) => Number(row.amount)));

    const patterns = buildPatterns(
      buckets,
      currentIndex,
      previousKey,
      expensesByBucket,
      incomeByBucket,
      currentTotal,
      query,
    );
    const budgetRecommendations = buildBudgetRecommendations({
      previousBuckets,
      expensesByBucket,
      currentExpenses,
      budgetLines,
    });
    const anomalies = buildAnomalies({
      currentExpenses,
      currentTotal,
      expensesByBucket,
      previousBuckets,
      incomeByBucket,
      incomeCurrent: round2(incomeByBucket.get(currentKey) ?? 0),
    });

    return { period: { ...query }, patterns, budgetRecommendations, anomalies };
  },
};

// ── Patterns ────────────────────────────────────────────────────────────────

function buildPatterns(
  buckets: Bucket[],
  currentIndex: number,
  previousKey: string | null,
  expensesByBucket: Map<string, ExpenseRow[]>,
  incomeByBucket: Map<string, number>,
  currentTotal: number,
  query: InsightsPeriodQuery,
): SpendingPatternsDto {
  const currentRows = expensesByBucket.get(buckets[currentIndex]?.key ?? '') ?? [];
  const daysInMonth = new Date(Date.UTC(query.year, query.month, 0)).getUTCDate();
  const avgDailySpend = round2(currentTotal / daysInMonth);

  const previousRows = previousKey ? (expensesByBucket.get(previousKey) ?? []) : [];
  const previousTotal = round2(sumBy(previousRows, (row) => Number(row.amount)));
  const previousAvgDailySpend =
    previousKey || previousTotal > 0 ? round2(previousTotal / daysInMonth) : null;

  // Weekday/weekend split over the whole window — habits live in aggregates,
  // not in any single month.
  let weekdayTotal = 0;
  let windowTotal = 0;
  for (const bucket of buckets) {
    for (const row of expensesByBucket.get(bucket.key) ?? []) {
      const amount = Number(row.amount);
      windowTotal += amount;
      const day = row.date.getUTCDay();
      if (day >= 1 && day <= 5) weekdayTotal += amount;
    }
  }
  const weekdaySharePct =
    windowTotal === 0 ? 50 : Math.round((weekdayTotal / windowTotal) * 1000) / 10;

  const topMovers = buildTopMovers(currentRows, previousRows);

  const savingsRateTrend: SavingsRatePointDto[] = buckets.map((bucket) => {
    const spent = sumBy(expensesByBucket.get(bucket.key) ?? [], (row) => Number(row.amount));
    const earned = incomeByBucket.get(bucket.key) ?? 0;
    return {
      month: bucket.month,
      year: bucket.year,
      label: `${MONTH_LABELS[bucket.month - 1]} ${String(bucket.year).slice(2)}`,
      rate: earned <= 0 ? 0 : Math.round(((earned - spent) / earned) * 1000) / 1000,
    };
  });

  return { avgDailySpend, previousAvgDailySpend, weekdaySharePct, topMovers, savingsRateTrend };
}

function buildTopMovers(
  currentRows: ExpenseRow[],
  previousRows: ExpenseRow[],
): CategoryMoverDto[] {
  const group = (rows: ExpenseRow[]): Map<string, { label: string; total: number }> => {
    const grouped = new Map<string, { label: string; total: number }>();
    for (const row of rows) {
      const key = row.categoryId ?? 'uncategorised';
      const entry = grouped.get(key) ?? { label: labelOf(row), total: 0 };
      entry.total += Number(row.amount);
      grouped.set(key, entry);
    }
    return grouped;
  };

  const current = group(currentRows);
  const previous = group(previousRows);

  const movers: CategoryMoverDto[] = [];
  for (const [key, entry] of current) {
    const before = previous.get(key)?.total ?? 0;
    if (before <= 0) continue;
    if (entry.total < MIN_CATEGORY_TOTAL) continue;

    const changePct = Math.round(((entry.total - before) / before) * 1000) / 10;
    if (Math.abs(changePct) >= MOVER_CHANGE_PCT) {
      movers.push({
        categoryId: key === 'uncategorised' ? null : key,
        label: entry.label,
        currentTotal: round2(entry.total),
        previousTotal: round2(before),
        changePct,
      });
    }
  }

  return movers.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, MAX_MOVERS);
}

// ── Budget recommendations ──────────────────────────────────────────────────

function buildBudgetRecommendations({
  previousBuckets,
  expensesByBucket,
  currentExpenses,
  budgetLines,
}: {
  previousBuckets: Bucket[];
  expensesByBucket: Map<string, ExpenseRow[]>;
  currentExpenses: ExpenseRow[];
  budgetLines: { categoryId: string | null; amount: unknown }[];
}): BudgetRecommendationDto[] {
  // The three most recent *full* months are the basis — the queried month may
  // be barely started, and recommending against a half-month would halve every
  // suggestion.
  const basisBuckets = previousBuckets.slice(-3);
  const basisTotals = new Map<string, { perMonth: number[] }>();
  for (const bucket of basisBuckets) {
    const bucketIndex = basisBuckets.indexOf(bucket);
    const seen = new Map<string, number>();
    for (const row of expensesByBucket.get(bucket.key) ?? []) {
      const key = row.categoryId ?? 'uncategorised';
      seen.set(key, (seen.get(key) ?? 0) + Number(row.amount));
    }
    for (const [key, total] of seen) {
      const entry = basisTotals.get(key) ?? {
        perMonth: Array.from({ length: basisBuckets.length }, () => 0),
      };
      entry.perMonth[bucketIndex] += total;
      basisTotals.set(key, entry);
    }
  }

  // Labels come from whichever row mentions the category first.
  const labelFor = (key: string): string => {
    for (const bucket of basisBuckets) {
      const row = (expensesByBucket.get(bucket.key) ?? []).find(
        (candidate) => (candidate.categoryId ?? 'uncategorised') === key,
      );
      if (row) return labelOf(row);
    }
    return 'Uncategorised';
  };

  const currentByKey = new Map<string, number>();
  for (const row of currentExpenses) {
    const key = row.categoryId ?? 'uncategorised';
    currentByKey.set(key, (currentByKey.get(key) ?? 0) + Number(row.amount));
  }

  const existingByKey = new Map<string, number>();
  for (const line of budgetLines) {
    if (line.categoryId !== null) {
      existingByKey.set(line.categoryId, Number(line.amount));
    }
  }

  const recommendations: (BudgetRecommendationDto & { sortKey: number })[] = [];

  for (const [key, entry] of basisTotals) {
    // Uncategorised spend has no category line to attach a budget to — the
    // fix there is categorising expenses, not another budget row.
    if (key === 'uncategorised') continue;

    const activeMonths = entry.perMonth.filter((total) => total > 0).length;
    // Spend in only one of three months is a one-off, not a habit worth a line.
    if (activeMonths < 2) continue;

    const raw = median(entry.perMonth.filter((total) => total > 0));
    const suggestedMonthly = Math.max(100, Math.ceil(raw / 100) * 100);
    const categoryId = key;
    const existingBudget = existingByKey.get(categoryId) ?? null;
    const currentMonthSpend = round2(currentByKey.get(key) ?? 0);

    let action: BudgetAction = 'ok';
    if (existingBudget === null) action = 'create';
    else if (suggestedMonthly > existingBudget * RAISE_BUDGET_RATIO) action = 'raise';

    recommendations.push({
      categoryId,
      label: labelFor(key),
      suggestedMonthly,
      basisMonths: activeMonths,
      currentMonthSpend,
      existingBudget,
      action,
      sortKey: action === 'create' ? 2 : action === 'raise' ? 1 : 0,
    });
  }

  return recommendations
    .filter((recommendation) => recommendation.action !== 'ok')
    .sort(
      (a, b) =>
        b.sortKey - a.sortKey ||
        b.suggestedMonthly - a.suggestedMonthly,
    )
    .slice(0, MAX_RECOMMENDATIONS)
    .map(({ sortKey: _sortKey, ...recommendation }) => recommendation);
}

// ── Anomalies ───────────────────────────────────────────────────────────────

function buildAnomalies({
  currentExpenses,
  currentTotal,
  expensesByBucket,
  previousBuckets,
  incomeByBucket,
  incomeCurrent,
}: {
  currentExpenses: ExpenseRow[];
  currentTotal: number;
  expensesByBucket: Map<string, ExpenseRow[]>;
  previousBuckets: Bucket[];
  incomeByBucket: Map<string, number>;
  incomeCurrent: number;
}): AnomalyDto[] {
  const anomalies: AnomalyDto[] = [];

  // 1. A category spending far above its recent baseline.
  if (currentTotal > 0 && previousBuckets.length >= 2) {
    const currentByKey = new Map<string, { label: string; total: number }>();
    for (const row of currentExpenses) {
      const key = row.categoryId ?? 'uncategorised';
      const entry = currentByKey.get(key) ?? { label: labelOf(row), total: 0 };
      entry.total += Number(row.amount);
      currentByKey.set(key, entry);
    }

    const baselineByKey = new Map<string, { total: number; months: number }>();
    for (const bucket of previousBuckets) {
      const seen = new Map<string, number>();
      for (const row of expensesByBucket.get(bucket.key) ?? []) {
        const key = row.categoryId ?? 'uncategorised';
        seen.set(key, (seen.get(key) ?? 0) + Number(row.amount));
      }
      for (const [key, total] of seen) {
        const entry = baselineByKey.get(key) ?? { total: 0, months: 0 };
        entry.total += total;
        if (total > 0) entry.months += 1;
        baselineByKey.set(key, entry);
      }
    }

    for (const [key, entry] of currentByKey) {
      const baseline = baselineByKey.get(key);
      if (!baseline || baseline.months < 2 || entry.total < MIN_CATEGORY_TOTAL) continue;

      const average = baseline.total / baseline.months;
      if (average <= 0) continue;

      const multiplier = entry.total / average;
      if (multiplier >= SPIKE_MULTIPLIER) {
        anomalies.push({
          kind: 'CATEGORY_SPIKE',
          severity: 'warning',
          title: `${entry.label} is running ${multiplier.toFixed(1)}× its usual pace`,
          detail: `${money(round2(entry.total))} so far versus a ${money(round2(average))} monthly average.`,
        });
      }
    }
  }

  // 2. Single purchases far outside the family's usual size.
  const allAmounts: number[] = [];
  for (const rows of expensesByBucket.values()) {
    for (const row of rows) allAmounts.push(Number(row.amount));
  }
  if (allAmounts.length >= 8) {
    const mean = allAmounts.reduce((sum, value) => sum + value, 0) / allAmounts.length;
    const variance =
      allAmounts.reduce((sum, value) => sum + (value - mean) ** 2, 0) / allAmounts.length;
    const stdDev = Math.sqrt(variance);
    const threshold = mean + 2 * stdDev;

    const outliers = currentExpenses
      .filter((row) => Number(row.amount) >= threshold && Number(row.amount) >= 1000)
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 3);

    for (const row of outliers) {
      anomalies.push({
        kind: 'UNUSUAL_EXPENSE',
        severity: 'info',
        title: `Large expense: ${labelOf(row)}`,
        detail: `${money(round2(Number(row.amount)))} on ${row.date.toISOString().slice(0, 10)} — well above the usual ${money(round2(mean))}.`,
      });
    }
  }

  // 3. Income well under its recent level.
  if (previousBuckets.length >= 2) {
    const priorIncomes = previousBuckets
      .map((bucket) => incomeByBucket.get(bucket.key) ?? 0)
      .filter((value) => value > 0);
    if (priorIncomes.length >= 1) {
      const averageIncome = priorIncomes.reduce((sum, value) => sum + value, 0) / priorIncomes.length;
      if (averageIncome > 0 && incomeCurrent <= averageIncome * INCOME_DROP_RATIO) {
        anomalies.push({
          kind: 'INCOME_DROP',
          severity: 'info',
          title: 'Income is below its recent level',
          detail: `${money(incomeCurrent)} received against a ${money(round2(averageIncome))} recent average.`,
        });
      }
    }
  }

  const severityRank = { warning: 0, info: 1 } as const;
  return anomalies.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}
