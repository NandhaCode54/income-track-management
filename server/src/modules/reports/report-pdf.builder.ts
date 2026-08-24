import PDFDocument from 'pdfkit';
import type { MonthlyReportData, YearlyReportData } from './reports.types';

/**
 * The monthly P&L as a one-page A4 PDF. Buffers rather than piping: report
 * sizes are tiny (a few KB), and buffering keeps error handling ordinary — a
 * failure before the headers are sent is just a 500.
 */

const INR = '₹';

const money = (value: number): string =>
  `${INR}${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const TABLE_WIDTH = 495;
const COL_LABEL = 280;
const COL_COUNT = 70;
const COL_TOTAL = 145;

const tableRow = (
  doc: PDFKit.PDFDocument,
  cells: { text: string; width: number; align?: 'left' | 'right'; bold?: boolean }[],
): void => {
  let x = doc.page.margins.left;
  const y = doc.y;
  for (const cell of cells) {
    doc.font(cell.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(9)
      .fillColor('#111827')
      .text(cell.text, x, y, { width: cell.width, align: cell.align ?? 'left', lineBreak: false });
    x += cell.width;
  }
  doc.moveTo(doc.page.margins.left, doc.y + 4)
    .lineTo(doc.page.margins.left + TABLE_WIDTH, doc.y + 4)
    .strokeColor('#E5E7EB')
    .lineWidth(0.5)
    .stroke();
  doc.y += 6;
};

const sectionTitle = (doc: PDFKit.PDFDocument, title: string): void => {
  doc.moveDown(1.2).font('Helvetica-Bold').fontSize(11).fillColor('#111827').text(title);
  doc.moveDown(0.3);
};

const totalsTable = (
  doc: PDFKit.PDFDocument,
  rows: { label: string; value: number }[],
): void => {
  for (const row of rows) {
    tableRow(doc, [
      { text: row.label, width: COL_LABEL },
      { text: money(row.value), width: COL_TOTAL + COL_COUNT, align: 'right' },
    ]);
  }
};

export const buildMonthlyPdf = async (report: MonthlyReportData): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#111827').text('Monthly Report');
    doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text(
      `${report.familyName} — ${MONTH_NAMES[report.period.month - 1]} ${report.period.year}`,
    );
    doc.moveTo(50, doc.y + 8).lineTo(545, doc.y + 8).strokeColor('#D1D5DB').lineWidth(1).stroke();
    doc.moveDown(1.5);

    sectionTitle(doc, 'Summary');
    totalsTable(doc, [
      { label: 'Total income', value: report.totals.income },
      { label: 'Total expenses', value: report.totals.expense },
      { label: 'Net', value: report.totals.net },
    ]);

    sectionTitle(doc, 'Spending by category');
    if (report.byCategory.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#6B7280').text('No expenses recorded this month.');
      doc.moveDown(0.5);
    } else {
      tableRow(doc, [
        { text: 'Category', width: COL_LABEL, bold: true },
        { text: 'Entries', width: COL_COUNT, bold: true, align: 'right' },
        { text: 'Share', width: COL_TOTAL - COL_COUNT, bold: true, align: 'right' },
        { text: 'Amount', width: COL_COUNT, bold: true, align: 'right' },
      ]);
      for (const row of report.byCategory) {
        tableRow(doc, [
          { text: row.label, width: COL_LABEL },
          { text: String(row.count), width: COL_COUNT, align: 'right' },
          { text: `${row.percentage}%`, width: COL_TOTAL - COL_COUNT, align: 'right' },
          { text: money(row.total), width: COL_COUNT, align: 'right' },
        ]);
      }
    }

    sectionTitle(doc, 'By member');
    if (report.byMember.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#6B7280').text('No member activity this month.');
    } else {
      tableRow(doc, [
        { text: 'Member', width: COL_LABEL, bold: true },
        { text: 'Income', width: (COL_TOTAL + COL_COUNT) / 2, bold: true, align: 'right' },
        { text: 'Expenses', width: (COL_TOTAL + COL_COUNT) / 2, bold: true, align: 'right' },
      ]);
      for (const row of report.byMember) {
        tableRow(doc, [
          { text: `${row.name} (${row.role})`, width: COL_LABEL },
          { text: money(row.income), width: (COL_TOTAL + COL_COUNT) / 2, align: 'right' },
          { text: money(row.expense), width: (COL_TOTAL + COL_COUNT) / 2, align: 'right' },
        ]);
      }
    }

    doc.moveDown(2)
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#9CA3AF')
      .text(`Generated ${new Date().toUTCString()} by Family Finance Manager`, 50, doc.page.height - 60);

    doc.end();
  });

export const buildYearlyPdf = async (report: YearlyReportData): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#111827').text('Yearly Report');
    doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text(`${report.familyName} — ${report.year}`);
    doc.moveTo(50, doc.y + 8).lineTo(545, doc.y + 8).strokeColor('#D1D5DB').lineWidth(1).stroke();
    doc.moveDown(1.5);

    sectionTitle(doc, 'Summary');
    totalsTable(doc, [
      { label: 'Total income', value: report.totals.income },
      { label: 'Total expenses', value: report.totals.expense },
      { label: 'Net', value: report.totals.net },
    ]);

    sectionTitle(doc, 'Month by month');
    tableRow(doc, [
      { text: 'Month', width: COL_LABEL, bold: true },
      { text: 'Income', width: (COL_TOTAL + COL_COUNT) / 2, bold: true, align: 'right' },
      { text: 'Expenses', width: (COL_TOTAL + COL_COUNT) / 2, bold: true, align: 'right' },
      { text: 'Net', width: COL_COUNT, bold: true, align: 'right' },
    ]);
    for (const point of report.months) {
      tableRow(doc, [
        { text: `${point.label} ${report.year}`, width: COL_LABEL },
        { text: money(point.income), width: (COL_TOTAL + COL_COUNT) / 2, align: 'right' },
        { text: money(point.expense), width: (COL_TOTAL + COL_COUNT) / 2, align: 'right' },
        { text: money(point.net), width: COL_COUNT, align: 'right' },
      ]);
    }

    doc.moveDown(2)
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#9CA3AF')
      .text(`Generated ${new Date().toUTCString()} by Family Finance Manager`, 50, doc.page.height - 60);

    doc.end();
  });
