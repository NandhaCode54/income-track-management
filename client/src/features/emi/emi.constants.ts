import type { EmiSortField, EmiStatus, PaymentStatus, RecordableStatus } from '@/types/emi.types';

export const EMI_STATUS_LABELS: Record<EmiStatus, string> = {
  ACTIVE: 'Running',
  COMPLETED: 'Closed',
  DEFAULTED: 'Defaulted',
  FORECLOSED: 'Foreclosed',
};

/**
 * Status colours pair a tint with a border and readable text rather than colour
 * alone — every badge also carries its label, so the hue reinforces a word it
 * never replaces.
 */
export const EMI_STATUS_STYLES: Record<EmiStatus, string> = {
  ACTIVE: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300',
  COMPLETED:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
  DEFAULTED: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
  FORECLOSED:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Due',
  PAID: 'Paid',
  OVERDUE: 'Missed',
  PARTIAL: 'Part-paid',
  WAIVED: 'Waived',
};

export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  PENDING: 'border-border bg-muted text-muted-foreground',
  PAID: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
  OVERDUE: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
  PARTIAL: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
  WAIVED: 'border-border bg-muted text-muted-foreground',
};

export const RECORDABLE_STATUS_LABELS: Record<RecordableStatus, string> = {
  PAID: 'Paid in full',
  PARTIAL: 'Part-paid',
  WAIVED: 'Waived by the lender',
};

export const EMI_SORT_LABELS: Record<EmiSortField, string> = {
  startDate: 'Start date',
  monthlyEMI: 'Instalment',
  loanAmount: 'Loan amount',
  name: 'Name',
};

/** Matches the server's `DEFAULT_UPCOMING_DAYS`. */
export const UPCOMING_WINDOW_DAYS = 30;

export const DEFAULT_PER_PAGE = 20;
