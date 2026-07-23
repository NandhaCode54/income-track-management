import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { DEFAULT_EXPENSE_CATEGORIES } from '../../shared/constants/categories';

const categorySelect = {
  id: true,
  name: true,
  icon: true,
  color: true,
  parentId: true,
  isDefault: true,
  createdAt: true,
  _count: { select: { expenses: true } },
} satisfies Prisma.ExpenseCategorySelect;

export type CategoryRow = Prisma.ExpenseCategoryGetPayload<{ select: typeof categorySelect }>;

export interface WriteCategoryData {
  name: string;
  icon: string | null;
  color: string | null;
  parentId: string | null;
}

export const categoryRepository = {
  listAll(familyId: string) {
    return prisma.expenseCategory.findMany({
      where: { familyId },
      orderBy: [{ name: 'asc' }],
      select: categorySelect,
    });
  },

  findById(familyId: string, id: string) {
    return prisma.expenseCategory.findFirst({ where: { id, familyId }, select: categorySelect });
  },

  /**
   * Duplicate detection is case-insensitive and scoped to one level: two
   * top-level categories may not share a name, and neither may two children of
   * the same parent — but "Other" under Food and "Other" under Travel are fine.
   */
  findByName(familyId: string, name: string, parentId: string | null, excludeId?: string) {
    return prisma.expenseCategory.findFirst({
      where: {
        familyId,
        parentId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  },

  countChildren(familyId: string, parentId: string) {
    return prisma.expenseCategory.count({ where: { familyId, parentId } });
  },

  count(familyId: string) {
    return prisma.expenseCategory.count({ where: { familyId } });
  },

  create(familyId: string, data: WriteCategoryData) {
    return prisma.expenseCategory.create({ data: { ...data, familyId }, select: categorySelect });
  },

  update(id: string, data: Partial<WriteCategoryData>) {
    return prisma.expenseCategory.update({ where: { id }, data, select: categorySelect });
  },

  delete(id: string) {
    return prisma.expenseCategory.delete({ where: { id } });
  },

  /**
   * Seeds the starter set for a family that has none.
   *
   * The count is re-checked inside the transaction so two requests racing on a
   * first page load cannot both decide the list is empty and seed it twice.
   */
  async ensureDefaults(familyId: string): Promise<number> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.expenseCategory.count({ where: { familyId } });
      if (existing > 0) return 0;

      const created = await tx.expenseCategory.createMany({
        data: DEFAULT_EXPENSE_CATEGORIES.map((category) => ({
          familyId,
          name: category.name,
          icon: category.icon,
          color: category.color,
          isDefault: true,
        })),
      });

      return created.count;
    });
  },

  /** Bulk-creates categories named in a CSV import that the family did not have. */
  createManyByName(familyId: string, names: string[]) {
    return prisma.expenseCategory.createMany({
      data: names.map((name) => ({ familyId, name })),
    });
  },
};
