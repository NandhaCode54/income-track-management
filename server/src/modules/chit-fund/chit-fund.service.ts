import { Prisma } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { ValidationError } from '../../shared/errors/ValidationError';
import { MSG } from '../../shared/constants/messages';
import { dueDateInMonth, startOfTodayUtc } from '../../shared/utils/date.util';
import { chitFundRepository } from './chit-fund.repository';
import type {
  ChitFundRow,
  ChitPaymentRow,
} from './chit-fund.repository';
import type {
  ChitFundDto,
  ChitPaymentDto,
  CreateChitFundInput,
  RecordChitPaymentInput,
} from './chit-fund.types';
import { isMonthWithinFund } from './chit-fund.types';

const toNumber = (value: Prisma.Decimal): number => Number(value.toFixed(2));

const toPaymentDto = (row: ChitPaymentRow): ChitPaymentDto => ({
  id: row.id,
  amount: toNumber(row.amount),
  month: row.month,
  year: row.year,
  dueDate: row.dueDate,
  paidDate: row.paidDate,
  status: row.status,
  notes: row.notes,
});

const toDto = (row: ChitFundRow): ChitFundDto => {
  const paid = row.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);

  return {
    id: row.id,
    name: row.name,
    organizer: row.organizer,
    totalAmount: toNumber(row.totalAmount),
    monthlyAmount: toNumber(row.monthlyAmount),
    totalMembers: row.totalMembers,
    startDate: row.startDate,
    endDate: row.endDate,
    dueDay: row.dueDay,
    isActive: row.isActive,
    notes: row.notes,
    // Derived, never stored — the same honesty rule as the EMI progress block.
    paidAmount: Math.round(paid * 100) / 100,
    paidMonths: row.payments.filter((payment) => payment.status === 'PAID').length,
    remainingAmount:
      Math.round((toNumber(row.totalAmount) - paid) * 100) / 100 < 0
        ? 0
        : Math.round((toNumber(row.totalAmount) - paid) * 100) / 100,
    payments: row.payments.map(toPaymentDto),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

export const chitFundService = {
  async list(familyId: string): Promise<{ chitFunds: ChitFundDto[] }> {
    const rows = await chitFundRepository.list(familyId);
    return { chitFunds: rows.map(toDto) };
  },

  async getById(familyId: string, id: string): Promise<{ chitFund: ChitFundDto }> {
    const row = await chitFundRepository.findById(familyId, id);
    if (!row) throw new NotFoundError('Chit fund');
    return { chitFund: toDto(row) };
  },

  async create(familyId: string, input: CreateChitFundInput): Promise<ChitFundDto> {
    const row = await chitFundRepository.create(familyId, input);
    return toDto(row);
  },

  /**
   * Records one month's contribution.
   *
   * The month must fall inside the fund's own window — a payment for a month
   * before it started or after it ends is a typo, not a contribution. The due
   * date is derived from the **fund's** `dueDay` (clamped to the month's
   * length), so a client cannot invent one.
   */
  async recordPayment(
    familyId: string,
    id: string,
    input: RecordChitPaymentInput,
  ): Promise<ChitFundDto> {
    const fund = await chitFundRepository.findById(familyId, id);
    if (!fund) throw new NotFoundError('Chit fund');

    if (!isMonthWithinFund(fund, input.month, input.year)) {
      throw new ValidationError(MSG.VALIDATION_ERROR, { month: [MSG.CHIT_MONTH_OUT_OF_RANGE] });
    }

    const today = startOfTodayUtc();
    await chitFundRepository.recordPayment(fund.id, {
      ...input,
      defaultAmount: fund.monthlyAmount,
      dueDate: dueDateInMonth(input.year, input.month, fund.dueDay),
      // Defaulting "paid" to today at UTC midnight keeps every stored date on
      // one clock — the convention the CSV importer once broke (Phase 4).
      paidDate: input.paidDate ?? today,
    });

    const updated = await chitFundRepository.findById(familyId, id);
    return toDto(updated as NonNullable<typeof updated>);
  },

  async remove(familyId: string, id: string): Promise<void> {
    const fund = await chitFundRepository.findById(familyId, id);
    if (!fund) throw new NotFoundError('Chit fund');
    await chitFundRepository.delete(fund.id);
  },
};
