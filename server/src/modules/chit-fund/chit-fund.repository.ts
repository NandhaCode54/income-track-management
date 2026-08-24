import { PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import type { CreateChitFundInput, RecordChitPaymentInput } from './chit-fund.types';

/**
 * `ChitPayment` carries no `familyId` of its own, so instalments are always
 * reached through their fund (`chitFund: { familyId }`) — the same rule the EMI
 * module applies to its schedule. A foreign payment id is unreachable.
 */

const paymentSelect = {
  id: true,
  amount: true,
  month: true,
  year: true,
  dueDate: true,
  paidDate: true,
  status: true,
  notes: true,
} satisfies Prisma.ChitPaymentSelect;

const fundSelect = {
  id: true,
  name: true,
  organizer: true,
  totalAmount: true,
  monthlyAmount: true,
  totalMembers: true,
  startDate: true,
  endDate: true,
  dueDay: true,
  isActive: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  payments: { select: paymentSelect, orderBy: [{ year: 'asc' }, { month: 'asc' }] },
} satisfies Prisma.ChitFundSelect;

export type ChitFundRow = Prisma.ChitFundGetPayload<{ select: typeof fundSelect }>;
export type ChitPaymentRow = Prisma.ChitPaymentGetPayload<{ select: typeof paymentSelect }>;

export interface WriteChitFundData {
  name: string;
  organizer: string | null;
  totalAmount: Prisma.Decimal;
  monthlyAmount: Prisma.Decimal;
  totalMembers: number;
  startDate: Date;
  endDate: Date;
  dueDay: number;
  notes: string | null;
}

const decimal = (value: number): Prisma.Decimal => new Prisma.Decimal(value.toFixed(2));

export const chitFundRepository = {
  list(familyId: string): Promise<ChitFundRow[]> {
    return prisma.chitFund.findMany({
      where: { familyId },
      orderBy: { startDate: 'desc' },
      select: fundSelect,
    });
  },

  findById(familyId: string, id: string): Promise<ChitFundRow | null> {
    return prisma.chitFund.findFirst({ where: { id, familyId }, select: fundSelect });
  },

  create(familyId: string, input: CreateChitFundInput): Promise<ChitFundRow> {
    const data: WriteChitFundData = {
      name: input.name,
      organizer: input.organizer ?? null,
      totalAmount: decimal(input.totalAmount),
      monthlyAmount: decimal(input.monthlyAmount),
      totalMembers: input.totalMembers,
      startDate: input.startDate,
      endDate: input.endDate,
      dueDay: input.dueDay,
      notes: input.notes ?? null,
    };

    return prisma.chitFund.create({ data: { ...data, familyId }, select: fundSelect });
  },

  /**
   * Records (or re-records) one month's contribution.
   *
   * The upsert is deliberate: a chit month has exactly one row per
   * `(fund, month, year)`, so recording again simply corrects the amount or
   * date rather than stacking duplicates. `paidDate` defaults to **today at UTC
   * midnight**, matching every stored date in the app — a local-time "now"
   * would file the payment on two different dates depending on which side of
   * Greenwich the server sits (the exact bug class fixed across Phases 4–6).
   */
  recordPayment(
    fundId: string,
    input: RecordChitPaymentInput & { dueDate: Date; defaultAmount: Prisma.Decimal },
  ): Promise<ChitPaymentRow> {
    const amount = decimal(input.amount ?? Number(input.defaultAmount));

    return prisma.chitPayment.upsert({
      where: { chitFundId_month_year: { chitFundId: fundId, month: input.month, year: input.year } },
      create: {
        chitFundId: fundId,
        month: input.month,
        year: input.year,
        amount,
        dueDate: input.dueDate,
        paidDate: input.paidDate,
        status: PaymentStatus.PAID,
        notes: input.notes,
      },
      update: {
        amount,
        paidDate: input.paidDate,
        status: PaymentStatus.PAID,
        notes: input.notes,
      },
    });
  },

  delete(id: string): Promise<void> {
    // Payments cascade with the fund — they have no meaning without it.
    return prisma.chitFund.delete({ where: { id } }).then(() => undefined);
  },
};
