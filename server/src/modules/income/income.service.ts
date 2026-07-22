import { Frequency, Prisma, UserRole } from '@prisma/client';
import { incomeRepository, type IncomeRow, type WriteIncomeData } from './income.repository';
import type {
  CreateIncomeInput,
  IncomeBreakdownDto,
  IncomeDto,
  IncomeListResult,
  IncomeSummaryDto,
  IncomeSummaryQuery,
  ListIncomeQuery,
  UpdateIncomeInput,
} from './income.types';
import type { ActorContext } from '../../shared/types/actor';
import { hasRoleOrAbove } from '../../shared/constants/roles';
import { nextOccurrence } from '../../shared/utils/recurrence.util';
import { ForbiddenError } from '../../shared/errors/AuthError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { ValidationError } from '../../shared/errors/ValidationError';
import { MSG } from '../../shared/constants/messages';

/** Money crosses the wire as a plain number; two decimals always fit a JS float exactly. */
const toNumber = (value: Prisma.Decimal): number => Number(value.toFixed(2));

const round2 = (value: number): number => Math.round(value * 100) / 100;

const percentOf = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;

const INCOME_TYPE_LABELS: Record<string, string> = {
  SALARY: 'Salary',
  BUSINESS: 'Business',
  RENTAL: 'Rental',
  FREELANCE: 'Freelance',
  BONUS: 'Bonus',
  INVESTMENT: 'Investment',
  OTHER: 'Other',
};

/** Heads and owners keep the family ledger; members only touch their own rows. */
const isLedgerManager = (role: UserRole): boolean => hasRoleOrAbove(role, UserRole.FAMILY_HEAD);

const toDto = (row: IncomeRow, actorMemberId: string): IncomeDto => ({
  id: row.id,
  type: row.type,
  amount: toNumber(row.amount),
  description: row.description,
  notes: row.notes,
  date: row.date,
  isRecurring: row.isRecurring,
  frequency: row.frequency,
  nextOccurrence:
    row.isRecurring && row.frequency ? nextOccurrence(row.date, row.frequency) : null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  member: {
    id: row.member.id,
    firstName: row.member.user.firstName,
    lastName: row.member.user.lastName,
    email: row.member.user.email,
    avatar: row.member.user.avatar,
    isActive: row.member.isActive,
  },
  isOwn: row.memberId === actorMemberId,
});

/**
 * Members may add and edit their own income; changing or deleting someone else's
 * entry is reserved for family heads and the workspace owner. This mirrors the
 * role hierarchy — the route-level `requirePermission` only gates the coarse verb.
 */
const assertCanMutate = (actor: ActorContext, row: IncomeRow): void => {
  if (row.memberId === actor.memberId) return;
  if (isLedgerManager(actor.role)) return;
  throw new ForbiddenError(MSG.INCOME_NOT_YOURS);
};

/**
 * Resolves who an entry is attributed to. Defaults to the caller; only a ledger
 * manager may name someone else, and only an active member of the same family.
 */
const resolveOwner = async (actor: ActorContext, memberId?: string): Promise<string> => {
  if (!memberId || memberId === actor.memberId) return actor.memberId;

  if (!isLedgerManager(actor.role)) {
    throw new ForbiddenError(MSG.INCOME_MEMBER_NOT_ALLOWED);
  }

  const member = await incomeRepository.findFamilyMember(actor.familyId, memberId);
  if (!member) throw new NotFoundError('Member');
  if (!member.isActive) {
    throw new ValidationError(MSG.VALIDATION_ERROR, {
      memberId: [MSG.INCOME_MEMBER_INACTIVE],
    });
  }

  return member.id;
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
      frequency: [MSG.INCOME_FREQUENCY_REQUIRED],
    });
  }

  return { isRecurring: true, frequency };
};

const toWriteData = (
  input: CreateIncomeInput | UpdateIncomeInput,
  recurrence: { isRecurring: boolean; frequency: Frequency },
): Partial<WriteIncomeData> => {
  const data: Partial<WriteIncomeData> = {
    isRecurring: recurrence.isRecurring,
    frequency: recurrence.frequency,
  };

  if (input.type !== undefined) data.type = input.type;
  if (input.amount !== undefined) data.amount = new Prisma.Decimal(input.amount.toFixed(2));
  if (input.date !== undefined) data.date = input.date;
  // `undefined` in the payload means "not supplied"; a cleared field arrives as ''.
  if ('description' in input) data.description = input.description ?? null;
  if ('notes' in input) data.notes = input.notes ?? null;

  return data;
};

export const incomeService = {
  async list(actor: ActorContext, query: ListIncomeQuery): Promise<IncomeListResult> {
    const { items, total, filteredSum } = await incomeRepository.list(actor.familyId, query);
    return {
      items: items.map((row) => toDto(row, actor.memberId)),
      total,
      filteredTotal: toNumber(filteredSum),
    };
  },

  async getById(actor: ActorContext, id: string): Promise<IncomeDto> {
    const row = await incomeRepository.findById(actor.familyId, id);
    if (!row) throw new NotFoundError('Income entry');
    return toDto(row, actor.memberId);
  },

  async create(actor: ActorContext, input: CreateIncomeInput): Promise<IncomeDto> {
    const memberId = await resolveOwner(actor, input.memberId);
    const recurrence = resolveRecurrence(input);

    const row = await incomeRepository.create(
      actor.familyId,
      memberId,
      toWriteData(input, recurrence) as WriteIncomeData,
    );

    return toDto(row, actor.memberId);
  },

  async update(actor: ActorContext, id: string, input: UpdateIncomeInput): Promise<IncomeDto> {
    const existing = await incomeRepository.findById(actor.familyId, id);
    if (!existing) throw new NotFoundError('Income entry');
    assertCanMutate(actor, existing);

    const recurrence = resolveRecurrence(input, existing);
    const data = toWriteData(input, recurrence);

    // Re-attributing an entry is itself a ledger-manager action.
    const memberId =
      input.memberId && input.memberId !== existing.memberId
        ? await resolveOwner(actor, input.memberId)
        : undefined;

    const row = await incomeRepository.update(existing.id, { ...data, memberId });
    return toDto(row, actor.memberId);
  },

  async remove(actor: ActorContext, id: string): Promise<void> {
    const existing = await incomeRepository.findById(actor.familyId, id);
    if (!existing) throw new NotFoundError('Income entry');
    assertCanMutate(actor, existing);
    await incomeRepository.delete(existing.id);
  },

  /** Recurring entries with their next derived due date, soonest first. */
  async listRecurring(actor: ActorContext): Promise<IncomeDto[]> {
    const rows = await incomeRepository.listRecurring(actor.familyId);
    return rows
      .map((row) => toDto(row, actor.memberId))
      .sort((a, b) => {
        if (!a.nextOccurrence) return 1;
        if (!b.nextOccurrence) return -1;
        return a.nextOccurrence.getTime() - b.nextOccurrence.getTime();
      });
  },

  async summary(actor: ActorContext, query: IncomeSummaryQuery): Promise<IncomeSummaryDto> {
    const { familyId } = actor;
    const { from, to } = incomeRepository.periodRange(query);

    // The same-length window immediately before this one — last month, or last year.
    const previous = query.month
      ? incomeRepository.periodRange(
          query.month === 1
            ? { year: query.year - 1, month: 12 }
            : { year: query.year, month: query.month - 1 },
        )
      : incomeRepository.periodRange({ year: query.year - 1 });

    const [totals, previousSum, byType, byMember, monthly] = await Promise.all([
      incomeRepository.periodTotals(familyId, from, to),
      incomeRepository.sumBetween(familyId, previous.from, previous.to),
      incomeRepository.groupByType(familyId, from, to),
      incomeRepository.groupByMember(familyId, from, to),
      incomeRepository.monthlyTotals(familyId, query.year),
    ]);

    const total = toNumber(totals.total);
    const previousTotal = toNumber(previousSum);

    const typeBreakdown: IncomeBreakdownDto[] = byType
      .map((row) => {
        const rowTotal = toNumber(row._sum.amount ?? new Prisma.Decimal(0));
        return {
          key: row.type,
          label: INCOME_TYPE_LABELS[row.type] ?? row.type,
          total: rowTotal,
          count: row._count._all,
          percentage: percentOf(rowTotal, total),
        };
      })
      .sort((a, b) => b.total - a.total);

    const memberBreakdown: IncomeBreakdownDto[] = byMember
      .map((row) => {
        const rowTotal = toNumber(row._sum.amount ?? new Prisma.Decimal(0));
        const user = row.member?.user;
        return {
          key: row.memberId,
          label: user ? `${user.firstName} ${user.lastName}` : 'Former member',
          total: rowTotal,
          count: row._count._all,
          percentage: percentOf(rowTotal, total),
        };
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
      byType: typeBreakdown,
      byMember: memberBreakdown,
      monthlyTrend: monthly.map((row) => ({ month: row.month, total: toNumber(row.total) })),
      recurringTotal: toNumber(totals.recurringTotal),
    };
  },
};
