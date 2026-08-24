import type { EMIStatus, PaymentStatus } from '@prisma/client';
import type { AmortisationRow } from '../../shared/utils/emi-calculator.util';

/** Sortable columns on the EMI list. A whitelist, so a query string can never name a column. */
export const EMI_SORT_FIELDS = ['startDate', 'monthlyEMI', 'loanAmount', 'name'] as const;
export type EmiSortField = (typeof EMI_SORT_FIELDS)[number];

/** `GET /emi/upcoming` and the reminder job both look this far ahead by default. */
export const DEFAULT_UPCOMING_DAYS = 30;

/** How many days before an instalment falls due the reminder fires. */
export const REMINDER_LEAD_DAYS = 3;

// ── Inputs ──────────────────────────────────────────────────────────────────

export interface CreateEmiInput {
  name: string;
  lenderName?: string;
  loanAmount: number;
  interestRate: number;
  tenureMonths: number;
  /** The lender's stated instalment. Omitted, it is computed from the terms. */
  monthlyEMI?: number;
  startDate: Date;
  dueDay: number;
  notes?: string;
}

/**
 * Terms are absent here on purpose — see `emi.service.assertTermsEditable`. Once
 * an instalment has been paid the loan's terms are history, and the only fields
 * that stay open are the descriptive ones plus `status`.
 */
export interface UpdateEmiInput {
  name?: string;
  lenderName?: string;
  loanAmount?: number;
  interestRate?: number;
  tenureMonths?: number;
  monthlyEMI?: number;
  startDate?: Date;
  dueDay?: number;
  status?: EMIStatus;
  notes?: string;
}

export interface ListEmiQuery {
  page: number;
  perPage: number;
  sortBy: EmiSortField;
  sortOrder: 'asc' | 'desc';
  status?: EMIStatus;
  search?: string;
}

export interface RecordPaymentInput {
  /** Which instalment. Together they are unique per loan (`@@unique([emiId, month, year])`). */
  month: number;
  year: number;
  /** Defaults to the scheduled amount — the common case is paying exactly what is due. */
  amount?: number;
  paidDate?: Date;
  /** `PAID` unless a part-payment is being recorded. */
  status?: PaymentStatus;
  notes?: string;
}

export interface CalculatorQuery {
  loanAmount: number;
  interestRate: number;
  tenureMonths: number;
}

export interface UpcomingQuery {
  days: number;
}

// ── DTOs ────────────────────────────────────────────────────────────────────

export interface EmiPaymentDto {
  id: string;
  amount: number;
  dueDate: Date;
  paidDate: Date | null;
  status: PaymentStatus;
  month: number;
  year: number;
  notes: string | null;
  /**
   * Whether this instalment is past due **right now**. Derived, because the
   * stored `status` is only as fresh as the last cron run — see the Phase 7 notes.
   */
  isOverdue: boolean;
  daysUntilDue: number;
}

/** What is left to pay, and how far along the loan is. */
export interface EmiProgressDto {
  paidCount: number;
  totalCount: number;
  paidAmount: number;
  /** Scheduled instalments not yet settled — the remaining *cash*, not the principal. */
  remainingAmount: number;
  percentPaid: number;
  overdueCount: number;
  overdueAmount: number;
  nextDueDate: Date | null;
  nextDueAmount: number | null;
}

export interface EmiDto {
  id: string;
  name: string;
  lenderName: string | null;
  loanAmount: number;
  interestRate: number;
  tenureMonths: number;
  monthlyEMI: number;
  startDate: Date;
  endDate: Date;
  dueDay: number;
  status: EMIStatus;
  notes: string | null;
  totalPayable: number;
  totalInterest: number;
  progress: EmiProgressDto;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmiDetailDto extends EmiDto {
  payments: EmiPaymentDto[];
  /** The interest/principal split, aligned instalment-for-instalment with `payments`. */
  schedule: AmortisationRow[];
}

export interface EmiListResult {
  items: EmiDto[];
  total: number;
  /** Across the whole filtered set, not just the page — the same rule as the income list. */
  totals: {
    monthlyOutgo: number;
    outstanding: number;
    activeCount: number;
  };
}

export interface CalculatorDto {
  loanAmount: number;
  interestRate: number;
  tenureMonths: number;
  monthlyEMI: number;
  totalPayable: number;
  totalInterest: number;
  schedule: AmortisationRow[];
}

export interface UpcomingEmiDto extends EmiPaymentDto {
  emiId: string;
  emiName: string;
  lenderName: string | null;
}

export interface UpcomingEmisDto {
  windowDays: number;
  items: UpcomingEmiDto[];
  totals: { count: number; due: number; overdueCount: number; overdueAmount: number };
}
