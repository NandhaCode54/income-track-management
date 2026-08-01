import { PaymentStatus, Prisma } from '@prisma/client';
import { dashboardRepository } from './dashboard.repository';
import { incomeRepository } from '../income/income.repository';
import { expenseRepository } from '../expense/expense.repository';
import { budgetService } from '../budget/budget.service';
import { percentUsedOf, statusFor } from '../budget/budget.types';
import {
  CATEGORY_SPLIT_LIMIT,
  DEFAULT_UPCOMING_DAYS,
  OBLIGATION_KINDS,
  type BudgetSnapshotDto,
  type CashFlowPointDto,
  type CategorySliceDto,
  type ChartsQuery,
  type ComparedTotalDto,
  type DashboardChartsDto,
  type DashboardPeriodQuery,
  type DashboardSummaryDto,
  type FamilyContributionDto,
  type MemberContributionDto,
  type PeriodDto,
  type TopExpensesDto,
  type TopExpensesQuery,
  type UpcomingPaymentDto,
  type UpcomingPaymentsDto,
  type UpcomingQuery,
} from './dashboard.types';
import type { ActorContext } from '../../shared/types/actor';
import { periodRange } from '../../shared/utils/date.util';

/**
 * The dashboard is a **read-only composite**: it owns no entity of its own and
 * answers questions the other modules already hold the pieces for. So it reads
 * their repositories directly — the same way `budget.service` reads
 * `expenseRepository` — and calls `budgetService.vsActual` for the budget
 * snapshot rather than re-deriving the parent-absorbs-child roll-up.
 *
 * The dependency arrow only ever points *into* this file: nothing in the codebase
 * imports the dashboard, so composing across modules here cannot close a cycle.
 */

/** Money crosses the wire as a plain number; two decimals always fit a JS float exactly. */
const toNumber = (value: Prisma.Decimal): number => Number(value.toFixed(2));

const round2 = (value: number): number => Math.round(value * 100) / 100;

const percentOf = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;

/** Growth from a zero baseline has no percentage — the UI hides the badge on `null`. */
const changeFrom = (current: number, previous: number): number | null =>
  previous === 0 ? null : percentOf(current - previous, previous);

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const UNCATEGORISED_LABEL = 'Uncategorised';
const OTHER_LABEL = 'Other';

/**
 * How far back the obligation feed looks for things already past due.
 *
 * An "upcoming payments" card that hides an overdue bill is worse than useless,
 * so the window opens behind today rather than on it. It is bounded, though: with
 * no floor at all the feed would become an archive of every bill never marked
 * paid, and the one due next week would be buried under it.
 */
const OVERDUE_LOOKBACK_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Today at UTC midnight. Dates are stored at UTC midnight (`z.coerce.date()` on a
 * `yyyy-MM-dd` body), and `periodRange` builds its windows in UTC — so "today"
 * has to be read the same way or a due date could land on the wrong side of it.
 */
const startOfTodayUtc = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const addDaysUtc = (date: Date, days: number): Date => new Date(date.getTime() + days * MS_PER_DAY);

const endOfDayUtc = (date: Date): Date =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );

const wholeDaysBetween = (from: Date, to: Date): number =>
  Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);

/** The window immediately before this one, same length — last month. */
const previousMonthOf = (query: DashboardPeriodQuery): { month: number; year: number } =>
  query.month === 1 ? { month: 12, year: query.year - 1 } : { month: query.month - 1, year: query.year };

const periodDto = (query: DashboardPeriodQuery): PeriodDto => {
  const { from, to } = periodRange(query);
  return { month: query.month, year: query.year, from, to };
};

// ── Upcoming payments ───────────────────────────────────────────────────────

/** Every month bucket the window touches, so a 90-day window projects three EMIs. */
const monthsInWindow = (from: Date, to: Date): { month: number; year: number }[] => {
  const buckets: { month: number; year: number }[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const last = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1);

  while (cursor.getTime() <= last) {
    buckets.push({ month: cursor.getUTCMonth() + 1, year: cursor.getUTCFullYear() });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return buckets;
};

/** A `dueDay` of 31 falls on the 30th in a 30-day month, never on the 1st of the next. */
const dueDateFor = (year: number, month: number, dueDay: number): Date => {
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, Math.min(dueDay, lastDayOfMonth)));
};

/**
 * Instalments an active loan owes inside the window that have no `EMIPayment` row
 * of their own yet. Until the EMI module (Phase 7) generates the schedule this is
 * the only thing that puts a loan on the dashboard, so it is derived here and
 * flagged `isProjected` — a reminder, not a debt recorded on the books.
 */
const projectEmiInstalments = (
  emis: Awaited<ReturnType<typeof dashboardRepository.activeEmis>>,
  from: Date,
  to: Date,
): UpcomingPaymentDto[] => {
  const buckets = monthsInWindow(from, to);
  const today = startOfTodayUtc();

  return emis.flatMap((emi) => {
    const recorded = new Set(emi.payments.map((payment) => `${payment.year}-${payment.month}`));

    return buckets
      .filter((bucket) => !recorded.has(`${bucket.year}-${bucket.month}`))
      .map((bucket) => dueDateFor(bucket.year, bucket.month, emi.dueDay))
      .filter(
        (dueDate) =>
          dueDate >= from &&
          dueDate <= to &&
          // Outside the loan's own term there is nothing to pay.
          dueDate >= emi.startDate &&
          dueDate <= emi.endDate,
      )
      .map((dueDate) => ({
        // Unique per instalment, and stable — the client keys rows on it.
        id: `${emi.id}:${dueDate.toISOString().slice(0, 10)}`,
        kind: 'EMI' as const,
        label: emi.name,
        detail: emi.lenderName,
        amount: toNumber(emi.monthlyEMI),
        dueDate,
        daysUntilDue: wholeDaysBetween(today, dueDate),
        isOverdue: dueDate < today,
        status: PaymentStatus.PENDING,
        isProjected: true,
      }));
  });
};

/**
 * The month's plan reduced to one bar.
 *
 * A family-wide cap, where one is set, *is* the household's plan, so it becomes
 * the headline. Without one the per-category limits stand in — and then "spent"
 * has to be spending those limits actually cover, which is total spending less
 * the unbudgeted part. Summing the category lines instead would double-count any
 * category budgeted alongside its parent; comparing *total* spending against the
 * sum of the limits would charge the plan for categories it never covered.
 */
const budgetSnapshot = (
  comparison: Awaited<ReturnType<typeof budgetService.vsActual>>,
): BudgetSnapshotDto | null => {
  const { overall, totals, categories } = comparison;

  if (!overall && categories.length === 0) return null;

  const budgeted = overall ? overall.budgeted : totals.categoryBudgeted;
  const spent = overall ? overall.spent : round2(totals.spent - totals.unbudgetedSpent);
  const percentUsed = percentUsedOf(spent, budgeted);

  return {
    budgeted,
    spent,
    remaining: round2(budgeted - spent),
    // `Infinity` is not valid JSON — it would serialise to `null` and break the bar.
    percentUsed: Number.isFinite(percentUsed) ? percentUsed : 100,
    status: statusFor(percentUsed),
    overspentCount: totals.overspentCount,
    unbudgetedSpent: totals.unbudgetedSpent,
  };
};

// ── Service ─────────────────────────────────────────────────────────────────

export const dashboardService = {
  /**
   * The month at a glance: what came in, what went out, what was kept, how the
   * plan is holding and what is owed next.
   */
  async summary(actor: ActorContext, query: DashboardPeriodQuery): Promise<DashboardSummaryDto> {
    const { familyId } = actor;
    const period = periodDto(query);
    const previous = periodRange(previousMonthOf(query));

    const [incomeTotals, previousIncome, expenseTotals, previousExpense, comparison, obligations] =
      await Promise.all([
        incomeRepository.periodTotals(familyId, period.from, period.to),
        incomeRepository.sumBetween(familyId, previous.from, previous.to),
        expenseRepository.periodTotals(familyId, period.from, period.to),
        expenseRepository.sumBetween(familyId, previous.from, previous.to),
        budgetService.vsActual(actor, query),
        dashboardService.upcoming(actor, { days: DEFAULT_UPCOMING_DAYS }),
      ]);

    const income: ComparedTotalDto = {
      total: toNumber(incomeTotals.total),
      count: incomeTotals.count,
      previousTotal: toNumber(previousIncome),
      changePercent: changeFrom(toNumber(incomeTotals.total), toNumber(previousIncome)),
    };

    const expense: ComparedTotalDto = {
      total: toNumber(expenseTotals.total),
      count: expenseTotals.count,
      previousTotal: toNumber(previousExpense),
      changePercent: changeFrom(toNumber(expenseTotals.total), toNumber(previousExpense)),
    };

    const net = round2(income.total - expense.total);
    const previousNet = round2(income.previousTotal - expense.previousTotal);

    return {
      period,
      income,
      expense,
      net: {
        total: net,
        previousTotal: previousNet,
        changePercent: changeFrom(net, previousNet),
        // Undefined without income to keep — and negative when the month overspent,
        // which is exactly the number a family needs to see.
        savingsRate: income.total === 0 ? null : percentOf(net, income.total),
      },
      budget: budgetSnapshot(comparison),
      obligations: {
        windowDays: DEFAULT_UPCOMING_DAYS,
        count: obligations.totals.count,
        total: obligations.totals.due,
        overdueCount: obligations.totals.overdueCount,
        overdueTotal: obligations.totals.overdueTotal,
      },
    };
  },

  /**
   * EMIs, bills, rent and school fees merged into one date-ordered feed.
   *
   * Four tables, one question — "what do we owe next?" — so the merge happens
   * here rather than leaving the client to make four calls and interleave them.
   */
  async upcoming(actor: ActorContext, query: UpcomingQuery): Promise<UpcomingPaymentsDto> {
    const { familyId } = actor;
    const today = startOfTodayUtc();
    const from = addDaysUtc(today, -OVERDUE_LOOKBACK_DAYS);
    const to = endOfDayUtc(addDaysUtc(today, query.days));

    const [emiPayments, activeEmis, bills, rents, schoolFees] = await Promise.all([
      dashboardRepository.emiPayments(familyId, from, to),
      dashboardRepository.activeEmis(familyId),
      dashboardRepository.bills(familyId, from, to),
      dashboardRepository.rents(familyId, from, to),
      dashboardRepository.schoolFees(familyId, from, to),
    ]);

    const dated = (dueDate: Date) => ({
      dueDate,
      daysUntilDue: wholeDaysBetween(today, dueDate),
      isOverdue: dueDate < today,
    });

    const items: UpcomingPaymentDto[] = [
      ...emiPayments.map((payment) => ({
        id: payment.id,
        kind: 'EMI' as const,
        label: payment.emi.name,
        detail: payment.emi.lenderName,
        amount: toNumber(payment.amount),
        ...dated(payment.dueDate),
        status: payment.status,
        isProjected: false,
      })),
      ...projectEmiInstalments(activeEmis, from, to),
      ...bills.map((bill) => ({
        id: bill.id,
        kind: 'BILL' as const,
        label: bill.name,
        detail: bill.providerName,
        amount: toNumber(bill.amount),
        ...dated(bill.dueDate),
        status: bill.status,
        isProjected: false,
      })),
      ...rents.map((rent) => ({
        id: rent.id,
        kind: 'RENT' as const,
        label: rent.propertyName,
        detail: rent.landlordName,
        amount: toNumber(rent.amount),
        ...dated(rent.dueDate),
        status: rent.status,
        isProjected: false,
      })),
      ...schoolFees.map((fee) => ({
        id: fee.id,
        kind: 'SCHOOL_FEE' as const,
        label: `${fee.studentName} — ${fee.school}`,
        detail: fee.term,
        amount: toNumber(fee.amount),
        ...dated(fee.dueDate),
        status: fee.status,
        isProjected: false,
      })),
    ]
      // Soonest first, and within a day the larger obligation leads.
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime() || b.amount - a.amount);

    const overdue = items.filter((item) => item.isOverdue);

    return {
      window: { from, to, days: query.days },
      items,
      totals: {
        count: items.length,
        due: round2(items.reduce((sum, item) => sum + item.amount, 0)),
        overdueCount: overdue.length,
        overdueTotal: round2(overdue.reduce((sum, item) => sum + item.amount, 0)),
        // Every kind is listed, zeros included, so the strip does not reflow as
        // obligations come and go.
        byKind: OBLIGATION_KINDS.map((kind) => {
          const ofKind = items.filter((item) => item.kind === kind);
          return {
            kind,
            count: ofKind.length,
            total: round2(ofKind.reduce((sum, item) => sum + item.amount, 0)),
          };
        }),
      },
    };
  },

  /** Chart data: a year of cash flow, plus where the selected month's money went. */
  async charts(actor: ActorContext, query: ChartsQuery): Promise<DashboardChartsDto> {
    const { familyId } = actor;
    const period = periodDto(query);

    const [monthlyIncome, monthlyExpense, byCategory] = await Promise.all([
      incomeRepository.monthlyTotals(familyId, query.year),
      expenseRepository.monthlyTotals(familyId, query.year),
      expenseRepository.groupByCategory(familyId, period.from, period.to),
    ]);

    const cashFlow: CashFlowPointDto[] = MONTH_LABELS.map((label, index) => {
      const income = toNumber(monthlyIncome[index].total);
      const expense = toNumber(monthlyExpense[index].total);

      return {
        month: index + 1,
        label,
        income,
        expense,
        net: round2(income - expense),
        isCurrent: index + 1 === query.month,
      };
    });

    // Leaf-level, the same labels the expense list and the budget lines use —
    // "Food & Dining › Groceries" is where the money actually went.
    const slices = byCategory
      .map((row) => ({
        key: row.categoryId ?? 'uncategorised',
        label: row.category
          ? row.category.parent
            ? `${row.category.parent.name} › ${row.category.name}`
            : row.category.name
          : UNCATEGORISED_LABEL,
        color: row.category?.color ?? null,
        total: toNumber(row._sum.amount ?? new Prisma.Decimal(0)),
      }))
      .filter((slice) => slice.total > 0)
      .sort((a, b) => b.total - a.total);

    const spent = round2(slices.reduce((sum, slice) => sum + slice.total, 0));

    /**
     * The tail folds into one "Other" row instead of growing the palette. A
     * generated ninth hue is indistinguishable from an existing one under colour
     * vision deficiency, so the chart caps its classes and names the remainder.
     */
    const head = slices.slice(0, CATEGORY_SPLIT_LIMIT);
    const tail = slices.slice(CATEGORY_SPLIT_LIMIT);
    const folded =
      tail.length > 0
        ? [
            {
              key: 'other',
              label: `${OTHER_LABEL} (${tail.length})`,
              color: null,
              total: round2(tail.reduce((sum, slice) => sum + slice.total, 0)),
            },
          ]
        : [];

    const categorySplit: CategorySliceDto[] = [...head, ...folded].map((slice) => ({
      ...slice,
      percentage: percentOf(slice.total, spent),
    }));

    const income = round2(cashFlow.reduce((sum, point) => sum + point.income, 0));
    const expense = round2(cashFlow.reduce((sum, point) => sum + point.expense, 0));

    return {
      period,
      cashFlow,
      categorySplit,
      totals: { income, expense, net: round2(income - expense) },
    };
  },

  /**
   * The ranked categories the plan calls for, plus the largest single entries —
   * "Food & Dining is your biggest category" and "this one dinner was ₹8,000" are
   * different findings, and the second is usually the actionable one.
   */
  async topExpenses(actor: ActorContext, query: TopExpensesQuery): Promise<TopExpensesDto> {
    const { familyId } = actor;
    const period = periodDto(query);

    const [byCategory, largest] = await Promise.all([
      expenseRepository.groupByCategory(familyId, period.from, period.to),
      expenseRepository.topExpenses(familyId, period.from, period.to, query.limit),
    ]);

    const total = round2(
      byCategory.reduce((sum, row) => sum + toNumber(row._sum.amount ?? new Prisma.Decimal(0)), 0),
    );

    const categories = byCategory
      .map((row) => {
        const rowTotal = toNumber(row._sum.amount ?? new Prisma.Decimal(0));
        return {
          key: row.categoryId ?? 'uncategorised',
          label: row.category
            ? row.category.parent
              ? `${row.category.parent.name} › ${row.category.name}`
              : row.category.name
            : UNCATEGORISED_LABEL,
          color: row.category?.color ?? null,
          icon: row.category?.icon ?? null,
          total: rowTotal,
          count: row._count._all,
          percentage: percentOf(rowTotal, total),
        };
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, query.limit);

    return {
      period,
      categories,
      largest: largest.map((row) => ({
        id: row.id,
        description: row.description,
        amount: toNumber(row.amount),
        date: row.date,
        categoryName: row.category?.name ?? null,
      })),
      total,
    };
  },

  /** Who earned and who spent, for the month. */
  async familyContribution(
    actor: ActorContext,
    query: DashboardPeriodQuery,
  ): Promise<FamilyContributionDto> {
    const { familyId } = actor;
    const period = periodDto(query);

    const [members, incomeByMember, expenseByMember] = await Promise.all([
      dashboardRepository.activeMembers(familyId),
      incomeRepository.groupByMember(familyId, period.from, period.to),
      expenseRepository.groupByMember(familyId, period.from, period.to),
    ]);

    const incomeOf = new Map(
      incomeByMember.map((row) => [row.memberId, toNumber(row._sum.amount ?? new Prisma.Decimal(0))]),
    );
    const expenseOf = new Map(
      expenseByMember.map((row) => [
        row.memberId,
        toNumber(row._sum.amount ?? new Prisma.Decimal(0)),
      ]),
    );

    /**
     * Names come from the roster first, then from the transaction groupings — a
     * member removed mid-month still owns the rows they entered, and dropping
     * them would make the shares add up to less than 100%.
     */
    const nameOf = new Map<string, { name: string; avatar: string | null; isActive: boolean }>();

    for (const member of members) {
      nameOf.set(member.id, {
        name: `${member.user.firstName} ${member.user.lastName}`,
        avatar: member.user.avatar,
        isActive: true,
      });
    }

    for (const row of [...incomeByMember, ...expenseByMember]) {
      if (nameOf.has(row.memberId)) continue;
      nameOf.set(row.memberId, {
        name: row.member ? `${row.member.user.firstName} ${row.member.user.lastName}` : 'Former member',
        avatar: null,
        isActive: false,
      });
    }

    const totalIncome = round2([...incomeOf.values()].reduce((sum, value) => sum + value, 0));
    const totalExpense = round2([...expenseOf.values()].reduce((sum, value) => sum + value, 0));

    const contributions: MemberContributionDto[] = [...nameOf.entries()]
      .map(([memberId, identity]) => {
        const income = incomeOf.get(memberId) ?? 0;
        const expense = expenseOf.get(memberId) ?? 0;

        return {
          memberId,
          name: identity.name,
          avatar: identity.avatar,
          isActive: identity.isActive,
          income,
          expense,
          net: round2(income - expense),
          incomeShare: percentOf(income, totalIncome),
          expenseShare: percentOf(expense, totalExpense),
        };
      })
      // Biggest spender first — the question the card answers is "who spent what".
      .sort((a, b) => b.expense - a.expense || b.income - a.income);

    return {
      period,
      members: contributions,
      totals: { income: totalIncome, expense: totalExpense },
    };
  },
};
