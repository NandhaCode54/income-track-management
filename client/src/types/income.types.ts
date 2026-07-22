import type { PaginationMeta } from './api.types';

export const INCOME_TYPES = [
  'SALARY',
  'BUSINESS',
  'RENTAL',
  'FREELANCE',
  'BONUS',
  'INVESTMENT',
  'OTHER',
] as const;
export type IncomeType = (typeof INCOME_TYPES)[number];

/** Frequencies a *recurring* entry may use — `ONCE` is what a one-off stores. */
export const REPEAT_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const;
export type RepeatFrequency = (typeof REPEAT_FREQUENCIES)[number];

export const FREQUENCIES = ['ONCE', ...REPEAT_FREQUENCIES] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const INCOME_SORT_FIELDS = ['date', 'amount', 'createdAt'] as const;
export type IncomeSortField = (typeof INCOME_SORT_FIELDS)[number];

export interface IncomeMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string | null;
  isActive: boolean;
}

export interface Income {
  id: string;
  type: IncomeType;
  amount: number;
  description: string | null;
  notes: string | null;
  date: string;
  isRecurring: boolean;
  frequency: Frequency | null;
  nextOccurrence: string | null;
  createdAt: string;
  updatedAt: string;
  member: IncomeMember;
  isOwn: boolean;
}

export interface IncomeListResult {
  items: Income[];
  /** Sum across every matching row, not just this page. */
  filteredTotal: number;
  meta: PaginationMeta;
}

export interface IncomeFilters {
  page: number;
  perPage: number;
  sortBy: IncomeSortField;
  sortOrder: 'asc' | 'desc';
  type?: IncomeType;
  memberId?: string;
  from?: string;
  to?: string;
  search?: string;
  isRecurring?: boolean;
}

export interface IncomePayload {
  type: IncomeType;
  amount: number;
  date: string;
  description?: string;
  notes?: string;
  isRecurring: boolean;
  frequency?: Frequency;
  memberId?: string;
}

export interface IncomeBreakdown {
  key: string;
  label: string;
  total: number;
  count: number;
  percentage: number;
}

export interface IncomeSummary {
  period: { year: number; month: number | null; from: string; to: string };
  total: number;
  count: number;
  average: number;
  highest: number;
  previousTotal: number;
  changePercent: number | null;
  byType: IncomeBreakdown[];
  byMember: IncomeBreakdown[];
  monthlyTrend: { month: number; total: number }[];
  recurringTotal: number;
}

export interface IncomeSummaryParams {
  year: number;
  month?: number;
}
