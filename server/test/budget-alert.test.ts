import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationType, Prisma } from '@prisma/client';

vi.mock('../src/config/database', async () => {
  const { createPrismaMock } = await import('./helpers/mock-db');
  return { prisma: createPrismaMock() };
});

import { prisma } from '../src/config/database';
import { resetPrismaMocks } from './helpers/mock-db';
import { checkAllBudgets } from '../src/modules/budget/budget.alert';
import { periodRange } from '../src/shared/utils/date.util';

type PrismaMock = typeof prisma;

const decimal = (n: number) => new Prisma.Decimal(n);
const { from, to } = periodRange({ year: 2026, month: 9 });

const parentBudget = {
  id: 'budget-parent',
  amount: decimal(5000),
  month: 9,
  year: 2026,
  categoryId: 'cat-par',
  familyId: 'f-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  category: { id: 'cat-par', name: 'Food', icon: '🍽', color: '#f00', parentId: null, parent: null },
};

const spentOnChild = {
  categoryId: 'cat-child',
  _sum: { amount: decimal(6000) },
  _count: { _all: 3 },
  category: { id: 'cat-child', name: 'Groceries', color: '#0f0', icon: '🛒', parentId: 'cat-par', parent: { name: 'Food' } },
};

describe('checkAllBudgets — shared evaluation & dedupe (regression, bugs 4 + 5)', () => {
  beforeEach(() => resetPrismaMocks(prisma));

  it('rolls a child category’s spend up into its parent’s budget and flags the parent as exceeded', async () => {
    (prisma.budget.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ familyId: 'f-1' }]) // distinct families
      .mockResolvedValueOnce([parentBudget]); // listForPeriod
    (prisma.expense.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
      { categoryId: 'cat-child', _sum: { amount: decimal(6000) }, _count: { _all: 3 } },
    ]);
    (prisma.expenseCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      spentOnChild.category,
    ]);
    (prisma.notification.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.familyMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { familyId: 'f-1', userId: 'user-a' },
    ]);
    (prisma.notification.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

    const evaluated = await checkAllBudgets(9, 2026);

    expect(evaluated).toBe(1);
    expect(prisma.expense.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { familyId: 'f-1', date: { gte: from, lte: to } } }),
    );
    const created = (prisma.notification.createMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const first = created.data[0];
    expect(first.type).toBe(NotificationType.BUDGET_EXCEEDED);
    expect(first.metadata.budgetId).toBe('budget-parent');
    expect(first.metadata.spent).toBe(6000);
  });

  it('never raises a second alert for the same budget + threshold (dedupe via budget id)', async () => {
    // Same fixture but an alert already exists for this budget.
    (prisma.budget.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ familyId: 'f-1' }])
      .mockResolvedValueOnce([parentBudget]);
    (prisma.expense.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
      { categoryId: 'cat-child', _sum: { amount: decimal(6000) }, _count: { _all: 3 } },
    ]);
    (prisma.expenseCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      spentOnChild.category,
    ]);
    (prisma.notification.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'n-1' });
    (prisma.familyMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { familyId: 'f-1', userId: 'user-a' },
    ]);

    const evaluated = await checkAllBudgets(9, 2026);

    expect(evaluated).toBe(1);
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('leaves an on-track budget alone', async () => {
    (prisma.budget.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ familyId: 'f-1' }])
      .mockResolvedValueOnce([
        { ...parentBudget, categoryId: null, category: null, amount: decimal(99999) },
      ]);
    (prisma.expense.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
      { categoryId: null, _sum: { amount: decimal(10) }, _count: { _all: 1 } },
    ]);
    (prisma.expenseCategory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.notification.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const evaluated = await checkAllBudgets(9, 2026);

    expect(evaluated).toBe(1);
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });
});