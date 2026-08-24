import { EMIStatus, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import type { ListEmiQuery } from './emi.types';

/**
 * Every read and write is pinned to `familyId`. `EMIPayment` carries no `familyId`
 * of its own, so instalments are always reached **through their loan**
 * (`emi: { familyId }`) — never by their own id alone, which would be the IDOR
 * hole Phase 2 spends its whole guard budget closing.
 */

const paymentSelect = {
  id: true,
  amount: true,
  dueDate: true,
  paidDate: true,
  status: true,
  month: true,
  year: true,
  notes: true,
} satisfies Prisma.EMIPaymentSelect;

const emiSelect = {
  id: true,
  familyId: true,
  name: true,
  lenderName: true,
  loanAmount: true,
  interestRate: true,
  tenureMonths: true,
  monthlyEMI: true,
  startDate: true,
  endDate: true,
  dueDay: true,
  paidMonths: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  payments: { select: paymentSelect, orderBy: { dueDate: 'asc' } },
} satisfies Prisma.EMISelect;

export type EmiRow = Prisma.EMIGetPayload<{ select: typeof emiSelect }>;
export type EmiPaymentRow = Prisma.EMIPaymentGetPayload<{ select: typeof paymentSelect }>;

export interface WriteEmiData {
  name: string;
  lenderName: string | null;
  loanAmount: Prisma.Decimal;
  interestRate: Prisma.Decimal;
  tenureMonths: number;
  monthlyEMI: Prisma.Decimal;
  startDate: Date;
  endDate: Date;
  dueDay: number;
  notes: string | null;
}

/** One scheduled instalment, as generated from the loan's terms. */
export interface ScheduledInstalment {
  amount: Prisma.Decimal;
  dueDate: Date;
  month: number;
  year: number;
}

/** The statuses that still mean money is owed — the same set the dashboard uses. */
export const OPEN_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.PENDING,
  PaymentStatus.OVERDUE,
  PaymentStatus.PARTIAL,
];

const scopedWhere = (familyId: string, query: ListEmiQuery): Prisma.EMIWhereInput => {
  const where: Prisma.EMIWhereInput = { familyId };

  if (query.status) where.status = query.status;

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { lenderName: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return where;
};

export const emiRepository = {
  async list(familyId: string, query: ListEmiQuery) {
    const where = scopedWhere(familyId, query);
    // A second, stable key keeps pagination deterministic when the sort column ties.
    const orderBy: Prisma.EMIOrderByWithRelationInput[] = [
      { [query.sortBy]: query.sortOrder },
      { createdAt: 'desc' },
    ];

    /*
     * All five in one transaction so they see one snapshot — the same reason the
     * income list batches its page, count and sum. A total that disagrees with the
     * rows it sits above is worse than a slower query.
     *
     * `outstanding` is the sum of instalments **not yet settled**: the cash still
     * to leave the account, not the outstanding *principal*. The two differ by all
     * the interest still to accrue, and for a household the cash figure is the one
     * that answers "what are we still on the hook for".
     */
    const [items, total, activeCount, monthlyOutgo, outstanding] = await prisma.$transaction([
      prisma.eMI.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        select: emiSelect,
      }),
      prisma.eMI.count({ where }),
      prisma.eMI.count({ where: { familyId, status: EMIStatus.ACTIVE } }),
      prisma.eMI.aggregate({
        where: { familyId, status: EMIStatus.ACTIVE },
        _sum: { monthlyEMI: true },
      }),
      prisma.eMIPayment.aggregate({
        where: { emi: { familyId }, status: { in: OPEN_PAYMENT_STATUSES } },
        _sum: { amount: true },
      }),
    ]);

    return {
      items,
      total,
      activeCount,
      monthlyOutgo: monthlyOutgo._sum.monthlyEMI ?? new Prisma.Decimal(0),
      outstanding: outstanding._sum.amount ?? new Prisma.Decimal(0),
    };
  },

  /** `findFirst`, not `findUnique`, so a foreign id resolves to `null` rather than another family's loan. */
  findById(familyId: string, id: string) {
    return prisma.eMI.findFirst({ where: { id, familyId }, select: emiSelect });
  },

  /**
   * The loan and its whole schedule, written atomically.
   *
   * A loan without its instalments is not a lesser version of a loan — it is a
   * broken one: nothing would be due, the dashboard would show no obligation, and
   * the reminder job would have nothing to fire on. So both land or neither does.
   */
  create(familyId: string, data: WriteEmiData, schedule: ScheduledInstalment[]) {
    return prisma.eMI.create({
      data: {
        ...data,
        familyId,
        payments: { createMany: { data: schedule } },
      },
      select: emiSelect,
    });
  },

  update(id: string, data: Partial<WriteEmiData> & { status?: EMIStatus }) {
    return prisma.eMI.update({ where: { id }, data, select: emiSelect });
  },

  /**
   * Rewrites the schedule after a change of terms. Only ever called when nothing
   * has been paid (`emi.service.assertTermsEditable`), so no settled instalment
   * can be destroyed here.
   */
  async replaceSchedule(
    id: string,
    data: Partial<WriteEmiData>,
    schedule: ScheduledInstalment[],
  ): Promise<EmiRow> {
    const [, , emi] = await prisma.$transaction([
      prisma.eMIPayment.deleteMany({ where: { emiId: id } }),
      prisma.eMIPayment.createMany({ data: schedule.map((row) => ({ ...row, emiId: id })) }),
      prisma.eMI.update({ where: { id }, data: { ...data, paidMonths: 0 }, select: emiSelect }),
    ]);

    return emi;
  },

  /** `EMIPayment` cascades on the loan, so the schedule goes with it. */
  delete(id: string) {
    return prisma.eMI.delete({ where: { id } });
  },

  // ── Instalments ───────────────────────────────────────────────────────────

  /** Scoped through the relation, since an instalment has no `familyId` of its own. */
  findPayment(familyId: string, emiId: string, month: number, year: number) {
    return prisma.eMIPayment.findFirst({
      where: { emiId, month, year, emi: { familyId } },
      select: paymentSelect,
    });
  },

  listPayments(emiId: string) {
    return prisma.eMIPayment.findMany({
      where: { emiId },
      orderBy: { dueDate: 'asc' },
      select: paymentSelect,
    });
  },

  /**
   * Settles one instalment and re-derives the loan's headline state in the same
   * transaction.
   *
   * `paidMonths` is a denormalised counter and `status` depends on it, so both are
   * recomputed from the rows rather than incremented — an increment drifts the
   * moment a payment is corrected, and the count is a single indexed query.
   */
  async recordPayment(
    emiId: string,
    paymentId: string,
    data: {
      amount: Prisma.Decimal;
      paidDate: Date | null;
      status: PaymentStatus;
      notes?: string | null;
    },
    tenureMonths: number,
  ): Promise<EmiRow> {
    return prisma.$transaction(async (tx) => {
      await tx.eMIPayment.update({ where: { id: paymentId }, data });

      const settled = await tx.eMIPayment.count({
        where: { emiId, status: { in: [PaymentStatus.PAID, PaymentStatus.WAIVED] } },
      });

      const current = await tx.eMI.findUniqueOrThrow({
        where: { id: emiId },
        select: { status: true },
      });

      /*
       * A loan closes itself when the last instalment settles, and re-opens if one
       * is later corrected back to unpaid. Only ACTIVE ⇄ COMPLETED is automatic:
       * DEFAULTED and FORECLOSED are judgements a person makes, and silently
       * clearing either because the arithmetic came out even would erase that.
       */
      const isDone = settled >= tenureMonths;
      const status =
        isDone && current.status === EMIStatus.ACTIVE
          ? EMIStatus.COMPLETED
          : !isDone && current.status === EMIStatus.COMPLETED
            ? EMIStatus.ACTIVE
            : current.status;

      return tx.eMI.update({
        where: { id: emiId },
        data: { paidMonths: settled, status },
        select: emiSelect,
      });
    });
  },

  /** Open instalments falling due inside a window, for this family. */
  upcoming(familyId: string, from: Date, to: Date) {
    return prisma.eMIPayment.findMany({
      where: {
        emi: { familyId, status: EMIStatus.ACTIVE },
        dueDate: { gte: from, lte: to },
        status: { in: OPEN_PAYMENT_STATUSES },
      },
      orderBy: [{ dueDate: 'asc' }, { amount: 'desc' }],
      select: {
        ...paymentSelect,
        emi: { select: { id: true, name: true, lenderName: true } },
      },
    });
  },

  // ── Cross-family, for the scheduled job only ──────────────────────────────

  /**
   * Instalments still `PENDING` after their due date, across **every** family.
   *
   * Deliberately unscoped: a cron job has no request, no actor and no active
   * workspace. That is exactly why it lives in a separate, clearly-labelled
   * section — nothing reachable from a route may call these.
   */
  markOverdue(before: Date) {
    return prisma.eMIPayment.updateMany({
      where: { dueDate: { lt: before }, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.OVERDUE },
    });
  },

  /** Instalments due inside a window across every family, for the reminder job. */
  dueForReminder(from: Date, to: Date) {
    return prisma.eMIPayment.findMany({
      where: {
        dueDate: { gte: from, lte: to },
        status: { in: OPEN_PAYMENT_STATUSES },
        emi: { status: EMIStatus.ACTIVE },
      },
      orderBy: { dueDate: 'asc' },
      select: {
        ...paymentSelect,
        emi: { select: { id: true, familyId: true, name: true, lenderName: true } },
      },
    });
  },
};
