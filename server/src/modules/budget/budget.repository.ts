import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

const budgetSelect = {
  id: true,
  amount: true,
  month: true,
  year: true,
  categoryId: true,
  familyId: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      icon: true,
      color: true,
      parentId: true,
      parent: { select: { name: true } },
    },
  },
} satisfies Prisma.BudgetSelect;

export type BudgetRow = Prisma.BudgetGetPayload<{ select: typeof budgetSelect }>;

export const budgetRepository = {
  listForPeriod(familyId: string, month: number, year: number) {
    return prisma.budget.findMany({
      where: { familyId, month, year },
      // Nulls first puts the family-wide budget at the top of the list.
      orderBy: [{ categoryId: 'asc' }],
      select: budgetSelect,
    });
  },

  /** `findFirst` scoped by family, so a foreign id resolves to `null`, not another family's row. */
  findById(familyId: string, id: string) {
    return prisma.budget.findFirst({ where: { id, familyId }, select: budgetSelect });
  },

  /**
   * The duplicate check behind "one budget per category per month".
   *
   * The `@@unique([familyId, categoryId, month, year])` constraint covers the
   * per-category case, but Postgres treats NULLs as distinct — so it does *not*
   * stop a second family-wide budget (`categoryId IS NULL`) for the same month.
   * That case is only enforced here.
   */
  findForPeriod(familyId: string, categoryId: string | null, month: number, year: number) {
    return prisma.budget.findFirst({
      where: { familyId, categoryId, month, year },
      select: { id: true },
    });
  },

  create(familyId: string, data: { amount: Prisma.Decimal; month: number; year: number; categoryId: string | null }) {
    return prisma.budget.create({ data: { ...data, familyId }, select: budgetSelect });
  },

  update(id: string, amount: Prisma.Decimal) {
    return prisma.budget.update({ where: { id }, data: { amount }, select: budgetSelect });
  },

  delete(id: string) {
    return prisma.budget.delete({ where: { id } });
  },

  /**
   * Copies a month of budgets in one transaction: existing target rows are
   * either updated or left alone, and the rest are inserted together.
   */
  async copyPeriod(
    familyId: string,
    rows: { categoryId: string | null; amount: Prisma.Decimal }[],
    toMonth: number,
    toYear: number,
    overwrite: boolean,
  ): Promise<{ copied: number; skipped: number; overwritten: number }> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.budget.findMany({
        where: { familyId, month: toMonth, year: toYear },
        select: { id: true, categoryId: true },
      });
      const existingByCategory = new Map(existing.map((row) => [row.categoryId ?? '', row.id]));

      const toInsert = rows.filter((row) => !existingByCategory.has(row.categoryId ?? ''));
      const toReplace = rows.filter((row) => existingByCategory.has(row.categoryId ?? ''));

      if (toInsert.length > 0) {
        await tx.budget.createMany({
          data: toInsert.map((row) => ({
            familyId,
            categoryId: row.categoryId,
            amount: row.amount,
            month: toMonth,
            year: toYear,
          })),
        });
      }

      if (overwrite) {
        await Promise.all(
          toReplace.map((row) =>
            tx.budget.update({
              where: { id: existingByCategory.get(row.categoryId ?? '') as string },
              data: { amount: row.amount },
            }),
          ),
        );
      }

      return {
        copied: toInsert.length,
        skipped: overwrite ? 0 : toReplace.length,
        overwritten: overwrite ? toReplace.length : 0,
      };
    });
  },

  /** Confirms a category belongs to this family before a budget is attached to it. */
  findCategory(familyId: string, categoryId: string) {
    return prisma.expenseCategory.findFirst({
      where: { id: categoryId, familyId },
      select: { id: true, name: true, icon: true, color: true, parentId: true },
    });
  },

  /**
   * The budgets that an expense in `categoryId` counts against: the category's
   * own, its parent's, and the family-wide one. Used by the over-budget check.
   */
  findCoveringBudgets(
    familyId: string,
    categoryId: string | null,
    parentId: string | null,
    month: number,
    year: number,
  ) {
    const ids = [categoryId, parentId].filter((id): id is string => id !== null);

    return prisma.budget.findMany({
      where: {
        familyId,
        month,
        year,
        OR: [{ categoryId: null }, ...(ids.length ? [{ categoryId: { in: ids } }] : [])],
      },
      select: budgetSelect,
    });
  },
};
