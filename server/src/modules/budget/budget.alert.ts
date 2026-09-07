import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { budgetRepository, type BudgetRow } from './budget.repository';
import { expenseRepository } from '../expense/expense.repository';
import { percentUsedOf, statusFor } from './budget.types';
import { periodRange } from '../../shared/utils/date.util';
import { logger } from '../../shared/utils/logger';

/**
 * The over-budget trigger.
 *
 * Lives in its own file rather than in `budget.service` because `expense.service`
 * calls it: `expense.service → budget.alert → expense.repository` is a chain,
 * whereas calling the budget *service* would close a cycle back through the
 * expense service. Nothing here imports an expense service.
 */

const toNumber = (value: Prisma.Decimal): number => Number(value.toFixed(2));

const formatMoney = (value: number): string =>
  value.toLocaleString('en-IN', { maximumFractionDigits: 2 });

const labelFor = (budget: BudgetRow): string => {
  if (!budget.category) return 'the family budget';
  return budget.category.parent
    ? `${budget.category.parent.name} › ${budget.category.name}`
    : budget.category.name;
};

/**
 * One notification per budget per threshold, ever.
 *
 * Without this every subsequent expense on an overspent category would fire
 * another alert. The budget id is enough of a key on its own: a budget row is
 * already unique per category *and* period.
 */
const alreadyNotified = async (budgetId: string, type: NotificationType): Promise<boolean> => {
  const existing = await prisma.notification.findFirst({
    where: { type, metadata: { path: ['budgetId'], equals: budgetId } },
    select: { id: true },
  });
  return existing !== null;
};

/**
 * Everyone active in the family is told. A budget alert is meant to change
 * behaviour, and the person who needs it most is usually whoever is about to
 * spend next — not only the head who set the limit.
 */
const activeMemberUserIds = async (familyId: string): Promise<string[]> => {
  const members = await prisma.familyMember.findMany({
    where: { familyId, isActive: true },
    select: { userId: true },
  });
  return [...new Set(members.map((member) => member.userId))];
};

const notify = async (
  budget: BudgetRow,
  type: NotificationType,
  spent: number,
  budgeted: number,
  percentUsed: number,
): Promise<void> => {
  if (await alreadyNotified(budget.id, type)) return;

  const userIds = await activeMemberUserIds(budget.familyId);
  if (userIds.length === 0) return;

  const label = labelFor(budget);
  const isOver = type === NotificationType.BUDGET_EXCEEDED;

  const title = isOver ? `Over budget: ${label}` : `Nearly over: ${label}`;
  const message = isOver
    ? `${formatMoney(spent)} spent against a ${formatMoney(budgeted)} budget — ${formatMoney(spent - budgeted)} over.`
    : `${formatMoney(spent)} of ${formatMoney(budgeted)} used (${percentUsed}%).`;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      familyId: budget.familyId,
      userId,
      type,
      title,
      message,
      metadata: {
        budgetId: budget.id,
        categoryId: budget.categoryId,
        month: budget.month,
        year: budget.year,
        spent,
        budgeted,
      },
    })),
  });
};

interface BudgetCheckContext {
  familyId: string;
  categoryId: string | null;
  month: number;
  year: number;
}

/**
 * Re-checks every budget the given category counts against — its own, its
 * parent's, and the family-wide cap — and raises a notification when a line has
 * crossed the warning threshold or gone over.
 *
 * Two things move a line: spending more, and lowering the limit. So this runs
 * after an **expense** write *and* after a **budget** write — setting a ₹5,000
 * limit on a category that has already seen ₹6,000 should warn immediately,
 * not stay silent until the next expense happens to arrive.
 *
 * Never await it on the request path: a failure to warn must not fail the write.
 * Use `runBudgetCheck`, which swallows and logs.
 */
export const checkBudgets = async (context: BudgetCheckContext): Promise<void> => {
  const { month, year } = context;

  const parent = context.categoryId
    ? await prisma.expenseCategory.findFirst({
        where: { id: context.categoryId, familyId: context.familyId },
        select: { parentId: true },
      })
    : null;

  const budgets = await budgetRepository.findCoveringBudgets(
    context.familyId,
    context.categoryId,
    parent?.parentId ?? null,
    month,
    year,
  );

  if (budgets.length === 0) return;

  // The window has to match how the summary counts a month, or an expense could
  // trip an alert it does not actually appear inside.
  const { from, to } = periodRange({ year, month });
  const grouped = await expenseRepository.groupByCategory(context.familyId, from, to);

  const spentFor = (budget: BudgetRow): number => {
    const rows = budget.categoryId
      ? grouped.filter(
          (row) =>
            row.categoryId === budget.categoryId ||
            row.category?.parentId === budget.categoryId,
        )
      : grouped;

    return (
      Math.round(
        rows.reduce((sum, row) => sum + toNumber(row._sum.amount ?? new Prisma.Decimal(0)), 0) *
          100,
      ) / 100
    );
  };

  for (const budget of budgets) {
    const budgeted = toNumber(budget.amount);
    const spent = spentFor(budget);
    const percentUsed = percentUsedOf(spent, budgeted);
    const status = statusFor(percentUsed);

    if (status === 'ON_TRACK') continue;

    await notify(
      budget,
      status === 'OVER' ? NotificationType.BUDGET_EXCEEDED : NotificationType.BUDGET_WARNING,
      spent,
      budgeted,
      Number.isFinite(percentUsed) ? percentUsed : 100,
    );
  }
};

/** Fire-and-forget wrapper: warnings are best-effort, the expense write is not. */
export const runBudgetCheck = (context: BudgetCheckContext): void => {
  void checkBudgets(context).catch((error) =>
    logger.warn('Budget check failed after an expense write', { error }),
  );
};

/**
 * The daily sweep entry point (see `jobs/budget-alert.job`).
 *
 * Evaluates every budget line in the given month across **all** families and
 * raises the same warning / exceeded notifications the request-time path does.
 * Keeping it here — next to `checkBudgets` — means the two triggers share one
 * spend definition (a parent's budget rolls up its children) and one dedupe
 * key (the budget id), so they cannot disagree or double-fire.
 */
export const checkAllBudgets = async (month: number, year: number): Promise<number> => {
  const { from, to } = periodRange({ year, month });

  // Group spend per family so each family's budgets are measured against one
  // consistent snapshot of the month's expenses.
  const familyIds = [...new Set((await prisma.budget.findMany({
    where: { month, year },
    select: { familyId: true },
  })).map((row) => row.familyId))];

  let evaluated = 0;
  for (const familyId of familyIds) {
    const budgets = await budgetRepository.listForPeriod(familyId, month, year);
    if (budgets.length === 0) continue;

    const grouped = await expenseRepository.groupByCategory(familyId, from, to);

    for (const budget of budgets) {
      const rowsForCategory = budget.categoryId
        ? grouped.filter(
            (row) =>
              row.categoryId === budget.categoryId ||
              row.category?.parentId === budget.categoryId,
          )
        : grouped;

      const spent =
        Math.round(
          rowsForCategory.reduce(
            (sum, row) => sum + toNumber(row._sum.amount ?? new Prisma.Decimal(0)),
            0,
          ) * 100,
        ) / 100;
      const budgeted = toNumber(budget.amount);
      const percentUsed = percentUsedOf(spent, budgeted);
      const status = statusFor(percentUsed);

      if (status === 'ON_TRACK') continue;
      await notify(
        budget,
        status === 'OVER' ? NotificationType.BUDGET_EXCEEDED : NotificationType.BUDGET_WARNING,
        spent,
        budgeted,
        Number.isFinite(percentUsed) ? percentUsed : 100,
      );
    }
    evaluated += budgets.length;
  }

  return evaluated;
};
