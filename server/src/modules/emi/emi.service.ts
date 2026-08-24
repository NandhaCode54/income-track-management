import { EMIStatus, PaymentStatus, Prisma } from '@prisma/client';
import {
  emiRepository,
  OPEN_PAYMENT_STATUSES,
  type EmiPaymentRow,
  type EmiRow,
  type ScheduledInstalment,
  type WriteEmiData,
} from './emi.repository';
import type {
  CalculatorDto,
  CalculatorQuery,
  CreateEmiInput,
  EmiDetailDto,
  EmiDto,
  EmiListResult,
  EmiPaymentDto,
  EmiProgressDto,
  ListEmiQuery,
  RecordPaymentInput,
  UpcomingEmisDto,
  UpdateEmiInput,
  UpcomingQuery,
} from './emi.types';
import type { ActorContext } from '../../shared/types/actor';
import {
  amortise,
  isUnviableInstalment,
  monthlyEmiFor,
  type AmortisationRow,
  type LoanTerms,
} from '../../shared/utils/emi-calculator.util';
import {
  addDaysUtc,
  dueDateInMonth,
  endOfDayUtc,
  startOfTodayUtc,
  wholeDaysBetween,
} from '../../shared/utils/date.util';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { ValidationError } from '../../shared/errors/ValidationError';
import { MSG } from '../../shared/constants/messages';

/** Money crosses the wire as a plain number; two decimals always fit a JS float exactly. */
const toNumber = (value: Prisma.Decimal): number => Number(value.toFixed(2));

const round2 = (value: number): number => Math.round(value * 100) / 100;

const percentOf = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;

const decimal = (value: number): Prisma.Decimal => new Prisma.Decimal(value.toFixed(2));

/** An instalment is settled once it is paid or written off; a part-payment is not. */
const isSettled = (status: PaymentStatus): boolean =>
  status === PaymentStatus.PAID || status === PaymentStatus.WAIVED;

// ── Schedule generation ─────────────────────────────────────────────────────

/**
 * The first instalment falls on the **first occurrence of `dueDay` on or after
 * the start date** — not on the start date itself, and not a month later.
 *
 * Borrow on 15 January with a debit on the 5th and the first instalment is
 * 5 February; borrow on the 2nd and it is 5 January. Anchoring blindly to the
 * start month instead would date the first instalment *before* the loan existed,
 * and anchoring to the following month would lose a real payment from the front
 * of the schedule and push the end date a month out.
 */
const firstDueDate = (startDate: Date, dueDay: number): Date => {
  const inStartMonth = dueDateInMonth(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth() + 1,
    dueDay,
  );

  if (inStartMonth >= startDate) return inStartMonth;

  const next = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 1));
  return dueDateInMonth(next.getUTCFullYear(), next.getUTCMonth() + 1, dueDay);
};

/**
 * Materialises the loan's instalments.
 *
 * **Why this is stored, when recurring income is derived.** Phase 3 computes the
 * next occurrence of a repeating income on read and writes nothing, because
 * nothing has happened yet. An instalment is the opposite: each one is a distinct
 * event that gets paid, part-paid, waived or missed, and carries its own paid
 * date, amount and note. There is state per occurrence, so there has to be a row
 * per occurrence — a derived schedule has nowhere to record that the March
 * payment bounced.
 *
 * Amounts come straight from the amortisation, so the final instalment carries
 * the rounding residue and the schedule sums exactly to the total payable.
 *
 * Each due date is computed from the **start month plus k**, never by stepping a
 * month from the previous due date: stepping loses the 31st forever after the
 * first February (the clamping trap from Phase 3).
 */
const buildSchedule = (
  startDate: Date,
  dueDay: number,
  breakdown: AmortisationRow[],
): ScheduledInstalment[] => {
  const first = firstDueDate(startDate, dueDay);
  const anchorYear = first.getUTCFullYear();
  const anchorMonth = first.getUTCMonth() + 1;

  return breakdown.map((row, index) => {
    const absoluteMonth = anchorMonth - 1 + index;
    const year = anchorYear + Math.floor(absoluteMonth / 12);
    const month = (absoluteMonth % 12) + 1;

    return {
      amount: decimal(row.payment),
      dueDate: dueDateInMonth(year, month, dueDay),
      month,
      year,
    };
  });
};

/**
 * Everything a set of terms implies: the instalment, the schedule, and the end
 * date. Derived in one place so `endDate` can never disagree with the last row of
 * the schedule — two sources of truth for "when does this loan finish" is a bug
 * waiting for its first leap year.
 */
const deriveLoan = (input: {
  loanAmount: number;
  interestRate: number;
  tenureMonths: number;
  monthlyEMI?: number;
  startDate: Date;
  dueDay: number;
}) => {
  const terms: LoanTerms = {
    principal: input.loanAmount,
    annualRate: input.interestRate,
    tenureMonths: input.tenureMonths,
  };

  const monthlyEMI = input.monthlyEMI ?? monthlyEmiFor(terms);

  /*
   * A stated instalment that never covers the first month's interest describes a
   * loan that grows forever. It is rejected here rather than stored, because the
   * schedule that would follow is meaningless and every figure derived from it —
   * outstanding, progress, the dashboard's obligation total — would be too.
   */
  if (isUnviableInstalment(terms, monthlyEMI)) {
    throw new ValidationError(MSG.VALIDATION_ERROR, { monthlyEMI: [MSG.EMI_INSTALMENT_TOO_SMALL] });
  }

  const breakdown = amortise(terms, monthlyEMI);
  const schedule = buildSchedule(input.startDate, input.dueDay, breakdown.schedule);

  return {
    monthlyEMI,
    breakdown,
    schedule,
    endDate: schedule[schedule.length - 1].dueDate,
  };
};

// ── DTO mapping ─────────────────────────────────────────────────────────────

const toPaymentDto = (row: EmiPaymentRow, today: Date): EmiPaymentDto => ({
  id: row.id,
  amount: toNumber(row.amount),
  dueDate: row.dueDate,
  paidDate: row.paidDate,
  status: row.status,
  month: row.month,
  year: row.year,
  notes: row.notes,
  /*
   * Derived, not read from `status`. The reminder job flips PENDING → OVERDUE
   * once a day so queries can filter on it, but between runs the stored status is
   * up to 24 hours stale — and a screen that still says "due today" the morning
   * after is exactly the thing the card exists to prevent. The row is the record;
   * this is the truth right now.
   */
  isOverdue: !isSettled(row.status) && row.dueDate < today,
  daysUntilDue: wholeDaysBetween(today, row.dueDate),
});

const progressOf = (payments: EmiPaymentRow[], today: Date): EmiProgressDto => {
  const settled = payments.filter((row) => isSettled(row.status));
  const open = payments.filter((row) => OPEN_PAYMENT_STATUSES.includes(row.status));
  const overdue = open.filter((row) => row.dueDate < today);

  /*
   * `paidAmount` counts what was actually paid, including part-payments — a row
   * sitting at PARTIAL has money against it even though it is not settled. So the
   * two figures are counted over different sets on purpose: `paidCount` is about
   * instalments cleared, `paidAmount` is about cash gone.
   */
  const paidAmount = round2(
    payments
      .filter((row) => row.status !== PaymentStatus.PENDING && row.status !== PaymentStatus.OVERDUE)
      .filter((row) => row.status !== PaymentStatus.WAIVED)
      .reduce((sum, row) => sum + toNumber(row.amount), 0),
  );

  const next = open
    .filter((row) => row.dueDate >= today)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];

  return {
    paidCount: settled.length,
    totalCount: payments.length,
    paidAmount,
    remainingAmount: round2(open.reduce((sum, row) => sum + toNumber(row.amount), 0)),
    percentPaid: percentOf(settled.length, payments.length),
    overdueCount: overdue.length,
    overdueAmount: round2(overdue.reduce((sum, row) => sum + toNumber(row.amount), 0)),
    nextDueDate: next?.dueDate ?? null,
    nextDueAmount: next ? toNumber(next.amount) : null,
  };
};

const toDto = (row: EmiRow, today: Date): EmiDto => {
  const totalPayable = round2(
    row.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0),
  );

  return {
    id: row.id,
    name: row.name,
    lenderName: row.lenderName,
    loanAmount: toNumber(row.loanAmount),
    interestRate: toNumber(row.interestRate),
    tenureMonths: row.tenureMonths,
    monthlyEMI: toNumber(row.monthlyEMI),
    startDate: row.startDate,
    endDate: row.endDate,
    dueDay: row.dueDay,
    status: row.status,
    notes: row.notes,
    totalPayable,
    // The cost of borrowing: everything repaid, less what was borrowed.
    totalInterest: round2(totalPayable - toNumber(row.loanAmount)),
    progress: progressOf(row.payments, today),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

// ── Guards ──────────────────────────────────────────────────────────────────

const TERM_FIELDS = ['loanAmount', 'interestRate', 'tenureMonths', 'monthlyEMI', 'startDate', 'dueDay'] as const;

const touchesTerms = (input: UpdateEmiInput): boolean =>
  TERM_FIELDS.some((field) => input[field] !== undefined);

/**
 * A loan's terms are editable only while nothing has been paid against it.
 *
 * Changing the rate or the tenure regenerates the whole schedule, and there is no
 * honest way to do that around instalments that have already been settled: the
 * new schedule's March row is not the old one, so either the payment is dropped
 * or it is re-attached to an instalment of a different amount. Both rewrite
 * history. Correcting the terms of a loan that is already being repaid is
 * "delete it and add it again", which is at least visibly what happened.
 *
 * The descriptive fields — name, lender, notes, status — stay editable always.
 */
const assertTermsEditable = (row: EmiRow, input: UpdateEmiInput): void => {
  if (!touchesTerms(input)) return;
  if (!row.payments.some((payment) => payment.status !== PaymentStatus.PENDING)) return;

  throw new ValidationError(MSG.VALIDATION_ERROR, { loanAmount: [MSG.EMI_TERMS_LOCKED] });
};

const toWriteData = (
  input: CreateEmiInput | UpdateEmiInput,
  derived?: { monthlyEMI: number; endDate: Date },
): Partial<WriteEmiData> => {
  const data: Partial<WriteEmiData> = {};

  if (input.name !== undefined) data.name = input.name;
  // `undefined` means "not supplied"; a cleared field arrives as '' and becomes null.
  if ('lenderName' in input) data.lenderName = input.lenderName ?? null;
  if ('notes' in input) data.notes = input.notes ?? null;
  if (input.loanAmount !== undefined) data.loanAmount = decimal(input.loanAmount);
  if (input.interestRate !== undefined) data.interestRate = decimal(input.interestRate);
  if (input.tenureMonths !== undefined) data.tenureMonths = input.tenureMonths;
  if (input.startDate !== undefined) data.startDate = input.startDate;
  if (input.dueDay !== undefined) data.dueDay = input.dueDay;

  if (derived) {
    data.monthlyEMI = decimal(derived.monthlyEMI);
    data.endDate = derived.endDate;
  }

  return data;
};

// ── Service ─────────────────────────────────────────────────────────────────

export const emiService = {
  async list(actor: ActorContext, query: ListEmiQuery): Promise<EmiListResult> {
    const today = startOfTodayUtc();
    const result = await emiRepository.list(actor.familyId, query);

    return {
      items: result.items.map((row) => toDto(row, today)),
      total: result.total,
      totals: {
        monthlyOutgo: toNumber(result.monthlyOutgo),
        outstanding: toNumber(result.outstanding),
        activeCount: result.activeCount,
      },
    };
  },

  /** One loan, with its instalments and the interest/principal split beside them. */
  async getById(actor: ActorContext, id: string): Promise<EmiDetailDto> {
    const row = await emiRepository.findById(actor.familyId, id);
    if (!row) throw new NotFoundError('EMI');

    const today = startOfTodayUtc();
    const breakdown = amortise(
      {
        principal: toNumber(row.loanAmount),
        annualRate: toNumber(row.interestRate),
        tenureMonths: row.tenureMonths,
      },
      toNumber(row.monthlyEMI),
    );

    return {
      ...toDto(row, today),
      payments: row.payments.map((payment) => toPaymentDto(payment, today)),
      schedule: breakdown.schedule,
    };
  },

  async create(actor: ActorContext, input: CreateEmiInput): Promise<EmiDto> {
    const derived = deriveLoan(input);

    const row = await emiRepository.create(
      actor.familyId,
      toWriteData(input, derived) as WriteEmiData,
      derived.schedule,
    );

    return toDto(row, startOfTodayUtc());
  },

  async update(actor: ActorContext, id: string, input: UpdateEmiInput): Promise<EmiDto> {
    const existing = await emiRepository.findById(actor.familyId, id);
    if (!existing) throw new NotFoundError('EMI');

    assertTermsEditable(existing, input);

    const today = startOfTodayUtc();

    if (!touchesTerms(input)) {
      const row = await emiRepository.update(existing.id, {
        ...toWriteData(input),
        status: input.status,
      });
      return toDto(row, today);
    }

    // Terms moved, so the schedule is rebuilt from the merged terms — the ones not
    // supplied come from the stored row, which is why this cannot live in the validator.
    const derived = deriveLoan({
      loanAmount: input.loanAmount ?? toNumber(existing.loanAmount),
      interestRate: input.interestRate ?? toNumber(existing.interestRate),
      tenureMonths: input.tenureMonths ?? existing.tenureMonths,
      monthlyEMI: input.monthlyEMI,
      startDate: input.startDate ?? existing.startDate,
      dueDay: input.dueDay ?? existing.dueDay,
    });

    const row = await emiRepository.replaceSchedule(
      existing.id,
      { ...toWriteData(input, derived), ...(input.status ? { status: input.status } : {}) },
      derived.schedule,
    );

    return toDto(row, today);
  },

  async remove(actor: ActorContext, id: string): Promise<void> {
    const existing = await emiRepository.findById(actor.familyId, id);
    if (!existing) throw new NotFoundError('EMI');
    await emiRepository.delete(existing.id);
  },

  /**
   * Settles one instalment of the schedule.
   *
   * The instalment must already exist: the schedule *is* the loan, so a payment
   * for a month it does not cover is not an extra payment, it is a mistake — a
   * typo in the year, or a loan confused with another. Creating a row to match
   * would quietly extend the tenure.
   */
  async recordPayment(
    actor: ActorContext,
    id: string,
    input: RecordPaymentInput,
  ): Promise<EmiDto> {
    const emi = await emiRepository.findById(actor.familyId, id);
    if (!emi) throw new NotFoundError('EMI');

    const payment = await emiRepository.findPayment(actor.familyId, emi.id, input.month, input.year);
    if (!payment) {
      throw new ValidationError(MSG.VALIDATION_ERROR, { month: [MSG.EMI_INSTALMENT_NOT_FOUND] });
    }

    if (isSettled(payment.status)) {
      throw new ValidationError(MSG.VALIDATION_ERROR, { month: [MSG.EMI_INSTALMENT_SETTLED] });
    }

    const row = await emiRepository.recordPayment(
      emi.id,
      payment.id,
      {
        // Defaulting to the scheduled amount is the whole point — paying exactly
        // what is due is the case that happens every month.
        amount: input.amount !== undefined ? decimal(input.amount) : payment.amount,
        // A waived instalment was never paid, so it gets no paid date.
        paidDate:
          input.status === PaymentStatus.WAIVED ? null : (input.paidDate ?? startOfTodayUtc()),
        status: input.status ?? PaymentStatus.PAID,
        ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      },
      emi.tenureMonths,
    );

    return toDto(row, startOfTodayUtc());
  },

  async listPayments(actor: ActorContext, id: string): Promise<EmiPaymentDto[]> {
    const emi = await emiRepository.findById(actor.familyId, id);
    if (!emi) throw new NotFoundError('EMI');

    const today = startOfTodayUtc();
    const payments = await emiRepository.listPayments(emi.id);
    return payments.map((payment) => toPaymentDto(payment, today));
  },

  /**
   * Instalments falling due soon, across every loan.
   *
   * The window opens behind today for the same reason the dashboard's does: an
   * instalment already missed is the most urgent thing on the list, and hiding it
   * because its date has passed defeats the purpose of the card.
   */
  async upcoming(actor: ActorContext, query: UpcomingQuery): Promise<UpcomingEmisDto> {
    const today = startOfTodayUtc();
    const rows = await emiRepository.upcoming(
      actor.familyId,
      addDaysUtc(today, -query.days),
      endOfDayUtc(addDaysUtc(today, query.days)),
    );

    const items = rows.map((row) => ({
      ...toPaymentDto(row, today),
      emiId: row.emi.id,
      emiName: row.emi.name,
      lenderName: row.emi.lenderName,
    }));

    const overdue = items.filter((item) => item.isOverdue);

    return {
      windowDays: query.days,
      items,
      totals: {
        count: items.length,
        due: round2(items.reduce((sum, item) => sum + item.amount, 0)),
        overdueCount: overdue.length,
        overdueAmount: round2(overdue.reduce((sum, item) => sum + item.amount, 0)),
      },
    };
  },

  /**
   * Pure maths — no family data is read, and nothing is written. It stays behind
   * `authenticate` anyway: there is no reason to hand an unauthenticated caller a
   * CPU-bound endpoint that will happily amortise 480 rows.
   */
  calculator(query: CalculatorQuery): CalculatorDto {
    const terms: LoanTerms = {
      principal: query.loanAmount,
      annualRate: query.interestRate,
      tenureMonths: query.tenureMonths,
    };

    const breakdown = amortise(terms);

    return {
      loanAmount: query.loanAmount,
      interestRate: query.interestRate,
      tenureMonths: query.tenureMonths,
      monthlyEMI: breakdown.monthlyEMI,
      totalPayable: breakdown.totalPayable,
      totalInterest: breakdown.totalInterest,
      schedule: breakdown.schedule,
    };
  },
};
