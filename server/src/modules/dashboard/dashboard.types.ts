import type { PaymentStatus } from '@prisma/client';
import type { BudgetStatus } from '../budget/budget.types';

/**
 * The kinds of obligation the upcoming-payments feed merges. Each maps to its own
 * table; the dashboard is the only place they are read side by side.
 */
export const OBLIGATION_KINDS = ['EMI', 'BILL', 'RENT', 'SCHOOL_FEE'] as const;
export type ObligationKind = (typeof OBLIGATION_KINDS)[number];

/** How far ahead `/upcoming` looks by default — one billing cycle. */
export const DEFAULT_UPCOMING_DAYS = 30;
export const MAX_UPCOMING_DAYS = 365;

/** Categories shown individually in the spending split before the tail folds into "Other". */
export const CATEGORY_SPLIT_LIMIT = 6;

export const DEFAULT_TOP_LIMIT = 5;
export const MAX_TOP_LIMIT = 20;

// ── Queries ─────────────────────────────────────────────────────────────────

/** One calendar month. The dashboard always leads with a month, never a year. */
export interface DashboardPeriodQuery {
  month: number;
  year: number;
}

export interface UpcomingQuery {
  days: number;
}

export interface TopExpensesQuery extends DashboardPeriodQuery {
  limit: number;
}

/** Charts span the whole of `year` for the trend, and just `month` for the split. */
export type ChartsQuery = DashboardPeriodQuery;

// ── Shared shapes ───────────────────────────────────────────────────────────

export interface PeriodDto {
  month: number;
  year: number;
  from: Date;
  to: Date;
}

/**
 * A total against the same-length window before it. `changePercent` is `null`
 * when the previous window was zero — growth from nothing has no percentage, and
 * the UI hides the badge rather than printing `Infinity%`.
 */
export interface ComparedTotalDto {
  total: number;
  count: number;
  previousTotal: number;
  changePercent: number | null;
}

// ── /summary ────────────────────────────────────────────────────────────────

export interface BudgetSnapshotDto {
  /** Sum of the per-category limits set for the month. */
  budgeted: number;
  spent: number;
  /** Negative once the month's spending has passed the plan. */
  remaining: number;
  percentUsed: number;
  status: BudgetStatus;
  overspentCount: number;
  /** Spending in categories nobody budgeted — the honesty check on the number above. */
  unbudgetedSpent: number;
}

export interface DashboardSummaryDto {
  period: PeriodDto;
  income: ComparedTotalDto;
  expense: ComparedTotalDto;
  /**
   * What the month actually kept. Negative when the family spent more than it
   * earned, which is the single most important thing this page can say.
   */
  net: {
    total: number;
    previousTotal: number;
    changePercent: number | null;
    /** Share of income kept, 0–100. `null` when there was no income to keep. */
    savingsRate: number | null;
  };
  /** `null` until the family sets its first budget for the month. */
  budget: BudgetSnapshotDto | null;
  /** A teaser for `/upcoming`, so the card can be rendered without a second call. */
  obligations: {
    windowDays: number;
    count: number;
    total: number;
    overdueCount: number;
    overdueTotal: number;
  };
}

// ── /upcoming ───────────────────────────────────────────────────────────────

export interface UpcomingPaymentDto {
  /** The source row's id — unique within its `kind`, not across kinds. */
  id: string;
  kind: ObligationKind;
  label: string;
  /** Lender, provider, landlord or school — whoever is owed. */
  detail: string | null;
  amount: number;
  dueDate: Date;
  /** Negative once the date has passed. */
  daysUntilDue: number;
  isOverdue: boolean;
  status: PaymentStatus;
  /**
   * `true` when the row is derived from an EMI's schedule rather than recorded as
   * a payment of its own. A projection is a reminder, not a debt on the books —
   * the EMI module (Phase 7) turns these into real `EMIPayment` rows.
   */
  isProjected: boolean;
}

export interface UpcomingPaymentsDto {
  window: { from: Date; to: Date; days: number };
  items: UpcomingPaymentDto[];
  totals: {
    count: number;
    due: number;
    overdueCount: number;
    overdueTotal: number;
    /** Per-kind totals, so the card can say "3 bills, 1 EMI" without regrouping. */
    byKind: { kind: ObligationKind; count: number; total: number }[];
  };
}

// ── /charts ─────────────────────────────────────────────────────────────────

export interface CashFlowPointDto {
  month: number;
  /** "Jan", "Feb" … — the axis tick, so the client needs no month table. */
  label: string;
  income: number;
  expense: number;
  net: number;
  /** Marks the month the period sits in, for emphasis on the trend. */
  isCurrent: boolean;
}

export interface CategorySliceDto {
  /** `'other'` on the folded tail, `'uncategorised'` on expenses with no category. */
  key: string;
  label: string;
  color: string | null;
  total: number;
  percentage: number;
}

export interface DashboardChartsDto {
  period: PeriodDto;
  /** All twelve months of `period.year`, zeros included, so the axis never shifts. */
  cashFlow: CashFlowPointDto[];
  /** The period's spending, top categories first, tail folded into "Other". */
  categorySplit: CategorySliceDto[];
  totals: { income: number; expense: number; net: number };
}

// ── /top-expenses ───────────────────────────────────────────────────────────

export interface TopCategoryDto {
  key: string;
  label: string;
  color: string | null;
  icon: string | null;
  total: number;
  count: number;
  percentage: number;
}

export interface LargestExpenseDto {
  id: string;
  description: string;
  amount: number;
  date: Date;
  categoryName: string | null;
}

export interface TopExpensesDto {
  period: PeriodDto;
  /** Ranked categories — the plan's "top 5 expense categories". */
  categories: TopCategoryDto[];
  /** The biggest single entries, which is usually the actionable detail. */
  largest: LargestExpenseDto[];
  total: number;
}

// ── /family-contribution ────────────────────────────────────────────────────

export interface MemberContributionDto {
  memberId: string;
  name: string;
  avatar: string | null;
  isActive: boolean;
  income: number;
  expense: number;
  net: number;
  /** Share of the family's income / spending for the period, 0–100. */
  incomeShare: number;
  expenseShare: number;
}

export interface FamilyContributionDto {
  period: PeriodDto;
  members: MemberContributionDto[];
  totals: { income: number; expense: number };
}
