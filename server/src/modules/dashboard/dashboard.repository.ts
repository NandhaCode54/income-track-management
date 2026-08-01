import { EMIStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../../config/database';

/**
 * The dashboard reads across the whole workspace, so most of its aggregation
 * already exists: income, expense and budget totals come from those modules'
 * repositories. What lives here is only what nothing else owns — the four
 * obligation tables behind "upcoming payments", and the member roster.
 */

/**
 * The statuses that still mean money is owed. `PAID` and `WAIVED` are settled;
 * `PARTIAL` is not — a half-paid bill still needs the rest.
 */
const OPEN_STATUSES: PaymentStatus[] = [
  PaymentStatus.PENDING,
  PaymentStatus.OVERDUE,
  PaymentStatus.PARTIAL,
];

export const dashboardRepository = {
  bills(familyId: string, from: Date, to: Date) {
    return prisma.bill.findMany({
      where: { familyId, dueDate: { gte: from, lte: to }, status: { in: OPEN_STATUSES } },
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        providerName: true,
        amount: true,
        dueDate: true,
        status: true,
      },
    });
  },

  rents(familyId: string, from: Date, to: Date) {
    return prisma.rent.findMany({
      where: { familyId, dueDate: { gte: from, lte: to }, status: { in: OPEN_STATUSES } },
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        propertyName: true,
        landlordName: true,
        amount: true,
        dueDate: true,
        status: true,
      },
    });
  },

  schoolFees(familyId: string, from: Date, to: Date) {
    return prisma.schoolFee.findMany({
      where: { familyId, dueDate: { gte: from, lte: to }, status: { in: OPEN_STATUSES } },
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        studentName: true,
        school: true,
        term: true,
        amount: true,
        dueDate: true,
        status: true,
      },
    });
  },

  /**
   * Scheduled instalments. Scoped through the relation (`emi.familyId`) because
   * `EMIPayment` carries no `familyId` of its own — the EMI it belongs to does.
   */
  emiPayments(familyId: string, from: Date, to: Date) {
    return prisma.eMIPayment.findMany({
      where: {
        emi: { familyId },
        dueDate: { gte: from, lte: to },
        status: { in: OPEN_STATUSES },
      },
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        amount: true,
        dueDate: true,
        status: true,
        month: true,
        year: true,
        emi: { select: { id: true, name: true, lenderName: true } },
      },
    });
  },

  /**
   * Running loans, with the months they already have a payment row for.
   *
   * The EMI module (Phase 7) is what generates those rows; until then an active
   * loan has a `dueDay` and a term but no schedule, so the service projects the
   * instalments itself. `payments` is selected so a projection never duplicates
   * an instalment that has already been recorded.
   */
  activeEmis(familyId: string) {
    return prisma.eMI.findMany({
      where: { familyId, status: EMIStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        lenderName: true,
        monthlyEMI: true,
        dueDay: true,
        startDate: true,
        endDate: true,
        payments: { select: { month: true, year: true } },
      },
    });
  },

  /**
   * Everyone still in the family. Members are listed even with nothing to their
   * name this month — a member who contributed nothing is itself the finding, and
   * a `groupBy` over transactions alone would silently omit them.
   */
  activeMembers(familyId: string) {
    return prisma.familyMember.findMany({
      where: { familyId, isActive: true },
      orderBy: { joinedAt: 'asc' },
      select: {
        id: true,
        user: { select: { firstName: true, lastName: true, avatar: true } },
      },
    });
  },
};
