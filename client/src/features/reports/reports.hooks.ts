import { useMutation, useQuery } from '@tanstack/react-query';
import { QK } from '@/constants/queryKeys';
import { reportsApi, type ReportRange } from '@/services/report.service';
import type { ReportScope } from '@/types/report.types';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';

export const useMonthlyReport = (month: number, year: number) =>
  useQuery({
    queryKey: [...QK.REPORTS, 'monthly', month, year],
    queryFn: () => reportsApi.monthly(month, year),
  });

export const useYearlyReport = (year: number) =>
  useQuery({
    queryKey: [...QK.REPORTS, 'yearly', year],
    queryFn: () => reportsApi.yearly(year),
  });

export const useCategoryWise = (range: ReportRange) =>
  useQuery({
    queryKey: [...QK.REPORTS, 'category-wise', range],
    queryFn: () => reportsApi.categoryWise(range),
  });

export const useMemberWise = (range: ReportRange) =>
  useQuery({
    queryKey: [...QK.REPORTS, 'member-wise', range],
    queryFn: () => reportsApi.memberWise(range),
  });

/**
 * A download is a command with a side effect, not state — nothing is cached,
 * the browser owns the file the moment it lands.
 */
const saveDownload = ({ blob, fileName }: { blob: Blob; fileName: string }): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoking immediately would cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const useExportReport = () =>
  useMutation({
    mutationFn: ({ scope, range }: { scope: ReportScope; range: ReportRange }) =>
      reportsApi.exportPdf(scope, range),
    onSuccess: (download) => {
      saveDownload(download);
      toast.success('PDF ready', `Saved as ${download.fileName}.`);
    },
    onError: (error) => toast.error('Could not export PDF', getApiErrorMessage(error)),
  });

export const useExportReportExcel = () =>
  useMutation({
    mutationFn: ({ scope, range }: { scope: ReportScope; range: ReportRange }) =>
      reportsApi.exportExcel(scope, range),
    onSuccess: (download) => {
      saveDownload(download);
      toast.success('Excel ready', `Saved as ${download.fileName}.`);
    },
    onError: (error) => toast.error('Could not export Excel', getApiErrorMessage(error)),
  });
