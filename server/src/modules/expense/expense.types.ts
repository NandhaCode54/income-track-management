import type { Frequency } from '@prisma/client';

export const EXPENSE_SORT_FIELDS = ['date', 'amount', 'createdAt'] as const;
export type ExpenseSortField = (typeof EXPENSE_SORT_FIELDS)[number];

/**
 * `Expense.paymentMethod` is a free-text column in the schema, but an open field
 * makes "UPI", "upi" and "U.P.I." three different things to every report that
 * groups by it. The API only accepts these values.
 */
export const PAYMENT_METHODS = [
  'CASH',
  'CARD',
  'UPI',
  'NET_BANKING',
  'BANK_TRANSFER',
  'WALLET',
  'CHEQUE',
  'OTHER',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const MAX_TAGS = 10;
export const MAX_RECEIPTS_PER_EXPENSE = 5;
export const MAX_IMPORT_ROWS = 1000;
/** An export has to stay a single response; beyond this the reports module takes over. */
export const MAX_EXPORT_ROWS = 5000;

// ── Expense inputs ──────────────────────────────────────────────────────────

export interface CreateExpenseInput {
  amount: number;
  description: string;
  date: Date;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  tags?: string[];
  notes?: string;
  isRecurring: boolean;
  frequency?: Frequency;
  /** Log the expense on another member's behalf — heads and owners only. */
  memberId?: string;
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>;

export interface ListExpenseQuery {
  page: number;
  perPage: number;
  sortBy: ExpenseSortField;
  sortOrder: 'asc' | 'desc';
  categoryId?: string;
  memberId?: string;
  paymentMethod?: PaymentMethod;
  tag?: string;
  from?: Date;
  to?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  isRecurring?: boolean;
  /** Only rows whose category was deleted or never set. */
  uncategorized?: boolean;
}

export interface ExpenseSummaryQuery {
  year: number;
  /** 1–12. Omitted means "the whole year". */
  month?: number;
}

export interface ImportExpensesOptions {
  /** Create any category named in the file that the family does not have yet. */
  createMissingCategories: boolean;
}

// ── Category inputs ─────────────────────────────────────────────────────────

export interface CreateCategoryInput {
  name: string;
  icon?: string;
  color?: string;
  parentId?: string;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput> & {
  /** Explicit `null` promotes a subcategory back to the top level. */
  parentId?: string | null;
};

// ── DTOs ────────────────────────────────────────────────────────────────────

export interface ExpenseMemberDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string | null;
  isActive: boolean;
}

export interface ExpenseCategoryRefDto {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  /** Present when this is a subcategory, so the UI can show "Food › Groceries". */
  parentName: string | null;
}

export interface ReceiptDto {
  id: string;
  url: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: Date;
}

export interface ExpenseDto {
  id: string;
  amount: number;
  description: string;
  date: Date;
  notes: string | null;
  paymentMethod: PaymentMethod | null;
  tags: string[];
  isRecurring: boolean;
  frequency: Frequency | null;
  /** Derived, not stored — null for one-off entries. */
  nextOccurrence: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category: ExpenseCategoryRefDto | null;
  member: ExpenseMemberDto;
  receipts: ReceiptDto[];
  /** True when the entry belongs to the caller — the UI uses it to offer edit/delete. */
  isOwn: boolean;
}

export interface ExpenseListResult {
  items: ExpenseDto[];
  total: number;
  /** Sum of *all* matching rows, not just the current page. */
  filteredTotal: number;
}

export interface CategoryDto {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  isDefault: boolean;
  /** Expenses filed directly against this category, all time. */
  expenseCount: number;
  children: CategoryDto[];
}

export interface ExpenseBreakdownDto {
  key: string;
  label: string;
  /** Only set on category rows, for the swatch beside the label. */
  color?: string | null;
  total: number;
  count: number;
  /** Share of the period total, 0–100, rounded to 1 decimal. */
  percentage: number;
}

export interface TopExpenseDto {
  id: string;
  description: string;
  amount: number;
  date: Date;
  categoryName: string | null;
}

export interface ExpenseSummaryDto {
  period: { year: number; month: number | null; from: Date; to: Date };
  total: number;
  count: number;
  average: number;
  highest: number;
  /** Same-length window immediately before this one, for the trend arrow. */
  previousTotal: number;
  changePercent: number | null;
  byCategory: ExpenseBreakdownDto[];
  byMember: ExpenseBreakdownDto[];
  byPaymentMethod: ExpenseBreakdownDto[];
  /** Always 12 entries — month 1..12 of `period.year`. */
  monthlyTrend: { month: number; total: number }[];
  topExpenses: TopExpenseDto[];
  recurringTotal: number;
}

export interface ImportRowErrorDto {
  /** 1-based line number in the uploaded file, header included. */
  row: number;
  message: string;
}

export interface ImportResultDto {
  imported: number;
  skipped: number;
  createdCategories: string[];
  errors: ImportRowErrorDto[];
}
