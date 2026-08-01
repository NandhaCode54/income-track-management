import type { BudgetStatus } from './budget.types';

export const OBLIGATION_KINDS = ['EMI', 'BILL', 'RENT', 'SCHOOL_FEE'] as const;
export type ObligationKind = (typeof OBLIGATION_KINDS)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'OVERDUE', 'PARTIAL', 'WAIVED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** One calendar month — the dashboard always leads with a month, never a year. */
export interface DashboardPeriod {
  month: number;
  year: number;
}

export interface PeriodInfo {
  month: number;
  year: number;
  from: string;
  to: string;
}

/** A total against the same-length window before it. `changePercent` is `null` from zero. */
export interface ComparedTotal {
  total: number;
  count: number;
  previousTotal: number;
  changePercent: number | null;
}

export interface BudgetSnapshot {
  budgeted: number;
  spent: number;
  /** Negative once the month's spending has passed the plan. */
  remaining: number;
  percentUsed: number;
  status: BudgetStatus;
  overspentCount: number;
  unbudgetedSpent: number;
}

export interface DashboardSummary {
  period: PeriodInfo;
  income: ComparedTotal;
  expense: ComparedTotal;
  net: {
    total: number;
    previousTotal: number;
    changePercent: number | null;
    /** Share of income kept, 0–100. `null` when there was no income to keep. */
    savingsRate: number | null;
  };
  /** `null` until the family sets its first budget for the month. */
  budget: BudgetSnapshot | null;
  obligations: {
    windowDays: number;
    count: number;
    total: number;
    overdueCount: number;
    overdueTotal: number;
  };
}

export interface UpcomingPayment {
  id: string;
  kind: ObligationKind;
  label: string;
  detail: string | null;
  amount: number;
  dueDate: string;
  /** Negative once the date has passed. */
  daysUntilDue: number;
  isOverdue: boolean;
  status: PaymentStatus;
  /** Derived from an EMI's schedule rather than recorded as a payment of its own. */
  isProjected: boolean;
}

export interface UpcomingPayments {
  window: { from: string; to: string; days: number };
  items: UpcomingPayment[];
  totals: {
    count: number;
    due: number;
    overdueCount: number;
    overdueTotal: number;
    byKind: { kind: ObligationKind; count: number; total: number }[];
  };
}

export interface CashFlowPoint {
  month: number;
  /** "Jan", "Feb" … — the axis tick, so the client needs no month table. */
  label: string;
  income: number;
  expense: number;
  net: number;
  isCurrent: boolean;
}

export interface CategorySlice {
  key: string;
  label: string;
  color: string | null;
  total: number;
  percentage: number;
}

export interface DashboardCharts {
  period: PeriodInfo;
  /** All twelve months of `period.year`, zeros included, so the axis never shifts. */
  cashFlow: CashFlowPoint[];
  categorySplit: CategorySlice[];
  totals: { income: number; expense: number; net: number };
}

export interface TopCategory {
  key: string;
  label: string;
  color: string | null;
  icon: string | null;
  total: number;
  count: number;
  percentage: number;
}

export interface LargestExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryName: string | null;
}

export interface TopExpenses {
  period: PeriodInfo;
  categories: TopCategory[];
  largest: LargestExpense[];
  total: number;
}

export interface MemberContribution {
  memberId: string;
  name: string;
  avatar: string | null;
  isActive: boolean;
  income: number;
  expense: number;
  net: number;
  incomeShare: number;
  expenseShare: number;
}

export interface FamilyContribution {
  period: PeriodInfo;
  members: MemberContribution[];
  totals: { income: number; expense: number };
}
