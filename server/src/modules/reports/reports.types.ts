import type { Prisma } from '@prisma/client';

export interface ReportPeriodQuery {
  month: number;
  year: number;
}

export interface YearlyQuery {
  year: number;
}

export type ExportScope = 'monthly' | 'yearly';

export interface ExportQuery {
  scope: ExportScope;
  /** Required for monthly exports, ignored for yearly. */
  month?: number;
  year: number;
}

export interface ReportTotalsDto {
  income: number;
  expense: number;
  net: number;
}

export interface CategoryBreakdownRowDto {
  categoryId: string | null;
  label: string;
  total: number;
  count: number;
  percentage: number;
}

export interface MemberBreakdownRowDto {
  memberId: string;
  name: string;
  role: string;
  income: number;
  expense: number;
  percentage: number;
}

export interface CashFlowPointDto {
  month: number;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface MonthlyReportDto {
  period: { month: number; year: number };
  totals: ReportTotalsDto;
  byCategory: CategoryBreakdownRowDto[];
  byMember: MemberBreakdownRowDto[];
}

export interface YearlyReportDto {
  year: number;
  months: CashFlowPointDto[];
  totals: ReportTotalsDto;
}

/** What the PDF/Excel builders consume — the assembled report, no query logic. */
export interface MonthlyReportData extends MonthlyReportDto {
  familyName: string;
}

export interface YearlyReportData extends YearlyReportDto {
  familyName: string;
}

export type ReportGroupRow = {
  categoryId: string | null;
  total: Prisma.Decimal;
};
