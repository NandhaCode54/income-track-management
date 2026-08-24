export interface InsightsPeriodQuery {
  month: number;
  year: number;
}

/** How many full months before the queried month feed the baselines. */
export const INSIGHT_WINDOW_MONTHS = 6;

export type AnomalyKind = 'CATEGORY_SPIKE' | 'UNUSUAL_EXPENSE' | 'INCOME_DROP';
export type AnomalySeverity = 'info' | 'warning';

export interface AnomalyDto {
  kind: AnomalyKind;
  severity: AnomalySeverity;
  title: string;
  detail: string;
}

export interface CategoryMoverDto {
  categoryId: string | null;
  label: string;
  currentTotal: number;
  previousTotal: number;
  /** Signed percent vs the previous month; the UI renders the direction. */
  changePct: number;
}

export interface SavingsRatePointDto {
  month: number;
  year: number;
  label: string;
  /** (income − expense) / income, 0 when there was no income to divide by. */
  rate: number;
}

export interface SpendingPatternsDto {
  avgDailySpend: number;
  previousAvgDailySpend: number | null;
  /** Share of window spend that landed Monday–Friday, as a percentage. */
  weekdaySharePct: number;
  topMovers: CategoryMoverDto[];
  savingsRateTrend: SavingsRatePointDto[];
}

export type BudgetAction = 'create' | 'raise' | 'ok';

export interface BudgetRecommendationDto {
  categoryId: string;
  label: string;
  suggestedMonthly: number;
  basisMonths: number;
  currentMonthSpend: number;
  existingBudget: number | null;
  action: BudgetAction;
}

export interface InsightsDto {
  period: { month: number; year: number };
  patterns: SpendingPatternsDto;
  budgetRecommendations: BudgetRecommendationDto[];
  anomalies: AnomalyDto[];
}
