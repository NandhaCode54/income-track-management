import { PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { startOfTodayUtc } from '../../shared/utils/date.util';
import type {
  BillCreate,
  BillDto,
  ListQuery,
  PagedPayments,
  PaymentItemDto,
  PaymentKind,
  RecordPaymentInput,
  RentCreate,
  RentDto,
  SchoolFeeCreate,
  SchoolFeeDto,
} from './payments.types';

/**
 * Bills, rent and school fees are three tables with one shared shape: an amount
 * due on a date, later settled (or not). The switch per method is deliberate —
 * the models differ enough that a generic delegate would need `any` to compile,
 * and the compiler is worth more here than the lines.
 *
 * Every lookup carries `familyId`; a foreign id resolves to `null` → 404.
 */

const decimal = (value: number): Prisma.Decimal => new Prisma.Decimal(value.toFixed(2));

type ListRow =
  | Prisma.BillGetPayload<object>
  | Prisma.RentGetPayload<object>
  | Prisma.SchoolFeeGetPayload<object>;

// ── DTO mapping ──────────────────────────────────────────────────────────────

const toBillDto = (row: Prisma.BillGetPayload<object>): BillDto => ({
  kind: 'bill',
  id: row.id,
  type: row.type,
  name: row.name,
  providerName: row.providerName,
  amount: Number(row.amount.toFixed(2)),
  dueDate: row.dueDate,
  paidDate: row.paidDate,
  status: row.status,
  isRecurring: row.isRecurring,
  frequency: row.frequency,
  notes: row.notes,
  createdAt: row.createdAt,
});

const toRentDto = (row: Prisma.RentGetPayload<object>): RentDto => ({
  kind: 'rent',
  id: row.id,
  propertyName: row.propertyName,
  landlordName: row.landlordName,
  landlordPhone: row.landlordPhone,
  amount: Number(row.amount.toFixed(2)),
  dueDay: row.dueDay,
  dueDate: row.dueDate,
  paidDate: row.paidDate,
  status: row.status,
  month: row.month,
  year: row.year,
  notes: row.notes,
  createdAt: row.createdAt,
});

const toSchoolFeeDto = (row: Prisma.SchoolFeeGetPayload<object>): SchoolFeeDto => ({
  kind: 'schoolFee',
  id: row.id,
  studentName: row.studentName,
  school: row.school,
  class: row.class,
  amount: Number(row.amount.toFixed(2)),
  dueDate: row.dueDate,
  paidDate: row.paidDate,
  status: row.status,
  term: row.term,
  academicYear: row.academicYear,
  notes: row.notes,
  createdAt: row.createdAt,
});

const toDto = (kind: PaymentKind, row: ListRow): PaymentItemDto => {
  if (kind === 'bill') return toBillDto(row as Prisma.BillGetPayload<object>);
  if (kind === 'rent') return toRentDto(row as Prisma.RentGetPayload<object>);
  return toSchoolFeeDto(row as Prisma.SchoolFeeGetPayload<object>);
};

/** The date filter always lands on `dueDate` — the month a payment is *owed*. */
const dateFilter = (query: ListQuery) => ({
  ...(query.from || query.to
    ? {
        dueDate: {
          ...(query.from ? { gte: query.from } : {}),
          ...(query.to ? { lte: query.to } : {}),
        },
      }
    : {}),
});

export const paymentsService = {
  async list(kind: PaymentKind, familyId: string, query: ListQuery): Promise<PagedPayments> {
    const where = {
      familyId,
      ...(query.status ? { status: query.status } : {}),
      ...dateFilter(query),
    };
    const orderBy = [{ dueDate: 'asc' as const }, { createdAt: 'desc' as const }];
    const skip = (query.page - 1) * query.perPage;
    const take = query.perPage;

    // Page and count in one transaction so they can never disagree.
    if (kind === 'bill') {
      const [rows, total] = await prisma.$transaction([
        prisma.bill.findMany({ where, orderBy, skip, take }),
        prisma.bill.count({ where }),
      ]);
      return { items: rows.map((row) => toDto(kind, row)), total };
    }
    if (kind === 'rent') {
      const [rows, total] = await prisma.$transaction([
        prisma.rent.findMany({ where, orderBy, skip, take }),
        prisma.rent.count({ where }),
      ]);
      return { items: rows.map((row) => toDto(kind, row)), total };
    }
    const [rows, total] = await prisma.$transaction([
      prisma.schoolFee.findMany({ where, orderBy, skip, take }),
      prisma.schoolFee.count({ where }),
    ]);
    return { items: rows.map((row) => toDto(kind, row)), total };
  },

  async getById(kind: PaymentKind, familyId: string, id: string): Promise<PaymentItemDto> {
    if (kind === 'bill') {
      const row = await prisma.bill.findFirst({ where: { id, familyId } });
      if (!row) throw new NotFoundError('Bill');
      return toBillDto(row);
    }
    if (kind === 'rent') {
      const row = await prisma.rent.findFirst({ where: { id, familyId } });
      if (!row) throw new NotFoundError('Rent');
      return toRentDto(row);
    }
    const row = await prisma.schoolFee.findFirst({ where: { id, familyId } });
    if (!row) throw new NotFoundError('School fee');
    return toSchoolFeeDto(row);
  },

  async create(
    kind: PaymentKind,
    familyId: string,
    input: BillCreate | RentCreate | SchoolFeeCreate,
  ): Promise<PaymentItemDto> {
    if (kind === 'bill') {
      const data = input as BillCreate;
      const row = await prisma.bill.create({
        data: {
          familyId,
          type: data.type,
          name: data.name,
          providerName: data.providerName ?? null,
          amount: decimal(data.amount),
          dueDate: data.dueDate,
          // Recurrence is whatever the caller asked for — defaulted by the
          // schema, never forced. A one-off bill must stay possible.
          isRecurring: data.isRecurring ?? true,
          frequency: data.frequency ?? 'MONTHLY',
          notes: data.notes ?? null,
        },
      });
      return toBillDto(row);
    }
    if (kind === 'rent') {
      const data = input as RentCreate;
      const row = await prisma.rent.create({
        data: {
          familyId,
          propertyName: data.propertyName,
          landlordName: data.landlordName ?? null,
          landlordPhone: data.landlordPhone ?? null,
          amount: decimal(data.amount),
          dueDay: data.dueDay,
          dueDate: data.dueDate,
          month: data.month,
          year: data.year,
          notes: data.notes ?? null,
        },
      });
      return toRentDto(row);
    }
    const data = input as SchoolFeeCreate;
    const row = await prisma.schoolFee.create({
      data: {
        familyId,
        studentName: data.studentName,
        school: data.school,
        class: data.class ?? null,
        amount: decimal(data.amount),
        dueDate: data.dueDate,
        term: data.term ?? null,
        academicYear: data.academicYear ?? null,
        notes: data.notes ?? null,
      },
    });
    return toSchoolFeeDto(row);
  },

  async update(
    kind: PaymentKind,
    familyId: string,
    id: string,
    input: Partial<BillCreate | RentCreate | SchoolFeeCreate>,
  ): Promise<PaymentItemDto> {
    // Scoped existence check first; the update itself runs by bare id.
    await this.getById(kind, familyId, id);

    if (kind === 'bill') {
      const data = input as Partial<BillCreate>;
      const row = await prisma.bill.update({
        where: { id },
        data: {
          ...(data.type !== undefined ? { type: data.type } : {}),
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...('providerName' in data ? { providerName: data.providerName ?? null } : {}),
          ...(data.amount !== undefined ? { amount: decimal(data.amount) } : {}),
          ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
          ...(data.isRecurring !== undefined ? { isRecurring: data.isRecurring } : {}),
          ...(data.frequency !== undefined ? { frequency: data.frequency } : {}),
          ...('notes' in data ? { notes: data.notes ?? null } : {}),
        },
      });
      return toBillDto(row);
    }
    if (kind === 'rent') {
      const data = input as Partial<RentCreate>;
      const row = await prisma.rent.update({
        where: { id },
        data: {
          ...(data.propertyName !== undefined ? { propertyName: data.propertyName } : {}),
          ...('landlordName' in data ? { landlordName: data.landlordName ?? null } : {}),
          ...('landlordPhone' in data ? { landlordPhone: data.landlordPhone ?? null } : {}),
          ...(data.amount !== undefined ? { amount: decimal(data.amount) } : {}),
          ...(data.dueDay !== undefined ? { dueDay: data.dueDay } : {}),
          ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
          ...(data.month !== undefined ? { month: data.month } : {}),
          ...(data.year !== undefined ? { year: data.year } : {}),
          ...('notes' in data ? { notes: data.notes ?? null } : {}),
        },
      });
      return toRentDto(row);
    }
    const data = input as Partial<SchoolFeeCreate>;
    const row = await prisma.schoolFee.update({
      where: { id },
      data: {
        ...(data.studentName !== undefined ? { studentName: data.studentName } : {}),
        ...(data.school !== undefined ? { school: data.school } : {}),
        ...('class' in data ? { class: data.class ?? null } : {}),
        ...(data.amount !== undefined ? { amount: decimal(data.amount) } : {}),
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
        ...('term' in data ? { term: data.term ?? null } : {}),
        ...('academicYear' in data ? { academicYear: data.academicYear ?? null } : {}),
        ...('notes' in data ? { notes: data.notes ?? null } : {}),
      },
    });
    return toSchoolFeeDto(row);
  },

  async remove(kind: PaymentKind, familyId: string, id: string): Promise<void> {
    await this.getById(kind, familyId, id);
    if (kind === 'bill') await prisma.bill.delete({ where: { id } });
    else if (kind === 'rent') await prisma.rent.delete({ where: { id } });
    else await prisma.schoolFee.delete({ where: { id } });
  },

  /**
   * Settles (or part-settles, or waives) one obligation.
   *
   * `paidDate` defaults to **today at UTC midnight** — the same convention as
   * every stored date in the app. A local-time `new Date()` here stamps the
   * payment with yesterday's date for anyone west of Greenwich, which is
   * precisely the timezone bug class fixed in Phases 4–6.
   *
   * A waived bill was never paid, so it keeps `paidDate = null`.
   */
  async recordPayment(
    kind: PaymentKind,
    familyId: string,
    id: string,
    input: RecordPaymentInput,
  ): Promise<PaymentItemDto> {
    await this.getById(kind, familyId, id);

    const data = {
      status: input.status,
      paidDate: input.status === PaymentStatus.WAIVED ? null : (input.paidDate ?? startOfTodayUtc()),
    };

    if (kind === 'bill') {
      const row = await prisma.bill.update({ where: { id }, data });
      return toBillDto(row);
    }
    if (kind === 'rent') {
      const row = await prisma.rent.update({ where: { id }, data });
      return toRentDto(row);
    }
    const row = await prisma.schoolFee.update({ where: { id }, data });
    return toSchoolFeeDto(row);
  },
};
