import type { Frequency, IncomeType } from '@prisma/client';

export const INCOME_SORT_FIELDS = ['date', 'amount', 'createdAt'] as const;
export type IncomeSortField = (typeof INCOME_SORT_FIELDS)[number];

// ── Inputs ──────────────────────────────────────────────────────────────────

export interface CreateIncomeInput {
  type: IncomeType;
  amount: number;
  date: Date;
  description?: string;
  notes?: string;
  isRecurring: boolean;
  frequency?: Frequency;
  /** Log the entry on another member's behalf — heads and owners only. */
  memberId?: string;
}

export type UpdateIncomeInput = Partial<CreateIncomeInput>;

export interface ListIncomeQuery {
  page: number;
  perPage: number;
  sortBy: IncomeSortField;
  sortOrder: 'asc' | 'desc';
  type?: IncomeType;
  memberId?: string;
  from?: Date;
  to?: Date;
  search?: string;
  isRecurring?: boolean;
}

export interface IncomeSummaryQuery {
  year: number;
  /** 1–12. Omitted means "the whole year". */
  month?: number;
}

// ── DTOs ────────────────────────────────────────────────────────────────────

export interface IncomeMemberDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string | null;
  isActive: boolean;
}

export interface IncomeDto {
  id: string;
  type: IncomeType;
  amount: number;
  description: string | null;
  notes: string | null;
  date: Date;
  isRecurring: boolean;
  frequency: Frequency | null;
  /** Derived, not stored — null for one-off entries. */
  nextOccurrence: Date | null;
  createdAt: Date;
  updatedAt: Date;
  member: IncomeMemberDto;
  /** True when the entry belongs to the caller — the UI uses it to offer edit/delete. */
  isOwn: boolean;
}

export interface IncomeListResult {
  items: IncomeDto[];
  total: number;
  /** Sum of *all* matching rows, not just the current page. */
  filteredTotal: number;
}

export interface IncomeBreakdownDto {
  key: string;
  label: string;
  total: number;
  count: number;
  /** Share of the period total, 0–100, rounded to 1 decimal. */
  percentage: number;
}

export interface IncomeSummaryDto {
  period: { year: number; month: number | null; from: Date; to: Date };
  total: number;
  count: number;
  average: number;
  highest: number;
  /** Same-length window immediately before this one, for the trend arrow. */
  previousTotal: number;
  changePercent: number | null;
  byType: IncomeBreakdownDto[];
  byMember: IncomeBreakdownDto[];
  /** Always 12 entries — month 1..12 of `period.year`. */
  monthlyTrend: { month: number; total: number }[];
  recurringTotal: number;
}
