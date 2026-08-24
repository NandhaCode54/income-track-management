export const EMI_STATUSES = ['ACTIVE', 'COMPLETED', 'DEFAULTED', 'FORECLOSED'] as const;
export type EmiStatus = (typeof EMI_STATUSES)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'OVERDUE', 'PARTIAL', 'WAIVED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** The statuses a person can actually *record*. PENDING and OVERDUE are the schedule's own bookkeeping. */
export const RECORDABLE_STATUSES = ['PAID', 'PARTIAL', 'WAIVED'] as const;
export type RecordableStatus = (typeof RECORDABLE_STATUSES)[number];

export const EMI_SORT_FIELDS = ['startDate', 'monthlyEMI', 'loanAmount', 'name'] as const;
export type EmiSortField = (typeof EMI_SORT_FIELDS)[number];

/** One row of the interest/principal split. Mirrors the server's `AmortisationRow`. */
export interface AmortisationRow {
  installment: number;
  openingBalance: number;
  payment: number;
  interest: number;
  principal: number;
  closingBalance: number;
}

export interface EmiPayment {
  id: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: PaymentStatus;
  month: number;
  year: number;
  notes: string | null;
  /** Derived server-side against today, so it is never a stale cron result. */
  isOverdue: boolean;
  daysUntilDue: number;
}

export interface EmiProgress {
  paidCount: number;
  totalCount: number;
  paidAmount: number;
  /** Scheduled instalments not yet settled — remaining *cash*, not principal. */
  remainingAmount: number;
  percentPaid: number;
  overdueCount: number;
  overdueAmount: number;
  nextDueDate: string | null;
  nextDueAmount: number | null;
}

export interface Emi {
  id: string;
  name: string;
  lenderName: string | null;
  loanAmount: number;
  interestRate: number;
  tenureMonths: number;
  monthlyEMI: number;
  startDate: string;
  endDate: string;
  dueDay: number;
  status: EmiStatus;
  notes: string | null;
  totalPayable: number;
  totalInterest: number;
  progress: EmiProgress;
  createdAt: string;
  updatedAt: string;
}

export interface EmiDetail extends Emi {
  payments: EmiPayment[];
  schedule: AmortisationRow[];
}

export interface EmiTotals {
  monthlyOutgo: number;
  outstanding: number;
  activeCount: number;
}

export interface EmiFilters {
  page: number;
  perPage: number;
  sortBy: EmiSortField;
  sortOrder: 'asc' | 'desc';
  status?: EmiStatus;
  search?: string;
}

export interface EmiPayload {
  name: string;
  lenderName?: string;
  loanAmount: number;
  interestRate: number;
  tenureMonths: number;
  /** Omitted, the server computes it from the terms. */
  monthlyEMI?: number;
  startDate: string;
  dueDay: number;
  notes?: string;
  status?: EmiStatus;
}

export interface RecordPaymentPayload {
  month: number;
  year: number;
  amount?: number;
  paidDate?: string;
  status?: RecordableStatus;
  notes?: string;
}

export interface CalculatorInput {
  loanAmount: number;
  interestRate: number;
  tenureMonths: number;
}

export interface CalculatorResult extends CalculatorInput {
  monthlyEMI: number;
  totalPayable: number;
  totalInterest: number;
  schedule: AmortisationRow[];
}

export interface UpcomingEmi extends EmiPayment {
  emiId: string;
  emiName: string;
  lenderName: string | null;
}

export interface UpcomingEmis {
  windowDays: number;
  items: UpcomingEmi[];
  totals: { count: number; due: number; overdueCount: number; overdueAmount: number };
}
