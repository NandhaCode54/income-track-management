import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/errors/NotFoundError';

const decimal = (amount: number) => new Prisma.Decimal(amount.toFixed(2));
const select = { id: true, name: true, type: true, targetAmount: true, savedAmount: true, deadline: true, icon: true, color: true, notes: true, isCompleted: true, completedAt: true, createdAt: true, updatedAt: true, contributions: { orderBy: { date: 'desc' as const } } } satisfies Prisma.GoalSelect;
const toDto = (goal: Prisma.GoalGetPayload<{ select: typeof select }>) => ({ ...goal, targetAmount: Number(goal.targetAmount), savedAmount: Number(goal.savedAmount), progress: Math.min(100, Math.round((Number(goal.savedAmount) / Number(goal.targetAmount)) * 1000) / 10), contributions: goal.contributions.map((c) => ({ ...c, amount: Number(c.amount) })) });

export const goalsService = {
  async list(familyId: string, completed?: boolean) { const goals = await prisma.goal.findMany({ where: { familyId, ...(completed === undefined ? {} : { isCompleted: completed }) }, orderBy: [{ isCompleted: 'asc' }, { deadline: 'asc' }], select }); return goals.map(toDto); },
  async get(familyId: string, id: string) { const goal = await prisma.goal.findFirst({ where: { id, familyId }, select }); if (!goal) throw new NotFoundError('Goal'); return toDto(goal); },
  async create(familyId: string, input: any) { const goal = await prisma.goal.create({ data: { ...input, targetAmount: decimal(input.targetAmount), familyId }, select }); return toDto(goal); },
  async update(familyId: string, id: string, input: any) { await this.get(familyId, id); const goal = await prisma.goal.update({ where: { id }, data: { ...input, ...(input.targetAmount !== undefined ? { targetAmount: decimal(input.targetAmount) } : {}) }, select }); return toDto(goal); },
  async remove(familyId: string, id: string) { await this.get(familyId, id); await prisma.goal.delete({ where: { id } }); },
  async contribute(familyId: string, id: string, input: { amount: number; date?: Date; note?: string }) {
    const existing = await this.get(familyId, id);
    if (existing.isCompleted) throw new Error('This goal is already complete');
    const saved = Math.min(Number(existing.targetAmount), Number(existing.savedAmount) + input.amount);
    const goal = await prisma.$transaction(async (tx) => {
      await tx.goalContribution.create({ data: { goalId: id, amount: decimal(input.amount), date: input.date ?? new Date(), note: input.note } });
      return tx.goal.update({ where: { id }, data: { savedAmount: decimal(saved), isCompleted: saved >= Number(existing.targetAmount), ...(saved >= Number(existing.targetAmount) ? { completedAt: new Date() } : {}) }, select });
    });
    return toDto(goal);
  },
};
