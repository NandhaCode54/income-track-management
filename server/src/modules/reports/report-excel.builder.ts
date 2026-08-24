import ExcelJS from 'exceljs';
import type { MonthlyReportData, YearlyReportData } from './reports.types';

/**
 * The Excel export as a real workbook (not CSV), so numbers stay numbers:
 * one sheet per table, styled headers, and an INR number format on every
 * amount column. Buffered via `writeBuffer` — same reasoning as the PDF.
 */

const HEADER_FILL = 'FF4F46E5';
const MONEY_FORMAT = '#,##0.00';

const styleHeader = (row: ExcelJS.Row): void => {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
};

const moneyColumn = (worksheet: ExcelJS.Worksheet, letter: string): void => {
  worksheet.getColumn(letter).numFmt = MONEY_FORMAT;
};

const addSummarySheet = (
  workbook: ExcelJS.Workbook,
  title: string,
  rows: [string, number][],
): void => {
  const sheet = workbook.addWorksheet('Summary');
  sheet.addRow([title]).font = { bold: true, size: 13 };
  sheet.addRow([]);
  const header = sheet.addRow(['Metric', 'Amount']);
  styleHeader(header);
  for (const [label, value] of rows) sheet.addRow([label, value]).getCell(2).numFmt = MONEY_FORMAT;
  sheet.getColumn(1).width = 28;
  moneyColumn(sheet, 'B');
};

export const buildMonthlyWorkbook = async (report: MonthlyReportData): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Family Finance Manager';
  workbook.created = new Date();

  const monthName = new Date(Date.UTC(report.period.year, report.period.month - 1)).toLocaleString(
    'en-GB',
    { month: 'long', timeZone: 'UTC' },
  );

  addSummarySheet(workbook, `${report.familyName} — ${monthName} ${report.period.year}`, [
    ['Total income', report.totals.income],
    ['Total expenses', report.totals.expense],
    ['Net', report.totals.net],
  ]);

  const categories = workbook.addWorksheet('By Category');
  const categoryHeader = categories.addRow(['Category', 'Entries', 'Share %', 'Amount']);
  styleHeader(categoryHeader);
  for (const row of report.byCategory) {
    categories.addRow([row.label, row.count, row.percentage, row.total]);
  }
  categories.getColumn(1).width = 36;
  moneyColumn(categories, 'D');

  const members = workbook.addWorksheet('By Member');
  const memberHeader = members.addRow(['Member', 'Role', 'Income', 'Expenses', 'Share %']);
  styleHeader(memberHeader);
  for (const row of report.byMember) {
    members.addRow([row.name, row.role, row.income, row.expense, row.percentage]);
  }
  members.getColumn(1).width = 24;
  moneyColumn(members, 'C');
  moneyColumn(members, 'D');

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

export const buildYearlyWorkbook = async (report: YearlyReportData): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Family Finance Manager';
  workbook.created = new Date();

  addSummarySheet(workbook, `${report.familyName} — ${report.year}`, [
    ['Total income', report.totals.income],
    ['Total expenses', report.totals.expense],
    ['Net', report.totals.net],
  ]);

  const months = workbook.addWorksheet('Monthly');
  const header = months.addRow(['Month', 'Income', 'Expenses', 'Net']);
  styleHeader(header);
  for (const point of report.months) {
    months.addRow([`${point.label} ${report.year}`, point.income, point.expense, point.net]);
  }
  months.getColumn(1).width = 14;
  moneyColumn(months, 'B');
  moneyColumn(months, 'C');
  moneyColumn(months, 'D');

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};
