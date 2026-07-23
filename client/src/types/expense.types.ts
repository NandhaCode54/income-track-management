import type { PaginationMeta } from './api.types';
import type { Frequency } from './income.types';

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

export const EXPENSE_SORT_FIELDS = ['date', 'amount', 'createdAt'] as const;
export type ExpenseSortField = (typeof EXPENSE_SORT_FIELDS)[number];

export const MAX_TAGS = 10;
export const MAX_RECEIPTS_PER_EXPENSE = 5;

export interface ExpenseMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string | null;
  isActive: boolean;
}

export interface ExpenseCategoryRef {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  parentName: string | null;
}

export interface Receipt {
  id: string;
  url: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  notes: string | null;
  paymentMethod: PaymentMethod | null;
  tags: string[];
  isRecurring: boolean;
  frequency: Frequency | null;
  nextOccurrence: string | null;
  createdAt: string;
  updatedAt: string;
  category: ExpenseCategoryRef | null;
  member: ExpenseMember;
  receipts: Receipt[];
  isOwn: boolean;
}

export interface ExpenseListResult {
  items: Expense[];
  /** Sum across every matching row, not just this page. */
  filteredTotal: number;
  meta: PaginationMeta;
}

export interface ExpenseFilters {
  page: number;
  perPage: number;
  sortBy: ExpenseSortField;
  sortOrder: 'asc' | 'desc';
  categoryId?: string;
  memberId?: string;
  paymentMethod?: PaymentMethod;
  tag?: string;
  from?: string;
  to?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  isRecurring?: boolean;
  uncategorized?: boolean;
}

export interface ExpensePayload {
  amount: number;
  description: string;
  date: string;
  categoryId?: string;
  paymentMethod?: PaymentMethod | '';
  tags?: string[];
  notes?: string;
  isRecurring: boolean;
  frequency?: Frequency;
  memberId?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  isDefault: boolean;
  expenseCount: number;
  children: ExpenseCategory[];
}

export interface CategoryPayload {
  name: string;
  icon?: string;
  color?: string;
  /** `null` promotes a subcategory back to the top level. */
  parentId?: string | null;
}

export interface ExpenseBreakdown {
  key: string;
  label: string;
  color?: string | null;
  total: number;
  count: number;
  percentage: number;
}

export interface TopExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryName: string | null;
}

export interface ExpenseSummary {
  period: { year: number; month: number | null; from: string; to: string };
  total: number;
  count: number;
  average: number;
  highest: number;
  previousTotal: number;
  changePercent: number | null;
  byCategory: ExpenseBreakdown[];
  byMember: ExpenseBreakdown[];
  byPaymentMethod: ExpenseBreakdown[];
  monthlyTrend: { month: number; total: number }[];
  topExpenses: TopExpense[];
  recurringTotal: number;
}

export interface ExpenseSummaryParams {
  year: number;
  month?: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  createdCategories: string[];
  errors: { row: number; message: string }[];
}
