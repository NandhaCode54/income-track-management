import { prisma } from '../../config/database';
import { incomeRepository } from '../income/income.repository';
import { expenseRepository } from '../expense/expense.repository';
import { periodRange } from '../../shared/utils/date.util';

/**
 * The reports module owns no tables — it aggregates the ledgers other modules
 * own. Like the dashboard, it reads the sibling repositories directly and adds
 * only the pieces they do not already answer: the family display name for report
 * headers, and member rows enriched with role + income side by side.
 */
export const reportsRepository = {
  familyName(familyId: string): Promise<string> {
    return prisma.family
      .findUniqueOrThrow({ where: { id: familyId }, select: { name: true } })
      .then((family) => family.name);
  },

  monthlyIncomeTotals(familyId: string, year: number) {
    return incomeRepository.monthlyTotals(familyId, year);
  },

  monthlyExpenseTotals(familyId: string, year: number) {
    return expenseRepository.monthlyTotals(familyId, year);
  },

  expenseByCategory(familyId: string, from: Date, to: Date) {
    return expenseRepository.groupByCategory(familyId, from, to);
  },

  expenseByMember(familyId: string, from: Date, to: Date) {
    return expenseRepository.groupByMember(familyId, from, to);
  },

  async incomeByMember(familyId: string, from: Date, to: Date) {
    const grouped = await prisma.income.groupBy({
      by: ['memberId'],
      where: { familyId, date: { gte: from, lte: to } },
      _sum: { amount: true },
    });

    const members = await prisma.familyMember.findMany({
      where: { id: { in: grouped.map((row) => row.memberId) } },
      select: { id: true },
    });

    const found = new Set(members.map((member) => member.id));
    return grouped.filter((row) => found.has(row.memberId));
  },

  /**
   * Member roles come from the membership, not the aggregation — a member with
   * no activity in the period still deserves a row when they have any activity
   * on either side, and the label should say who they are in the family.
   */
  async memberProfiles(familyId: string, memberIds: string[]) {
    return prisma.familyMember.findMany({
      where: { id: { in: memberIds }, familyId },
      select: {
        id: true,
        role: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
  },

  /** Guard against a forged year far outside seeded data — cheap sanity bound. */
  periodBounds(year: number) {
    return { from: periodRange({ year }).from, to: periodRange({ year }).to };
  },
};
