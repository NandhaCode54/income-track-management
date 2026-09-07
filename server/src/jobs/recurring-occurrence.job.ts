import { BillType, Frequency, IncomeType, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { advance } from '../shared/utils/recurrence.util';
import { startOfTodayUtc, endOfDayUtc } from '../shared/utils/date.util';
import { logger } from '../shared/utils/logger';

/**
 * The daily sweep that materialises recurring income, expense and bill series
 * into real ledger rows.
 *
 * A recurring entry (e.g. a monthly salary or rent) is stored once with
 * `isRecurring = true` and a `frequency`. Without this job income and expenses
 * count in the totals for the single month they were created in and then
 * silently disappear — the dashboard, budgets, reports and cash-flow never see
 * the future months they actually pay out. This job fixes that by creating one
 * occurrence row per period, right back to the series' start date, so *past*
 * months (and the current one) all reflect it.
 *
 * A recurring bill is the same shape in reverse: its one stored row is the
 * first cycle, and each following period needs its own payable row so payment
 * history and reminders continue month after month. Bills materialise up to
 * the **end of next month** (not just today) so next cycle's payable already
 * exists when the reminder sweep runs.
 *
 * Dedupe: generated rows carry `recurringSourceId` (the source series' id)
 * plus the occurrence's own date. The
 * `@@unique([recurringSourceId, date])` constraint on income/expense (and
 * `@@unique([recurringSourceId, dueDate])` on bills) plus `skipDuplicates`
 * make the sweep idempotent — re-running it never double counts a month, even
 * across process restarts.
 *
 * Non-recurring copies are written with `isRecurring = false` so they are
 * treated as ordinary, already-arrived transactions everywhere downstream.
 */

interface RecurringSource<TCreate> {
  id: string;
  date: Date;
  frequency: Frequency | null;
  /** Fields copied verbatim onto every generated occurrence. */
  fields: TCreate;
}

/** All occurrence dates for a source series, skipping ones already materialised. */
const missingDates = (source: RecurringSource<unknown>, materialized: Date[], end: Date): Date[] => {
  const existing = new Set(materialized.map((row) => row.toISOString()));
  const dates: Date[] = [];

  // The source row itself is the first occurrence — never re-create it.
  let cursor = advance(source.date, source.frequency ?? Frequency.MONTHLY);
  if (!cursor) return dates;

  while (cursor <= end) {
    if (!existing.has(cursor.toISOString())) dates.push(cursor);
    cursor = advance(cursor, source.frequency ?? Frequency.MONTHLY) as Date;
  }

  return dates;
};

/**
 * Walks each recurring series once, generating every missing occurrence up to
 * `end`, and writes them in one `createMany` (unique-key safe) per series.
 */
const materializeSeries = async <TCreate>(
  findSources: () => Promise<RecurringSource<TCreate>[]>,
  findMaterialized: () => Promise<{ recurringSourceId: string | null; date: Date }[]>,
  createMany: (sourceId: string, fields: TCreate, dates: Date[]) => Promise<number>,
  end: Date,
): Promise<number> => {
  const [sources, materializedRows] = await Promise.all([findSources(), findMaterialized()]);

  const bySource = new Map<string, Date[]>();
  for (const row of materializedRows) {
    if (!row.recurringSourceId) continue;
    const list = bySource.get(row.recurringSourceId) ?? [];
    list.push(row.date);
    bySource.set(row.recurringSourceId, list);
  }

  let inserted = 0;
  for (const source of sources) {
    // Never materialise on the series' own genesis date, and stop at end.
    const dates = missingDates(source, bySource.get(source.id) ?? [], end);
    if (dates.length === 0) continue;
    inserted += await createMany(source.id, source.fields, dates);
  }

  return inserted;
};

// ─── Income ────────────────────────────────────────────────────────────────

interface IncomeSourceFields {
  familyId: string;
  memberId: string;
  type: IncomeType;
  amount: Prisma.Decimal;
  description: string | null;
  notes: string | null;
}

const findIncomeSources = async (): Promise<RecurringSource<IncomeSourceFields>[]> => {
  const rows = await prisma.income.findMany({
    where: { isRecurring: true, frequency: { not: null } },
    select: {
      id: true,
      date: true,
      frequency: true,
      familyId: true,
      memberId: true,
      type: true,
      amount: true,
      description: true,
      notes: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    frequency: row.frequency,
    fields: {
      familyId: row.familyId,
      memberId: row.memberId,
      type: row.type,
      amount: row.amount,
      description: row.description,
      notes: row.notes,
    },
  }));
};

const findIncomeMaterialized = () =>
  prisma.income.findMany({
    where: { recurringSourceId: { not: null } },
    select: { recurringSourceId: true, date: true },
  });

const createIncomeOccurrences = async (
  sourceId: string,
  fields: IncomeSourceFields,
  dates: Date[],
): Promise<number> => {
  const data = dates.map((date) => ({
    ...fields,
    date,
    isRecurring: false,
    frequency: null,
    recurringSourceId: sourceId,
  }));
  const result = await prisma.income.createMany({ data, skipDuplicates: true });
  return result.count;
};

// ─── Expense ───────────────────────────────────────────────────────────────

interface ExpenseSourceFields {
  familyId: string;
  memberId: string;
  categoryId: string | null;
  amount: Prisma.Decimal;
  description: string;
  notes: string | null;
  tags: string[];
  paymentMethod: string | null;
}

const findExpenseSources = async (): Promise<RecurringSource<ExpenseSourceFields>[]> => {
  const rows = await prisma.expense.findMany({
    where: { isRecurring: true, frequency: { not: null } },
    select: {
      id: true,
      date: true,
      frequency: true,
      familyId: true,
      memberId: true,
      categoryId: true,
      amount: true,
      description: true,
      notes: true,
      tags: true,
      paymentMethod: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    frequency: row.frequency,
    fields: {
      familyId: row.familyId,
      memberId: row.memberId,
      categoryId: row.categoryId,
      amount: row.amount,
      description: row.description,
      notes: row.notes,
      tags: row.tags,
      paymentMethod: row.paymentMethod,
    },
  }));
};

const findExpenseMaterialized = () =>
  prisma.expense.findMany({
    where: { recurringSourceId: { not: null } },
    select: { recurringSourceId: true, date: true },
  });

const createExpenseOccurrences = async (
  sourceId: string,
  fields: ExpenseSourceFields,
  dates: Date[],
): Promise<number> => {
  const data = dates.map((date) => ({
    ...fields,
    date,
    isRecurring: false,
    frequency: null,
    recurringSourceId: sourceId,
  }));
  const result = await prisma.expense.createMany({ data, skipDuplicates: true });
  return result.count;
};

// ─── Bill ──────────────────────────────────────────────────────────────────

interface BillSourceFields {
  familyId: string;
  type: BillType;
  name: string;
  providerName: string | null;
  amount: Prisma.Decimal;
  frequency: Frequency;
  notes: string | null;
}

const findBillSources = async (): Promise<RecurringSource<BillSourceFields>[]> => {
  const rows = await prisma.bill.findMany({
    where: { isRecurring: true },
    select: {
      id: true,
      dueDate: true,
      frequency: true,
      familyId: true,
      type: true,
      name: true,
      providerName: true,
      amount: true,
      notes: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    date: row.dueDate,
    frequency: row.frequency,
    fields: {
      familyId: row.familyId,
      type: row.type,
      name: row.name,
      providerName: row.providerName,
      amount: row.amount,
      frequency: row.frequency,
      notes: row.notes,
    },
  }));
};

const findBillMaterialized = async (): Promise<{ recurringSourceId: string | null; date: Date }[]> => {
  const rows = await prisma.bill.findMany({
    where: { recurringSourceId: { not: null } },
    select: { recurringSourceId: true, dueDate: true },
  });
  // The generic sweep keys materialised rows on `date`; bills keep theirs on `dueDate`.
  return rows.map((row) => ({ recurringSourceId: row.recurringSourceId, date: row.dueDate }));
};

const createBillOccurrences = async (
  sourceId: string,
  fields: BillSourceFields,
  dates: Date[],
): Promise<number> => {
  const data = dates.map((dueDate) => ({
    familyId: fields.familyId,
    type: fields.type,
    name: fields.name,
    providerName: fields.providerName,
    amount: fields.amount,
    frequency: fields.frequency,
    notes: fields.notes,
    dueDate,
    // Each cycle is its own payable; only the source row is "recurring".
    isRecurring: false,
    recurringSourceId: sourceId,
  }));
  const result = await prisma.bill.createMany({ data, skipDuplicates: true });
  return result.count;
};

// ─── Entry point ───────────────────────────────────────────────────────────

export const runRecurringOccurrences = async (): Promise<number> => {
  // Materialise everything from each series' start up to the end of today, so a
  // recurring salary/rent lands in every month it covers — including ones
  // already archived into reports — not just from today forward.
  const end = endOfDayUtc(startOfTodayUtc());

  const insertedIncome = await materializeSeries(
    findIncomeSources,
    findIncomeMaterialized,
    createIncomeOccurrences,
    end,
  );
  const insertedExpense = await materializeSeries(
    findExpenseSources,
    findExpenseMaterialized,
    createExpenseOccurrences,
    end,
  );

  // Bills look one month ahead of today so the next cycle's payable row exists
  // in time for the same morning's reminder sweep.
  const today = new Date();
  const billEnd = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 2, 0, 23, 59, 59, 999),
  );
  const insertedBill = await materializeSeries(
    findBillSources,
    findBillMaterialized,
    createBillOccurrences,
    billEnd,
  );

  const total = insertedIncome + insertedExpense + insertedBill;
  if (total > 0) {
    logger.info(
      `Recurring sweep: ${insertedIncome} income + ${insertedExpense} expense + ${insertedBill} bill occurrence(s) materialised`,
    );
  }
  return total;
};

/** Fire-and-forget wrapper: a failed sweep must never take the process down. */
export const recurringOccurrenceTask = (): void => {
  void runRecurringOccurrences().catch((error) =>
    logger.error('Recurring occurrence job failed', { error }),
  );
};