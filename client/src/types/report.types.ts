/** Local mirrors of the server report DTOs. */

export type ReportScope = 'monthly' | 'yearly';

export interface ReportTotals {
  income: number;
  expense: number;
  net: number;
}

export interface CategoryBreakdownRow {
  categoryId: string | null;
  label: string;
  total: number;
  count: number;
  percentage: number;
}

export interface MemberBreakdownRow {
  memberId: string;
  name: string;
  role: string;
  income: number;
  expense: number;
  percentage: number;
}

export interface CashFlowPoint {
  month: number;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface MonthlyReport {
  period: { month: number; year: number };
  totals: ReportTotals;
  byCategory: CategoryBreakdownRow[];
  byMember: MemberBreakdownRow[];
}

export interface YearlyReport {
  year: number;
  months: CashFlowPoint[];
  totals: ReportTotals;
}

export interface CashFlowReport {
  months: CashFlowPoint[];
  totals: ReportTotals;
}

export const ROLE_LABELS: Record<string, string> = {
  TENANT_OWNER: 'Owner',
  FAMILY_HEAD: 'Family head',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};
