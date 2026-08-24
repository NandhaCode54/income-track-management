import { api } from './api';
import { unwrap, type ApiEnvelope } from '@/types/api.types';
import type {
  CashFlowReport,
  CategoryBreakdownRow,
  MemberBreakdownRow,
  MonthlyReport,
  ReportScope,
  YearlyReport,
} from '@/types/report.types';

export interface ReportRange {
  month?: number;
  year: number;
}

/** The response is a file body, not the usual envelope — same as CSV export. */
interface Download {
  blob: Blob;
  fileName: string;
}

const readDownload = (data: unknown, headers: Record<string, unknown>, fallbackName: string): Download => {
  const disposition = String(headers['content-disposition'] ?? '');
  const match = /filename="?([^";]+)"?/.exec(disposition);
  return { blob: data as Blob, fileName: match?.[1] ?? fallbackName };
};

export const reportsApi = {
  async monthly(month: number, year: number): Promise<MonthlyReport> {
    const { data } = await api.get<ApiEnvelope<MonthlyReport>>('/reports/monthly', {
      params: { month, year },
    });
    return unwrap(data);
  },

  async yearly(year: number): Promise<YearlyReport> {
    const { data } = await api.get<ApiEnvelope<YearlyReport>>('/reports/yearly', {
      params: { year },
    });
    return unwrap(data);
  },

  async categoryWise(range: ReportRange): Promise<CategoryBreakdownRow[]> {
    const { data } = await api.get<ApiEnvelope<{ items: CategoryBreakdownRow[] }>>(
      '/reports/category-wise',
      { params: range.month ? range : { year: range.year } },
    );
    return unwrap(data).items;
  },

  async memberWise(range: ReportRange): Promise<MemberBreakdownRow[]> {
    const { data } = await api.get<ApiEnvelope<{ items: MemberBreakdownRow[] }>>(
      '/reports/member-wise',
      { params: range.month ? range : { year: range.year } },
    );
    return unwrap(data).items;
  },

  async cashFlow(year: number): Promise<CashFlowReport> {
    const { data } = await api.get<ApiEnvelope<CashFlowReport>>('/reports/cash-flow', {
      params: { year },
    });
    return unwrap(data);
  },

  async exportPdf(scope: ReportScope, range: ReportRange): Promise<Download> {
    const response = await api.get('/reports/export/pdf', {
      responseType: 'blob',
      params: { scope, ...range },
    });
    const fallback =
      scope === 'yearly'
        ? `yearly-report-${range.year}.pdf`
        : `monthly-report-${range.year}-${String(range.month).padStart(2, '0')}.pdf`;
    return readDownload(response.data, response.headers as Record<string, unknown>, fallback);
  },

  async exportExcel(scope: ReportScope, range: ReportRange): Promise<Download> {
    const response = await api.get('/reports/export/excel', {
      responseType: 'blob',
      params: { scope, ...range },
    });
    const fallback =
      scope === 'yearly'
        ? `yearly-report-${range.year}.xlsx`
        : `monthly-report-${range.year}-${String(range.month).padStart(2, '0')}.xlsx`;
    return readDownload(response.data, response.headers as Record<string, unknown>, fallback);
  },
};
