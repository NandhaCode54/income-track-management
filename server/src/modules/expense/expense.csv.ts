import {
  MAX_TAGS,
  PAYMENT_METHODS,
  type ExpenseDto,
  type ImportRowErrorDto,
  type PaymentMethod,
} from './expense.types';
import { normaliseHeader, parseCsv, type CsvCell } from '../../shared/utils/csv.util';
import { MAX_AMOUNT } from '../../shared/validators/field.validator';

// ── Export ──────────────────────────────────────────────────────────────────

/**
 * Deliberately the same vocabulary the import understands, so a family can
 * export, edit in a spreadsheet and import the file straight back.
 */
export const EXPENSE_CSV_HEADERS = [
  'Date',
  'Description',
  'Category',
  'Amount',
  'Payment Method',
  'Tags',
  'Notes',
  'Paid By',
  'Recurring',
  'Frequency',
] as const;

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

export const toCsvRow = (expense: ExpenseDto): CsvCell[] => [
  isoDate(expense.date),
  expense.description,
  expense.category
    ? expense.category.parentName
      ? `${expense.category.parentName} > ${expense.category.name}`
      : expense.category.name
    : '',
  expense.amount.toFixed(2),
  expense.paymentMethod ?? '',
  expense.tags.join('; '),
  expense.notes ?? '',
  `${expense.member.firstName} ${expense.member.lastName}`,
  expense.isRecurring ? 'Yes' : 'No',
  expense.isRecurring ? (expense.frequency ?? '') : '',
];

// ── Import ──────────────────────────────────────────────────────────────────

export interface ParsedImportRow {
  /** 1-based line in the uploaded file, header included — what the user sees. */
  row: number;
  date: Date;
  description: string;
  amount: number;
  categoryName: string | null;
  paymentMethod: PaymentMethod | null;
  tags: string[];
  notes: string | null;
}

/** Header aliases people actually have in bank and spreadsheet exports. */
const COLUMN_ALIASES: Record<string, string[]> = {
  date: ['date', 'transactiondate', 'expensedate', 'paidon'],
  description: ['description', 'details', 'particulars', 'narration', 'title', 'merchant'],
  amount: ['amount', 'value', 'debit', 'spent', 'total'],
  category: ['category', 'categoryname', 'type'],
  paymentMethod: ['paymentmethod', 'payment', 'method', 'mode', 'paidvia'],
  tags: ['tags', 'tag', 'labels'],
  notes: ['notes', 'note', 'remarks', 'comment', 'comments'],
};

const REQUIRED_COLUMNS = ['date', 'description', 'amount'] as const;

/**
 * Built at **UTC** midnight, matching what `z.coerce.date()` produces for the
 * `yyyy-MM-dd` strings the API receives from the date picker. Local midnight
 * would land an imported 1 July in June for anywhere east of Greenwich — both
 * on export and in the month buckets the summary query extracts in SQL.
 */
const buildDate = (year: number, month: number, day: number): Date | null => {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  // Rejects 31 February, which `Date.UTC` would happily roll into March.
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return valid && year >= 1970 && year <= 2100 ? date : null;
};

/**
 * Two-digit years and month/day order are genuinely ambiguous in CSV, so only
 * unambiguous forms are accepted: ISO `YYYY-MM-DD`, or day-first `DD/MM/YYYY`
 * (matching the app's default date format). Anything else is a row error rather
 * than a silent guess that files a March expense in June.
 */
const parseDate = (value: string): Date | null => {
  const text = value.trim();

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (iso) return buildDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dayFirst = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (dayFirst) return buildDate(Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1]));

  return null;
};

/** Strips currency symbols, thousands separators and stray spaces. */
const parseAmount = (value: string): number | null => {
  const cleaned = value.replace(/[^\d.-]/g, '');
  if (!cleaned || !/^-?\d*\.?\d+$/.test(cleaned)) return null;

  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) return null;

  return Math.round(amount * 100) / 100;
};

/** Everyday names for the methods we model, so common exports map cleanly. */
const PAYMENT_ALIASES: Record<string, PaymentMethod> = {
  CREDIT_CARD: 'CARD',
  DEBIT_CARD: 'CARD',
  CREDITCARD: 'CARD',
  DEBITCARD: 'CARD',
  NETBANKING: 'NET_BANKING',
  INTERNET_BANKING: 'NET_BANKING',
  NEFT: 'BANK_TRANSFER',
  IMPS: 'BANK_TRANSFER',
  RTGS: 'BANK_TRANSFER',
  TRANSFER: 'BANK_TRANSFER',
  GPAY: 'UPI',
  GOOGLE_PAY: 'UPI',
  PHONEPE: 'UPI',
  PAYTM: 'WALLET',
  CHECK: 'CHEQUE',
};

const parsePaymentMethod = (value: string): PaymentMethod | null => {
  const text = value.trim();
  if (!text) return null;

  const key = text.toUpperCase().replace(/[^A-Z]+/g, '_').replace(/^_|_$/g, '');
  const match = PAYMENT_METHODS.find((method) => method === key) ?? PAYMENT_ALIASES[key];

  // A method we do not model is still a real payment — bucket it rather than
  // dropping the column or failing the row.
  return match ?? 'OTHER';
};

const parseTags = (value: string): string[] => {
  const seen = new Set<string>();
  return value
    .split(/[;,|]/)
    .map((tag) => tag.trim())
    .filter((tag) => {
      if (!tag || tag.length > 30 || seen.has(tag.toLowerCase())) return false;
      seen.add(tag.toLowerCase());
      return true;
    })
    .slice(0, MAX_TAGS);
};

/** Maps each known column to the index it occupies in this particular file. */
const mapColumns = (headerRow: string[]): Record<string, number> => {
  const normalised = headerRow.map(normaliseHeader);
  const columns: Record<string, number> = {};

  Object.entries(COLUMN_ALIASES).forEach(([field, aliases]) => {
    const index = normalised.findIndex((header) => aliases.includes(header));
    if (index !== -1) columns[field] = index;
  });

  return columns;
};

export interface ReadImportResult {
  rows: ParsedImportRow[];
  errors: ImportRowErrorDto[];
  /** False when the header line is missing the three columns we cannot infer. */
  hasRequiredColumns: boolean;
}

/**
 * Reads the whole file and reports per-row problems instead of aborting on the
 * first bad line: a 200-row import with three malformed dates should land 197
 * expenses and tell the user exactly which three to fix.
 */
export const readImportRows = (text: string): ReadImportResult => {
  const grid = parseCsv(text);
  if (grid.length === 0) {
    return { rows: [], errors: [], hasRequiredColumns: true };
  }

  const columns = mapColumns(grid[0]);
  const hasRequiredColumns = REQUIRED_COLUMNS.every((field) => field in columns);
  if (!hasRequiredColumns) {
    return { rows: [], errors: [], hasRequiredColumns: false };
  }

  const rows: ParsedImportRow[] = [];
  const errors: ImportRowErrorDto[] = [];

  const cell = (cells: string[], field: string): string =>
    columns[field] === undefined ? '' : (cells[columns[field]] ?? '').trim();

  grid.slice(1).forEach((cells, index) => {
    // +2: the header is line 1 and `index` is 0-based within the body.
    const row = index + 2;

    const date = parseDate(cell(cells, 'date'));
    if (!date) {
      errors.push({ row, message: `Could not read the date "${cell(cells, 'date')}"` });
      return;
    }

    const description = cell(cells, 'description').slice(0, 200);
    if (!description) {
      errors.push({ row, message: 'Description is empty' });
      return;
    }

    const amount = parseAmount(cell(cells, 'amount'));
    if (amount === null) {
      errors.push({ row, message: `"${cell(cells, 'amount')}" is not a valid amount` });
      return;
    }

    rows.push({
      row,
      date,
      description,
      amount,
      categoryName: cell(cells, 'category') || null,
      paymentMethod: parsePaymentMethod(cell(cells, 'paymentMethod')),
      tags: parseTags(cell(cells, 'tags')),
      notes: cell(cells, 'notes').slice(0, 1000) || null,
    });
  });

  return { rows, errors, hasRequiredColumns: true };
};
