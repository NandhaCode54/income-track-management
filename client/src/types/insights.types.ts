export type AnomalyKind = 'CATEGORY_SPIKE' | 'UNUSUAL_EXPENSE' | 'INCOME_DROP';
export type AnomalySeverity = 'info' | 'warning';
export type BudgetAction = 'create' | 'raise' | 'ok';

export interface CategoryMover {
  categoryId: string | null;
  label: string;
  currentTotal: number;
  previousTotal: number;
  changePct: number;
}

export interface SavingsRatePoint {
  month: number;
  year: number;
  label: string;
  rate: number;
}

export interface SpendingPatterns {
  avgDailySpend: number;
  previousAvgDailySpend: number | null;
  weekdaySharePct: number;
  topMovers: CategoryMover[];
  savingsRateTrend: SavingsRatePoint[];
}

export interface BudgetRecommendation {
  categoryId: string;
  label: string;
  suggestedMonthly: number;
  basisMonths: number;
  currentMonthSpend: number;
  existingBudget: number | null;
  action: BudgetAction;
}

export interface InsightAnomaly {
  kind: AnomalyKind;
  severity: AnomalySeverity;
  title: string;
  detail: string;
}

export interface Insights {
  period: { month: number; year: number };
  patterns: SpendingPatterns;
  budgetRecommendations: BudgetRecommendation[];
  anomalies: InsightAnomaly[];
}
