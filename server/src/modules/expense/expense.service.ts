import { Frequency, Prisma, UserRole } from '@prisma/client';
import { expenseRepository, type ExpenseRow, type WriteExpenseData } from './expense.repository';
import { categoryRepository } from './category.repository';
import { runBudgetCheck } from '../budget/budget.alert';
import { EXPENSE_CSV_HEADERS, readImportRows, toCsvRow } from './expense.csv';
import {
  MAX_IMPORT_ROWS,
  MAX_RECEIPTS_PER_EXPENSE,
  type CreateExpenseInput,
  type ExpenseBreakdownDto,
  type ExpenseDto,
  type ExpenseListResult,
  type ExpenseSummaryDto,
  type ExpenseSummaryQuery,
  type ImportExpensesOptions,
  type ImportResultDto,
  type ListExpenseQuery,
  type PaymentMethod,
  type ReceiptDto,
  type UpdateExpenseInput,
} from './expense.types';
import type { ActorContext } from '../../shared/types/actor';
import { hasRoleOrAbove } from '../../shared/constants/roles';
import { nextOccurrence } from '../../shared/utils/recurrence.util';
import { toCsv } from '../../shared/utils/csv.util';
import {
  deleteFromCloudinary,
  uploadBufferToCloudinary,
} from '../../shared/utils/cloudinary.util';
import { monthOf } from '../../shared/utils/date.util';
import { logger } from '../../shared/utils/logger';
import { ForbiddenError } from '../../shared/errors/AuthError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { ValidationError } from '../../shared/errors/ValidationError';
import { MSG } from '../../shared/constants/messages';

/** Money crosses the wire as a plain number; two decimals always fit a JS float exactly. */
const toNumber = (value: Prisma.Decimal): number => Number(value.toFixed(2));

const round2 = (value: number): number => Math.round(value * 100) / 100;

const percentOf = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  UPI: 'UPI',
  NET_BANKING: 'Net banking',
  BANK_TRANSFER: 'Bank transfer',
  WALLET: 'Wallet',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
};

const UNCATEGORISED_LABEL = 'Uncategorised';

/** Heads and owners keep the family ledger; members only touch their own rows. */
const isLedgerManager = (role: UserRole): boolean => hasRoleOrAbove(role, UserRole.FAMILY_HEAD);

const toReceiptDto = (receipt: ExpenseRow['receipts'][number]): ReceiptDto => ({
  id: receipt.id,
  url: receipt.url,
  fileName: receipt.fileName,
  fileSize: receipt.fileSize,
  mimeType: receipt.mimeType,
  createdAt: receipt.createdAt,
});

const toDto = (row: ExpenseRow, actorMemberId: string): ExpenseDto => ({
  id: row.id,
  amount: toNumber(row.amount),
  description: row.description,
  date: row.date,
  notes: row.notes,
  paymentMethod: (row.paymentMethod as PaymentMethod | null) ?? null,
  tags: row.tags,
  isRecurring: row.isRecurring,
  frequency: row.frequency,
  nextOccurrence:
    row.isRecurring && row.frequency ? nextOccurrence(row.date, row.frequency) : null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  category: row.category
    ? {
        id: row.category.id,
        name: row.category.name,
        icon: row.category.icon,
        color: row.category.color,
        parentName: row.category.parent?.name ?? null,
      }
    : null,
  member: {
    id: row.member.id,
    firstName: row.member.user.firstName,
    lastName: row.member.user.lastName,
    email: row.member.user.email,
    avatar: row.member.user.avatar,
    isActive: row.member.isActive,
  },
  receipts: row.receipts.map(toReceiptDto),
  isOwn: row.memberId === actorMemberId,
});

/**
 * Members may add and edit their own expenses; changing or deleting someone
 * else's entry is reserved for family heads and the workspace owner. This
 * mirrors the role hierarchy — the route-level `requirePermission` only gates
 * the coarse verb.
 */
const assertCanMutate = (actor: ActorContext, row: ExpenseRow): void => {
  if (row.memberId === actor.memberId) return;
  if (isLedgerManager(actor.role)) return;
  throw new ForbiddenError(MSG.EXPENSE_NOT_YOURS);
};

/**
 * Resolves who an entry is attributed to. Defaults to the caller; only a ledger
 * manager may name someone else, and only an active member of the same family.
 */
const resolveOwner = async (actor: ActorContext, memberId?: string): Promise<string> => {
  if (!memberId || memberId === actor.memberId) return actor.memberId;

  if (!isLedgerManager(actor.role)) {
    throw new ForbiddenError(MSG.EXPENSE_MEMBER_NOT_ALLOWED);
  }

  const member = await expenseRepository.findFamilyMember(actor.familyId, memberId);
  if (!member) throw new NotFoundError('Member');
  if (!member.isActive) {
    throw new ValidationError(MSG.VALIDATION_ERROR, {
      memberId: [MSG.EXPENSE_MEMBER_INACTIVE],
    });
  }

  return member.id;
};

/** A category id from the request body is only trusted once it is found *in this family*. */
const resolveCategory = async (familyId: string, categoryId?: string): Promise<string | null> => {
  if (!categoryId) return null;

  const category = await categoryRepository.findById(familyId, categoryId);
  if (!category) throw new NotFoundError('Category');

  return category.id;
};

/**
 * `isRecurring` and `frequency` must agree *after* a partial update is merged in,
 * which the request-level validator cannot see. A one-off always stores `ONCE`.
 */
const resolveRecurrence = (
  input: { isRecurring?: boolean; frequency?: Frequency },
  current?: { isRecurring: boolean; frequency: Frequency | null },
): { isRecurring: boolean; frequency: Frequency } => {
  const isRecurring = input.isRecurring ?? current?.isRecurring ?? false;

  if (!isRecurring) return { isRecurring: false, frequency: Frequency.ONCE };

  const frequency = input.frequency ?? current?.frequency ?? undefined;
  if (!frequency || frequency === Frequency.ONCE) {
    throw new ValidationError(MSG.VALIDATION_ERROR, {
      frequency: [MSG.EXPENSE_FREQUENCY_REQUIRED],
    });
  }

  return { isRecurring: true, frequency };
};

const toWriteData = (
  input: CreateExpenseInput | UpdateExpenseInput,
  recurrence: { isRecurring: boolean; frequency: Frequency },
): Partial<WriteExpenseData> => {
  const data: Partial<WriteExpenseData> = {
    isRecurring: recurrence.isRecurring,
    frequency: recurrence.frequency,
  };

  if (input.amount !== undefined) data.amount = new Prisma.Decimal(input.amount.toFixed(2));
  if (input.description !== undefined) data.description = input.description;
  if (input.date !== undefined) data.date = input.date;
  if (input.tags !== undefined) data.tags = input.tags;
  // `undefined` in the payload means "not supplied"; a cleared field arrives as ''.
  if ('notes' in input) data.notes = input.notes ?? null;
  if ('paymentMethod' in input) data.paymentMethod = input.paymentMethod ?? null;

  return data;
};

/**
 * Best-effort cleanup of the Cloudinary assets behind a set of receipts. The DB
 * rows go with the expense via `onDelete: Cascade`; without this the images
 * would linger in the account forever. A failure here must not fail the delete —
 * a stranded asset is a far smaller problem than an expense that refuses to go.
 */
const destroyAssets = async (publicIds: string[]): Promise<void> => {
  await Promise.all(
    publicIds.map((publicId) =>
      deleteFromCloudinary(publicId).catch((error) =>
        logger.warn(`Failed to remove Cloudinary asset ${publicId}`, { error }),
      ),
    ),
  );
};

export const expenseService = {
  async list(actor: ActorContext, query: ListExpenseQuery): Promise<ExpenseListResult> {
    const { items, total, filteredSum } = await expenseRepository.list(actor.familyId, query);
    return {
      items: items.map((row) => toDto(row, actor.memberId)),
      total,
      filteredTotal: toNumber(filteredSum),
    };
  },

  async getById(actor: ActorContext, id: string): Promise<ExpenseDto> {
    const row = await expenseRepository.findById(actor.familyId, id);
    if (!row) throw new NotFoundError('Expense');
    return toDto(row, actor.memberId);
  },

  async create(actor: ActorContext, input: CreateExpenseInput): Promise<ExpenseDto> {
    const [memberId, categoryId] = await Promise.all([
      resolveOwner(actor, input.memberId),
      resolveCategory(actor.familyId, input.categoryId),
    ]);
    const recurrence = resolveRecurrence(input);

    const row = await expenseRepository.create(actor.familyId, memberId, {
      ...(toWriteData(input, recurrence) as WriteExpenseData),
      categoryId,
      tags: input.tags ?? [],
    });

    runBudgetCheck({ familyId: actor.familyId, categoryId, ...monthOf(row.date) });

    return toDto(row, actor.memberId);
  },

  async update(actor: ActorContext, id: string, input: UpdateExpenseInput): Promise<ExpenseDto> {
    const existing = await expenseRepository.findById(actor.familyId, id);
    if (!existing) throw new NotFoundError('Expense');
    assertCanMutate(actor, existing);

    const recurrence = resolveRecurrence(input, existing);
    const data = toWriteData(input, recurrence);

    // An absent key leaves the category alone; an explicit empty one clears it.
    if ('categoryId' in input) {
      data.categoryId = await resolveCategory(actor.familyId, input.categoryId);
    }

    // Re-attributing an entry is itself a ledger-manager action.
    const memberId =
      input.memberId && input.memberId !== existing.memberId
        ? await resolveOwner(actor, input.memberId)
        : undefined;

    const row = await expenseRepository.update(existing.id, { ...data, memberId });

    // Only the category the expense now sits in needs re-checking. Moving it
    // out of another one, or lowering the amount, can only reduce a line's
    // spend — and a line that drops back under its limit raises nothing.
    runBudgetCheck({
      familyId: actor.familyId,
      categoryId: row.categoryId,
      ...monthOf(row.date),
    });

    return toDto(row, actor.memberId);
  },

  async remove(actor: ActorContext, id: string): Promise<void> {
    const existing = await expenseRepository.findById(actor.familyId, id);
    if (!existing) throw new NotFoundError('Expense');
    assertCanMutate(actor, existing);

    const receipts = await expenseRepository.listReceiptsForExpense(existing.id);
    await expenseRepository.delete(existing.id);
    await destroyAssets(receipts.map((receipt) => receipt.cloudinaryId));
  },

  /** Recurring entries with their next derived due date, soonest first. */
  async listRecurring(actor: ActorContext): Promise<ExpenseDto[]> {
    const rows = await expenseRepository.listRecurring(actor.familyId);
    return rows
      .map((row) => toDto(row, actor.memberId))
      .sort((a, b) => {
        if (!a.nextOccurrence) return 1;
        if (!b.nextOccurrence) return -1;
        return a.nextOccurrence.getTime() - b.nextOccurrence.getTime();
      });
  },

  async summary(actor: ActorContext, query: ExpenseSummaryQuery): Promise<ExpenseSummaryDto> {
    const { familyId } = actor;
    const { from, to } = expenseRepository.periodRange(query);

    // The same-length window immediately before this one — last month, or last year.
    const previous = query.month
      ? expenseRepository.periodRange(
          query.month === 1
            ? { year: query.year - 1, month: 12 }
            : { year: query.year, month: query.month - 1 },
        )
      : expenseRepository.periodRange({ year: query.year - 1 });

    const [totals, previousSum, byCategory, byMember, byMethod, monthly, top] = await Promise.all([
      expenseRepository.periodTotals(familyId, from, to),
      expenseRepository.sumBetween(familyId, previous.from, previous.to),
      expenseRepository.groupByCategory(familyId, from, to),
      expenseRepository.groupByMember(familyId, from, to),
      expenseRepository.groupByPaymentMethod(familyId, from, to),
      expenseRepository.monthlyTotals(familyId, query.year),
      expenseRepository.topExpenses(familyId, from, to),
    ]);

    const total = toNumber(totals.total);
    const previousTotal = toNumber(previousSum);

    const breakdown = <T>(
      rows: T[],
      pick: (row: T) => { key: string; label: string; color?: string | null },
      amountOf: (row: T) => Prisma.Decimal | null,
      countOf: (row: T) => number,
    ): ExpenseBreakdownDto[] =>
      rows
        .map((row) => {
          const rowTotal = toNumber(amountOf(row) ?? new Prisma.Decimal(0));
          return { ...pick(row), total: rowTotal, count: countOf(row), percentage: percentOf(rowTotal, total) };
        })
        .sort((a, b) => b.total - a.total);

    return {
      period: { year: query.year, month: query.month ?? null, from, to },
      total,
      count: totals.count,
      average: totals.count === 0 ? 0 : round2(total / totals.count),
      highest: toNumber(totals.highest),
      previousTotal,
      // Growth from zero is undefined, not infinite — the UI hides the badge.
      changePercent: previousTotal === 0 ? null : percentOf(total - previousTotal, previousTotal),
      byCategory: breakdown(
        byCategory,
        (row) => ({
          key: row.categoryId ?? 'uncategorised',
          label: row.category
            ? row.category.parent
              ? `${row.category.parent.name} › ${row.category.name}`
              : row.category.name
            : UNCATEGORISED_LABEL,
          color: row.category?.color ?? null,
        }),
        (row) => row._sum.amount,
        (row) => row._count._all,
      ),
      byMember: breakdown(
        byMember,
        (row) => ({
          key: row.memberId,
          label: row.member
            ? `${row.member.user.firstName} ${row.member.user.lastName}`
            : 'Former member',
        }),
        (row) => row._sum.amount,
        (row) => row._count._all,
      ),
      byPaymentMethod: breakdown(
        byMethod,
        (row) => ({
          key: row.paymentMethod ?? 'UNSPECIFIED',
          label: row.paymentMethod
            ? (PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod)
            : 'Not recorded',
        }),
        (row) => row._sum.amount,
        (row) => row._count._all,
      ),
      monthlyTrend: monthly.map((row) => ({ month: row.month, total: toNumber(row.total) })),
      topExpenses: top.map((row) => ({
        id: row.id,
        description: row.description,
        amount: toNumber(row.amount),
        date: row.date,
        categoryName: row.category?.name ?? null,
      })),
      recurringTotal: toNumber(totals.recurringTotal),
    };
  },

  // ── CSV ───────────────────────────────────────────────────────────────────

  /**
   * Exports exactly what the caller's current filters match, so "export" means
   * "give me what I am looking at" rather than "give me everything".
   */
  async exportCsv(
    actor: ActorContext,
    query: Omit<ListExpenseQuery, 'page' | 'perPage'>,
  ): Promise<{ csv: string; rowCount: number; totalMatching: number }> {
    const [rows, totalMatching] = await Promise.all([
      expenseRepository.listForExport(actor.familyId, query),
      expenseRepository.countMatching(actor.familyId, query),
    ]);

    const items = rows.map((row) => toDto(row, actor.memberId));

    return {
      csv: toCsv(EXPENSE_CSV_HEADERS, items.map(toCsvRow)),
      rowCount: items.length,
      totalMatching,
    };
  },

  /**
   * Imports a CSV of expenses, attributing every row to the caller. Valid rows
   * are written even when others fail — a partial import plus a precise list of
   * what was rejected is far more useful than an all-or-nothing refusal.
   *
   * Note: budget alerts are deliberately **not** raised per imported row. A
   * thousand rows across a year of categories would mean hundreds of background
   * checks for warnings nobody reads one at a time; the budget page shows the
   * resulting position immediately instead.
   */
  async importCsv(
    actor: ActorContext,
    fileContents: string,
    options: ImportExpensesOptions,
  ): Promise<ImportResultDto> {
    const { rows, errors, hasRequiredColumns } = readImportRows(fileContents);

    if (!hasRequiredColumns) {
      throw new ValidationError(MSG.VALIDATION_ERROR, { file: [MSG.EXPENSE_IMPORT_HEADERS] });
    }
    if (rows.length === 0 && errors.length === 0) {
      throw new ValidationError(MSG.VALIDATION_ERROR, { file: [MSG.EXPENSE_IMPORT_EMPTY] });
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new ValidationError(MSG.VALIDATION_ERROR, { file: [MSG.EXPENSE_IMPORT_TOO_LARGE] });
    }

    // Our own export writes "Parent > Child"; only the leaf names a category.
    const leafName = (name: string): string => (name.split('>').pop() ?? name).trim();

    const wanted = new Map<string, string>();
    rows.forEach((row) => {
      if (!row.categoryName) return;
      const name = leafName(row.categoryName);
      if (name) wanted.set(name.toLowerCase(), name);
    });

    const existing = await categoryRepository.listAll(actor.familyId);
    const byName = new Map(existing.map((category) => [category.name.toLowerCase(), category.id]));

    const missing = [...wanted.entries()]
      .filter(([key]) => !byName.has(key))
      .map(([, name]) => name);

    const createdCategories: string[] = [];
    if (options.createMissingCategories && missing.length > 0) {
      await categoryRepository.createManyByName(actor.familyId, missing);
      const refreshed = await categoryRepository.listAll(actor.familyId);
      refreshed.forEach((category) => byName.set(category.name.toLowerCase(), category.id));
      createdCategories.push(...missing);
    }

    const created = await expenseRepository.createMany(
      rows.map((row) => ({
        familyId: actor.familyId,
        memberId: actor.memberId,
        amount: new Prisma.Decimal(row.amount.toFixed(2)),
        description: row.description,
        date: row.date,
        categoryId: row.categoryName
          ? (byName.get(leafName(row.categoryName).toLowerCase()) ?? null)
          : null,
        paymentMethod: row.paymentMethod,
        tags: row.tags,
        notes: row.notes,
        isRecurring: false,
        frequency: Frequency.ONCE,
      })),
    );

    return {
      imported: created.count,
      skipped: errors.length,
      createdCategories,
      errors,
    };
  },

  // ── Receipts ──────────────────────────────────────────────────────────────

  async addReceipt(
    actor: ActorContext,
    expenseId: string,
    file: Express.Multer.File,
  ): Promise<ReceiptDto> {
    const expense = await expenseRepository.findById(actor.familyId, expenseId);
    if (!expense) throw new NotFoundError('Expense');
    assertCanMutate(actor, expense);

    const count = await expenseRepository.countReceipts(expense.id);
    if (count >= MAX_RECEIPTS_PER_EXPENSE) {
      throw new ValidationError(MSG.VALIDATION_ERROR, { receipt: [MSG.RECEIPT_LIMIT] });
    }

    // Foldered per family so one workspace's receipts are never mixed with another's.
    const asset = await uploadBufferToCloudinary(file.buffer, `receipts/${actor.familyId}`);

    const receipt = await expenseRepository.addReceipt({
      familyId: actor.familyId,
      expenseId: expense.id,
      url: asset.url,
      cloudinaryId: asset.publicId,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    return toReceiptDto(receipt);
  },

  async removeReceipt(actor: ActorContext, expenseId: string, receiptId: string): Promise<void> {
    const expense = await expenseRepository.findById(actor.familyId, expenseId);
    if (!expense) throw new NotFoundError('Expense');
    assertCanMutate(actor, expense);

    const receipt = await expenseRepository.findReceipt(actor.familyId, expense.id, receiptId);
    if (!receipt) throw new NotFoundError('Receipt');

    await expenseRepository.deleteReceipt(receipt.id);
    await destroyAssets([receipt.cloudinaryId]);
  },
};
