import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { startOfTodayUtc } from '../../shared/utils/date.util';
import type { ContributeInput, CreateGoalInput, ListGoalsQuery, UpdateGoalInput } from './goals.types';

/**
 * Every read and write is pinned to `familyId`. A goal is a family-level record
 * (unlike income or expenses it has no authoring member), so the tenant check is
 * the whole ownership story: a foreign id resolves to `null` and becomes a 404.
 */
export const goalSelect = {
  id: true,
  name: true,
  type: true,
  targetAmount: true,
  savedAmount: true,
  deadline: true,
  icon: true,
  color: true,
  isCompleted: true,
  completedAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  contributions: { orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] },
} satisfies Prisma.GoalSelect;

export type GoalRow = Prisma.GoalGetPayload<{ select: typeof goalSelect }>;
export type ContributionRow = GoalRow['contributions'][number];

/** `contribute` reports what happened; the service turns that into errors or a DTO. */
export type ContributeResult =
  | { outcome: 'not-found' }
  | { outcome: 'already-complete' }
  | { outcome: 'ok'; goal: GoalRow };

const listWhere = (familyId: string, query: ListGoalsQuery): Prisma.GoalWhereInput => ({
  familyId,
  ...(query.completed === undefined ? {} : { isCompleted: query.completed }),
});

export const goalsRepository = {
  list(familyId: string, query: ListGoalsQuery): Promise<GoalRow[]> {
    return prisma.goal.findMany({
      where: listWhere(familyId, query),
      // Open goals first (nearest deadline at the top), achieved ones below.
      orderBy: [{ isCompleted: 'asc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
      select: goalSelect,
    });
  },

  findById(familyId: string, id: string): Promise<GoalRow | null> {
    return prisma.goal.findFirst({ where: { id, familyId }, select: goalSelect });
  },

  create(familyId: string, input: CreateGoalInput): Promise<GoalRow> {
    return prisma.goal.create({
      data: {
        familyId,
        name: input.name,
        ...(input.type !== undefined ? { type: input.type } : {}),
        targetAmount: new Prisma.Decimal(input.targetAmount.toFixed(2)),
        ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      select: goalSelect,
    });
  },

  update(id: string, input: UpdateGoalInput): Promise<GoalRow> {
    const data: Prisma.GoalUpdateInput = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.type !== undefined) data.type = input.type;
    if (input.targetAmount !== undefined) {
      data.targetAmount = new Prisma.Decimal(input.targetAmount.toFixed(2));
    }
    // Absent key = leave alone; present-but-empty = clear. Same rule as income.
    if ('deadline' in input) data.deadline = input.deadline ?? null;
    if ('icon' in input) data.icon = input.icon ?? null;
    if ('color' in input) data.color = input.color ?? null;
    if ('notes' in input) data.notes = input.notes ?? null;

    return prisma.goal.update({ where: { id }, data, select: goalSelect });
  },

  delete(id: string): Promise<void> {
    return prisma.goal.delete({ where: { id } }).then(() => undefined);
  },

  /**
   * Records one contribution and moves `savedAmount` in the **same transaction**.
   *
   * The previous version read the goal outside the transaction, computed the new
   * total in JavaScript and wrote the sum back. Two contributions racing on the
   * same goal both started from the same `savedAmount`, so one was silently
   * lost. Now the row is re-read *inside* the transaction and the total moves by
   * an atomic `increment`, which Postgres serialises — every amount lands.
   *
   * The contribution row stores the **full** amount even when it overshoots the
   * target. Capping the column but not the history left the ledger disagreeing
   * with itself: a ₹2,000 contribution to a goal needing ₹100 recorded ₹2,000 of
   * history against ₹100 of progress. Overshooting is real money given; only the
   * displayed progress clamps, never a stored figure. Completion is derived from
   * the post-increment value the update returns.
   *
   * Residual race (accepted, same philosophy as the budget NULL-unique gap):
   * two transactions can both observe `isCompleted = false` before either
   * commits. Both increments still apply; the worst case is `completedAt`
   * written twice with near-identical stamps.
   */
  async contribute(
    familyId: string,
    goalId: string,
    input: ContributeInput,
  ): Promise<ContributeResult> {
    const amount = new Prisma.Decimal(input.amount.toFixed(2));

    const goal = await prisma.$transaction(async (tx) => {
      const existing = await tx.goal.findFirst({
        where: { id: goalId, familyId },
        select: { id: true, isCompleted: true },
      });
      if (!existing) return null;

      if (existing.isCompleted) return { alreadyComplete: true as const };

      // An undated contribution lands on today at UTC midnight, like every
      // other stored date; a note is only written when supplied.
      await tx.goalContribution.create({
        data: {
          goalId,
          amount,
          date: input.date ?? startOfTodayUtc(),
          ...(input.note !== undefined ? { note: input.note } : null),
        },
      });

      const updated = await tx.goal.update({
        where: { id: goalId },
        data: { savedAmount: { increment: amount } },
        select: goalSelect,
      });

      // Decimal.js overloads valueOf to return a *string*, so relational
      // operators would compare lexicographically — always through its methods.
      if (
        !updated.isCompleted &&
        updated.targetAmount.greaterThan(0) &&
        updated.savedAmount.comparedTo(updated.targetAmount) >= 0
      ) {
        return tx.goal.update({
          where: { id: goalId },
          data: { isCompleted: true, completedAt: new Date() },
          select: goalSelect,
        });
      }

      return updated;
    });

    if (!goal) return { outcome: 'not-found' };
    if ('alreadyComplete' in goal) return { outcome: 'already-complete' };
    return { outcome: 'ok', goal };
  },
};
