import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Prisma, GoalType } from '@prisma/client';

vi.mock('../src/config/database', async () => {
  const { createPrismaMock } = await import('./helpers/mock-db');
  return { prisma: createPrismaMock() };
});

import { prisma } from '../src/config/database';
import { resetPrismaMocks } from './helpers/mock-db';
import { goalsService } from '../src/modules/goals/goals.service';
import { NotFoundError } from '../src/shared/errors/NotFoundError';
import { ValidationError } from '../src/shared/errors/ValidationError';
import { MSG } from '../src/shared/constants/messages';

type Fn = ReturnType<typeof vi.fn>;

const goalRow = {
  id: 'goal-1',
  name: 'Emergency fund',
  type: GoalType.SAVINGS,
  targetAmount: new Prisma.Decimal(10000),
  savedAmount: new Prisma.Decimal(4000),
  deadline: new Date('2026-12-31'),
  icon: '💰',
  color: '#0af',
  isCompleted: false,
  completedAt: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  contributions: [],
};

describe('goal scoping — every repo read/write is pinned to familyId (IDOR regression)', () => {
  beforeEach(() => resetPrismaMocks(prisma));

  it('getById sends the family pin down to the query', async () => {
    (prisma.goal.findFirst as unknown as Fn).mockResolvedValue(goalRow);

    await goalsService.getById('f-1', 'goal-1');

    expect(prisma.goal.findFirst).toHaveBeenCalledWith({
      where: { id: 'goal-1', familyId: 'f-1' },
      select: expect.any(Object),
    });
  });

  it('a foreign goal id resolves to 404, never another family’s row', async () => {
    (prisma.goal.findFirst as unknown as Fn).mockResolvedValue(null);

    await expect(goalsService.getById('f-1', 'goal-other-fam')).rejects.toBeInstanceOf(NotFoundError);
    expect(prisma.goal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'goal-other-fam', familyId: 'f-1' } }),
    );
  });

  it('update refuses (404) a goal from another family before touching the DB', async () => {
    (prisma.goal.findFirst as unknown as Fn).mockResolvedValue(null);

    await expect(goalsService.update('f-1', 'goal-other-fam', { name: 'Hacked' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(prisma.goal.update).not.toHaveBeenCalled();
  });

  it('contribute gates on the family pin inside the transaction — foreign goals are not-found', async () => {
    (prisma.$transaction as unknown as Fn).mockImplementation(async (cb) => cb(prisma));
    (prisma.goal.findFirst as unknown as Fn).mockResolvedValue(null);

    await expect(goalsService.contribute('f-1', 'goal-other-fam', { amount: 100 })).rejects.toBeInstanceOf(
      NotFoundError,
    );

    const cb = (prisma.$transaction as unknown as Fn).mock.calls[0][0];
    expect(cb).toBeInstanceOf(Function);
    expect(prisma.goal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'goal-other-fam', familyId: 'f-1' } }),
    );
  });

  it('contributing to a completed goal is a 422, never an over-contribution', async () => {
    (prisma.$transaction as unknown as Fn).mockImplementation(async (cb) => cb(prisma));
    (prisma.goal.findFirst as unknown as Fn).mockResolvedValue({ id: 'goal-1', isCompleted: true });

    await expect(goalsService.contribute('f-1', 'goal-1', { amount: 100 })).rejects.toMatchObject({
      message: MSG.VALIDATION_ERROR,
    });
    expect((prisma.goalContribution.create as unknown as Fn)).not.toHaveBeenCalled();
  });

  it('completion flips on a conditional updateMany so the celebration fires exactly once per goal', async () => {
    const nearing = {
      ...goalRow,
      id: 'goal-1',
      savedAmount: new Prisma.Decimal(9990),
      targetAmount: new Prisma.Decimal(10000),
    };
    const completedRow = { ...nearing, isCompleted: true, completedAt: new Date() };

    (prisma.$transaction as unknown as Fn).mockImplementation(async (cb) => cb(prisma));
    (prisma.goal.findFirst as unknown as Fn)
      .mockResolvedValueOnce({ id: 'goal-1', isCompleted: false })
      .mockResolvedValueOnce(completedRow);
    (prisma.goalContribution.create as unknown as Fn).mockResolvedValue({ id: 'gc-1' });
    // The repository does `savedAmount: { increment: 100 }`; emulate the result —
    // now 9990 + 100 = 10090, past the 10000 target.
    (prisma.goal.update as unknown as Fn).mockResolvedValue({
      id: 'goal-1',
      isCompleted: false,
      targetAmount: new Prisma.Decimal(10000),
      savedAmount: new Prisma.Decimal(10090),
    });
    // Two racing contributors would both reach here — only one may win.
    (prisma.goal.updateMany as unknown as Fn).mockResolvedValue({ count: 1 });

    const dto = await goalsService.contribute('f-1', 'goal-1', { amount: 100 });

    expect(prisma.goal.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'goal-1', isCompleted: false } }),
    );
    expect(dto.isCompleted).toBe(true);
  });
});