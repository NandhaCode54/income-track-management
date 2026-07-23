export const BUDGET_STATUSES = ['ON_TRACK', 'WARNING', 'OVER'] as const;
export type BudgetStatus = (typeof BUDGET_STATUSES)[number];

/**
 * Share of a budget that counts as "getting close". Above this the line turns
 * amber and a `BUDGET_WARNING` notification fires; past 100% it turns red and
 * `BUDGET_EXCEEDED` fires.
 */
export const BUDGET_WARNING_THRESHOLD = 75;

/**
 * These two live here, with the threshold they depend on, rather than in the
 * service — both the service and `budget.alert` need them, and putting them in
 * the service would close an import cycle between the two.
 */
export const statusFor = (percentUsed: number): BudgetStatus => {
  if (percentUsed > 100) return 'OVER';
  return percentUsed >= BUDGET_WARNING_THRESHOLD ? 'WARNING' : 'ON_TRACK';
};

/** A budget of zero is already spent the moment anything is charged to it. */
export const percentUsedOf = (spent: number, budgeted: number): number => {
  if (budgeted > 0) return Math.round((spent / budgeted) * 1000) / 10;
  return spent > 0 ? Infinity : 0;
};

// ── Inputs ──────────────────────────────────────────────────────────────────

export interface CreateBudgetInput {
  amount: number;
  month: number;
  year: number;
  /** Omitted for the family-wide cap covering every category. */
  categoryId?: string;
}

/**
 * Only the amount is editable. Moving a budget to another category or month is
 * really "delete this one and create that one" — allowing it here would mean
 * re-running the duplicate check for a case nobody actually asks for.
 */
export interface UpdateBudgetInput {
  amount: number;
}

export interface BudgetPeriodQuery {
  month: number;
  year: number;
}

export interface CopyBudgetsInput {
  fromMonth: number;
  fromYear: number;
  toMonth: number;
  toYear: number;
  /** Replace amounts already set in the target month instead of skipping them. */
  overwrite: boolean;
}

// ── DTOs ────────────────────────────────────────────────────────────────────

export interface BudgetCategoryRefDto {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  parentName: string | null;
}

export interface BudgetDto {
  id: string;
  amount: number;
  month: number;
  year: number;
  /** `null` on the family-wide budget. */
  category: BudgetCategoryRefDto | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetLineDto {
  budgetId: string;
  categoryId: string | null;
  label: string;
  icon: string | null;
  color: string | null;
  budgeted: number;
  spent: number;
  /** Negative once the line is overspent — the UI shows the overshoot. */
  remaining: number;
  /** 0–∞, rounded to 1 decimal. Not capped at 100. */
  percentUsed: number;
  status: BudgetStatus;
}

export interface UnbudgetedLineDto {
  /** `null` is the bucket for expenses with no category at all. */
  categoryId: string | null;
  label: string;
  icon: string | null;
  color: string | null;
  spent: number;
}

export interface BudgetVsActualDto {
  period: { month: number; year: number; from: Date; to: Date };
  /** The family-wide line, present only when an overall budget is set. */
  overall: BudgetLineDto | null;
  categories: BudgetLineDto[];
  /** Categories that were spent against but never budgeted. */
  unbudgeted: UnbudgetedLineDto[];
  totals: {
    /** Sum of the per-category budgets. Excludes the family-wide cap. */
    categoryBudgeted: number;
    /**
     * Every expense in the period. Deliberately *not* the sum of the lines
     * above: budgeting both a parent and its child would count the child twice.
     */
    spent: number;
    unbudgetedSpent: number;
    overspentCount: number;
  };
}

export interface CopyBudgetsResultDto {
  copied: number;
  skipped: number;
  overwritten: number;
}
