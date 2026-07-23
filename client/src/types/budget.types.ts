export const BUDGET_STATUSES = ['ON_TRACK', 'WARNING', 'OVER'] as const;
export type BudgetStatus = (typeof BUDGET_STATUSES)[number];

/** Mirrors the server's threshold — the point a line turns amber. */
export const BUDGET_WARNING_THRESHOLD = 75;

export interface BudgetCategoryRef {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  parentName: string | null;
}

export interface Budget {
  id: string;
  amount: number;
  month: number;
  year: number;
  /** `null` on the family-wide budget. */
  category: BudgetCategoryRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetLine {
  budgetId: string;
  categoryId: string | null;
  label: string;
  icon: string | null;
  color: string | null;
  budgeted: number;
  spent: number;
  /** Negative once overspent. */
  remaining: number;
  percentUsed: number;
  status: BudgetStatus;
}

export interface UnbudgetedLine {
  categoryId: string | null;
  label: string;
  icon: string | null;
  color: string | null;
  spent: number;
}

export interface BudgetVsActual {
  period: { month: number; year: number; from: string; to: string };
  overall: BudgetLine | null;
  categories: BudgetLine[];
  unbudgeted: UnbudgetedLine[];
  totals: {
    categoryBudgeted: number;
    spent: number;
    unbudgetedSpent: number;
    overspentCount: number;
  };
}

export interface BudgetPeriod {
  month: number;
  year: number;
}

export interface BudgetPayload {
  amount: number;
  month: number;
  year: number;
  categoryId?: string;
}

export interface CopyBudgetsPayload {
  fromMonth: number;
  fromYear: number;
  toMonth: number;
  toYear: number;
  overwrite: boolean;
}

export interface CopyBudgetsResult {
  copied: number;
  skipped: number;
  overwritten: number;
}
