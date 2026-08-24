import type { NextFunction, Request, Response } from 'express';
import { reportsService } from './reports.service';
import { buildMonthlyPdf, buildYearlyPdf } from './report-pdf.builder';
import { buildMonthlyWorkbook, buildYearlyWorkbook } from './report-excel.builder';
import type { ExportQuery, MonthlyReportData, YearlyReportData } from './reports.types';
import { actorFrom } from '../../shared/utils/request.util';
import { sendSuccess } from '../../shared/utils/api-response.util';
import { MSG } from '../../shared/constants/messages';

const stamp = (): string => new Date().toISOString().slice(0, 10);

const sendDownload = (
  res: Response,
  body: Buffer,
  contentType: string,
  fileName: string,
): void => {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', body.length);
  res.status(200).end(body);
};

export const reportsController = {
  monthly: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await reportsService.monthly(
        actorFrom(req).familyId,
        req.query as unknown as { month: number; year: number },
      );
      sendSuccess(res, MSG.FETCHED, report);
    } catch (e) {
      next(e);
    }
  },

  yearly: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await reportsService.yearly(
        actorFrom(req).familyId,
        req.query as unknown as { year: number },
      );
      sendSuccess(res, MSG.FETCHED, report);
    } catch (e) {
      next(e);
    }
  },

  categoryWise: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await reportsService.categoryWise(
        actorFrom(req).familyId,
        req.query as unknown as { month?: number; year: number },
      );
      sendSuccess(res, MSG.FETCHED, { items });
    } catch (e) {
      next(e);
    }
  },

  memberWise: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await reportsService.memberWise(
        actorFrom(req).familyId,
        req.query as unknown as { month?: number; year: number },
      );
      sendSuccess(res, MSG.FETCHED, { items });
    } catch (e) {
      next(e);
    }
  },

  cashFlow: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await reportsService.yearly(
        actorFrom(req).familyId,
        req.query as unknown as { year: number },
      );
      sendSuccess(res, MSG.FETCHED, { months: report.months, totals: report.totals });
    } catch (e) {
      next(e);
    }
  },

  exportPdf: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as ExportQuery;
      const familyId = actorFrom(req).familyId;

      if (query.scope === 'yearly') {
        const report = await reportsService.yearlyForExport(familyId, { year: query.year });
        const body = await buildYearlyPdf(report);
        return sendDownload(res, body, 'application/pdf', `yearly-report-${query.year}-${stamp()}.pdf`);
      }

      const report = await reportsService.monthlyForExport(familyId, {
        month: query.month!,
        year: query.year,
      });
      const body = await buildMonthlyPdf(report);
      return sendDownload(
        res,
        body,
        'application/pdf',
        `monthly-report-${query.year}-${String(query.month).padStart(2, '0')}-${stamp()}.pdf`,
      );
    } catch (e) {
      next(e);
    }
  },

  exportExcel: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as ExportQuery;
      const familyId = actorFrom(req).familyId;

      if (query.scope === 'yearly') {
        const report: YearlyReportData = await reportsService.yearlyForExport(familyId, {
          year: query.year,
        });
        const body = await buildYearlyWorkbook(report);
        return sendDownload(res, body, ExcelMime.XLSX, `yearly-report-${query.year}-${stamp()}.xlsx`);
      }

      const report: MonthlyReportData = await reportsService.monthlyForExport(familyId, {
        month: query.month!,
        year: query.year,
      });
      const body = await buildMonthlyWorkbook(report);
      return sendDownload(
        res,
        body,
        ExcelMime.XLSX,
        `monthly-report-${query.year}-${String(query.month).padStart(2, '0')}-${stamp()}.xlsx`,
      );
    } catch (e) {
      next(e);
    }
  },
};

/** Kept beside its only consumer so the MIME string lives in one place. */
enum ExcelMime {
  XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}
