import { prisma } from '../../config/database';
import { periodRange } from '../../shared/utils/date.util';

/**
 * The raw reads insights need: one expense sweep across the whole analysis
 * window (the service does its own bucketing, because every heuristic slices
 * the same rows differently), one income sweep, and the budget lines already
 * set for the queried month.
 */
export const insightsRepository = {
  expensesInWindow(familyId: string, from: Date, to: Date) {
    return prisma.expense.findMany({
      where: { familyId, date: { gte: from, lte: to } },
      select: {
        id: true,
        amount: true,
        date: true,
        categoryId: true,
        category: { select: { name: true, parent: { select: { name: true } } } },
      },
    });
  },

  incomesInWindow(familyId: string, from: Date, to: Date) {
    return prisma.income.findMany({
      where: { familyId, date: { gte: from, lte: to } },
      select: { amount: true, date: true },
    });
  },

  budgetLinesFor(familyId: string, month: number, year: number) {
    return prisma.budget.findMany({
      where: { familyId, month, year },
      select: { categoryId: true, amount: true },
    });
  },

  monthBounds(month: number, year: number) {
    return periodRange({ month, year });
  },
};
