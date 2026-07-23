import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { MAX_EXPORT_ROWS, type ExpenseSummaryQuery, type ListExpenseQuery } from './expense.types';

const expenseSelect = {
  id: true,
  amount: true,
  description: true,
  notes: true,
  date: true,
  tags: true,
  paymentMethod: true,
  isRecurring: true,
  frequency: true,
  createdAt: true,
  updatedAt: true,
  memberId: true,
  categoryId: true,
  familyId: true,
  member: {
    select: {
      id: true,
      isActive: true,
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
      },
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      icon: true,
      color: true,
      parent: { select: { name: true } },
    },
  },
  receipts: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      url: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
      createdAt: true,
    },
  },
} satisfies Prisma.ExpenseSelect;

export type ExpenseRow = Prisma.ExpenseGetPayload<{ select: typeof expenseSelect }>;

export interface WriteExpenseData {
  amount: Prisma.Decimal;
  description: string;
  date: Date;
  categoryId: string | null;
  paymentMethod: string | null;
  tags: string[];
  notes: string | null;
  isRecurring: boolean;
  frequency: Prisma.ExpenseCreateInput['frequency'];
}

/**
 * Every read and write is pinned to `familyId`, which is the only thing keeping
 * one family's ledger out of another's. `findFirst`, not `findUnique`, for id
 * lookups so a foreign id resolves to `null` instead of another family's row.
 */
const scopedWhere = (
  familyId: string,
  query: Omit<ListExpenseQuery, 'page' | 'perPage' | 'sortBy' | 'sortOrder'>,
): Prisma.ExpenseWhereInput => {
  const where: Prisma.ExpenseWhereInput = { familyId };

  if (query.memberId) where.memberId = query.memberId;
  if (query.paymentMethod) where.paymentMethod = query.paymentMethod;
  if (query.isRecurring !== undefined) where.isRecurring = query.isRecurring;

  // "Uncategorized" wins over a category filter — asking for both is contradictory,
  // and the explicit flag is the more specific request.
  if (query.uncategorized) {
    where.categoryId = null;
  } else if (query.categoryId) {
    // Selecting a parent category includes everything filed under its children,
    // otherwise "Food & Dining" would report nothing once subcategories exist.
    where.OR = [{ categoryId: query.categoryId }, { category: { parentId: query.categoryId } }];
  }

  if (query.tag) where.tags = { has: query.tag };

  if (query.from || query.to) {
    where.date = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
  }

  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    where.amount = {
      ...(query.minAmount !== undefined ? { gte: new Prisma.Decimal(query.minAmount) } : {}),
      ...(query.maxAmount !== undefined ? { lte: new Prisma.Decimal(query.maxAmount) } : {}),
    };
  }

  if (query.search) {
    const contains = { contains: query.search, mode: 'insensitive' as const };
    const matches: Prisma.ExpenseWhereInput[] = [
      { description: contains },
      { notes: contains },
      { tags: { has: query.search } },
    ];
    // `OR` may already hold the category expansion above, so the two are combined
    // under `AND` rather than one silently overwriting the other.
    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: matches }];
      delete where.OR;
    } else {
      where.OR = matches;
    }
  }

  return where;
};

const orderFor = (
  sortBy: ListExpenseQuery['sortBy'],
  sortOrder: ListExpenseQuery['sortOrder'],
): Prisma.ExpenseOrderByWithRelationInput[] =>
  // A second, stable key keeps pagination deterministic when dates tie.
  sortBy === 'createdAt' ? [{ createdAt: sortOrder }] : [{ [sortBy]: sortOrder }, { createdAt: 'desc' }];

/** A summary window: a single month, or the whole year when `month` is omitted. */
const periodRange = (query: ExpenseSummaryQuery): { from: Date; to: Date } => {
  const from = query.month ? new Date(query.year, query.month - 1, 1) : new Date(query.year, 0, 1);
  const to = query.month
    ? new Date(query.year, query.month, 0, 23, 59, 59, 999)
    : new Date(query.year, 11, 31, 23, 59, 59, 999);
  return { from, to };
};

export const expenseRepository = {
  periodRange,

  async list(familyId: string, query: ListExpenseQuery) {
    const where = scopedWhere(familyId, query);

    const [items, total, sum] = await prisma.$transaction([
      prisma.expense.findMany({
        where,
        orderBy: orderFor(query.sortBy, query.sortOrder),
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        select: expenseSelect,
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    return { items, total, filteredSum: sum._sum.amount ?? new Prisma.Decimal(0) };
  },

  /** The same filtered set as `list`, unpaginated but hard-capped, for CSV export. */
  listForExport(familyId: string, query: Omit<ListExpenseQuery, 'page' | 'perPage'>) {
    return prisma.expense.findMany({
      where: scopedWhere(familyId, query),
      orderBy: orderFor(query.sortBy, query.sortOrder),
      take: MAX_EXPORT_ROWS,
      select: expenseSelect,
    });
  },

  countMatching(familyId: string, query: Omit<ListExpenseQuery, 'page' | 'perPage'>) {
    return prisma.expense.count({ where: scopedWhere(familyId, query) });
  },

  findById(familyId: string, id: string) {
    return prisma.expense.findFirst({ where: { id, familyId }, select: expenseSelect });
  },

  create(familyId: string, memberId: string, data: WriteExpenseData) {
    return prisma.expense.create({
      data: { ...data, familyId, memberId },
      select: expenseSelect,
    });
  },

  createMany(rows: (WriteExpenseData & { familyId: string; memberId: string })[]) {
    return prisma.expense.createMany({ data: rows });
  },

  update(id: string, data: Partial<WriteExpenseData> & { memberId?: string }) {
    return prisma.expense.update({ where: { id }, data, select: expenseSelect });
  },

  delete(id: string) {
    return prisma.expense.delete({ where: { id } });
  },

  listRecurring(familyId: string) {
    return prisma.expense.findMany({
      where: { familyId, isRecurring: true },
      orderBy: [{ date: 'desc' }],
      select: expenseSelect,
    });
  },

  /** Confirms a target member belongs to this family before an entry is attributed to them. */
  findFamilyMember(familyId: string, memberId: string) {
    return prisma.familyMember.findFirst({
      where: { id: memberId, familyId },
      select: {
        id: true,
        isActive: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
  },

  // ── Receipts ──────────────────────────────────────────────────────────────

  countReceipts(expenseId: string) {
    return prisma.receipt.count({ where: { expenseId } });
  },

  addReceipt(data: {
    familyId: string;
    expenseId: string;
    url: string;
    cloudinaryId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }) {
    return prisma.receipt.create({ data });
  },

  /** Scoped by family *and* expense so a foreign receipt id resolves to `null`. */
  findReceipt(familyId: string, expenseId: string, receiptId: string) {
    return prisma.receipt.findFirst({ where: { id: receiptId, expenseId, familyId } });
  },

  listReceiptsForExpense(expenseId: string) {
    return prisma.receipt.findMany({ where: { expenseId } });
  },

  deleteReceipt(id: string) {
    return prisma.receipt.delete({ where: { id } });
  },

  // ── Aggregations ──────────────────────────────────────────────────────────

  async periodTotals(familyId: string, from: Date, to: Date) {
    const where: Prisma.ExpenseWhereInput = { familyId, date: { gte: from, lte: to } };

    const [totals, recurring] = await prisma.$transaction([
      prisma.expense.aggregate({
        where,
        _sum: { amount: true },
        _count: { _all: true },
        _max: { amount: true },
      }),
      prisma.expense.aggregate({ where: { ...where, isRecurring: true }, _sum: { amount: true } }),
    ]);

    return {
      total: totals._sum.amount ?? new Prisma.Decimal(0),
      count: totals._count._all,
      highest: totals._max.amount ?? new Prisma.Decimal(0),
      recurringTotal: recurring._sum.amount ?? new Prisma.Decimal(0),
    };
  },

  async sumBetween(familyId: string, from: Date, to: Date) {
    const result = await prisma.expense.aggregate({
      where: { familyId, date: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    return result._sum.amount ?? new Prisma.Decimal(0);
  },

  /**
   * Grouped by the category actually stored on the row, then hydrated with the
   * category's name and colour. Rows whose category was deleted group under the
   * `null` key, which the service labels "Uncategorised".
   */
  async groupByCategory(familyId: string, from: Date, to: Date) {
    const grouped = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: { familyId, date: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const ids = grouped.map((row) => row.categoryId).filter((id): id is string => id !== null);
    const categories = ids.length
      ? await prisma.expenseCategory.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, color: true, parent: { select: { name: true } } },
        })
      : [];

    return grouped.map((row) => ({
      ...row,
      category: categories.find((category) => category.id === row.categoryId) ?? null,
    }));
  },

  async groupByMember(familyId: string, from: Date, to: Date) {
    const grouped = await prisma.expense.groupBy({
      by: ['memberId'],
      where: { familyId, date: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const members = await prisma.familyMember.findMany({
      where: { id: { in: grouped.map((row) => row.memberId) } },
      select: { id: true, user: { select: { firstName: true, lastName: true } } },
    });

    return grouped.map((row) => ({
      ...row,
      member: members.find((member) => member.id === row.memberId) ?? null,
    }));
  },

  groupByPaymentMethod(familyId: string, from: Date, to: Date) {
    return prisma.expense.groupBy({
      by: ['paymentMethod'],
      where: { familyId, date: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: { _all: true },
    });
  },

  topExpenses(familyId: string, from: Date, to: Date, take = 5) {
    return prisma.expense.findMany({
      where: { familyId, date: { gte: from, lte: to } },
      orderBy: [{ amount: 'desc' }, { date: 'desc' }],
      take,
      select: {
        id: true,
        description: true,
        amount: true,
        date: true,
        category: { select: { name: true } },
      },
    });
  },

  /**
   * Twelve month-buckets for one calendar year. Grouping happens in SQL so we
   * never pull a whole year of rows into memory just to add them up.
   */
  async monthlyTotals(familyId: string, year: number) {
    const rows = await prisma.$queryRaw<{ month: number; total: Prisma.Decimal }[]>`
      SELECT EXTRACT(MONTH FROM "date")::int AS month, COALESCE(SUM("amount"), 0) AS total
      FROM "expenses"
      WHERE "familyId" = ${familyId}
        AND "date" >= ${new Date(year, 0, 1)}
        AND "date" <= ${new Date(year, 11, 31, 23, 59, 59, 999)}
      GROUP BY 1
      ORDER BY 1
    `;

    return Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      // Raw queries bypass Prisma's type mapping, so normalise whatever the driver returns.
      total: new Prisma.Decimal(rows.find((row) => row.month === index + 1)?.total ?? 0),
    }));
  },
};
