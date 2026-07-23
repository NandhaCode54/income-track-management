import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import type { ListIncomeQuery } from './income.types';
import { periodRange } from '../../shared/utils/date.util';

const incomeSelect = {
  id: true,
  type: true,
  amount: true,
  description: true,
  notes: true,
  date: true,
  isRecurring: true,
  frequency: true,
  createdAt: true,
  updatedAt: true,
  memberId: true,
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
} satisfies Prisma.IncomeSelect;

export type IncomeRow = Prisma.IncomeGetPayload<{ select: typeof incomeSelect }>;

export interface WriteIncomeData {
  type: Prisma.IncomeCreateInput['type'];
  amount: Prisma.Decimal;
  date: Date;
  description: string | null;
  notes: string | null;
  isRecurring: boolean;
  frequency: Prisma.IncomeCreateInput['frequency'];
}

/**
 * Every read and write is pinned to `familyId`, which is the only thing keeping
 * one family's ledger out of another's. `findFirst`, not `findUnique`, for id
 * lookups so a foreign id resolves to `null` instead of another family's row.
 */
const scopedWhere = (familyId: string, query: ListIncomeQuery): Prisma.IncomeWhereInput => {
  const where: Prisma.IncomeWhereInput = { familyId };

  if (query.type) where.type = query.type;
  if (query.memberId) where.memberId = query.memberId;
  if (query.isRecurring !== undefined) where.isRecurring = query.isRecurring;

  if (query.from || query.to) {
    where.date = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
  }

  if (query.search) {
    where.OR = [
      { description: { contains: query.search, mode: 'insensitive' } },
      { notes: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return where;
};

export const incomeRepository = {
  /** Shared with the expense and budget modules so a "month" means one thing. */
  periodRange,

  async list(familyId: string, query: ListIncomeQuery) {
    const where = scopedWhere(familyId, query);
    // A second, stable key keeps pagination deterministic when dates tie.
    const orderBy: Prisma.IncomeOrderByWithRelationInput[] =
      query.sortBy === 'createdAt'
        ? [{ createdAt: query.sortOrder }]
        : [{ [query.sortBy]: query.sortOrder }, { createdAt: 'desc' }];

    const [items, total, sum] = await prisma.$transaction([
      prisma.income.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        select: incomeSelect,
      }),
      prisma.income.count({ where }),
      prisma.income.aggregate({ where, _sum: { amount: true } }),
    ]);

    return { items, total, filteredSum: sum._sum.amount ?? new Prisma.Decimal(0) };
  },

  findById(familyId: string, id: string) {
    return prisma.income.findFirst({ where: { id, familyId }, select: incomeSelect });
  },

  create(familyId: string, memberId: string, data: WriteIncomeData) {
    return prisma.income.create({
      data: { ...data, familyId, memberId },
      select: incomeSelect,
    });
  },

  update(id: string, data: Partial<WriteIncomeData> & { memberId?: string }) {
    return prisma.income.update({ where: { id }, data, select: incomeSelect });
  },

  delete(id: string) {
    return prisma.income.delete({ where: { id } });
  },

  listRecurring(familyId: string) {
    return prisma.income.findMany({
      where: { familyId, isRecurring: true },
      orderBy: [{ date: 'desc' }],
      select: incomeSelect,
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

  // ── Aggregations ──────────────────────────────────────────────────────────

  async periodTotals(familyId: string, from: Date, to: Date) {
    const where: Prisma.IncomeWhereInput = { familyId, date: { gte: from, lte: to } };

    const [totals, recurring] = await prisma.$transaction([
      prisma.income.aggregate({
        where,
        _sum: { amount: true },
        _count: { _all: true },
        _max: { amount: true },
      }),
      prisma.income.aggregate({ where: { ...where, isRecurring: true }, _sum: { amount: true } }),
    ]);

    return {
      total: totals._sum.amount ?? new Prisma.Decimal(0),
      count: totals._count._all,
      highest: totals._max.amount ?? new Prisma.Decimal(0),
      recurringTotal: recurring._sum.amount ?? new Prisma.Decimal(0),
    };
  },

  async sumBetween(familyId: string, from: Date, to: Date) {
    const result = await prisma.income.aggregate({
      where: { familyId, date: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    return result._sum.amount ?? new Prisma.Decimal(0);
  },

  groupByType(familyId: string, from: Date, to: Date) {
    return prisma.income.groupBy({
      by: ['type'],
      where: { familyId, date: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: { _all: true },
    });
  },

  async groupByMember(familyId: string, from: Date, to: Date) {
    const grouped = await prisma.income.groupBy({
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

  /**
   * Twelve month-buckets for one calendar year. Grouping happens in SQL so we
   * never pull a whole year of rows into memory just to add them up.
   */
  async monthlyTotals(familyId: string, year: number) {
    const rows = await prisma.$queryRaw<{ month: number; total: Prisma.Decimal }[]>`
      SELECT EXTRACT(MONTH FROM "date")::int AS month, COALESCE(SUM("amount"), 0) AS total
      FROM "incomes"
      WHERE "familyId" = ${familyId}
        AND "date" >= ${periodRange({ year }).from}
        AND "date" <= ${periodRange({ year }).to}
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
