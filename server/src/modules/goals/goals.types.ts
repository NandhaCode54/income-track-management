import type { GoalType } from '@prisma/client';
import type { GoalRow } from './goals.repository';

/** The safe public shape of a goal — no familyId, amounts as plain numbers. */
export interface GoalDto {
  id: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  savedAmount: number;
  /** Clamped to 100 for display; `savedAmount` carries the true figure. */
  progress: number;
  deadline: Date | null;
  icon: string | null;
  color: string | null;
  isCompleted: boolean;
  completedAt: Date | null;
  notes: string | null;
  contributions: ContributionDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ContributionDto {
  id: string;
  amount: number;
  note: string | null;
  date: Date;
}

export interface CreateGoalInput {
  name: string;
  type?: GoalType;
  targetAmount: number;
  deadline?: Date;
  icon?: string;
  color?: string;
  notes?: string;
}

export type UpdateGoalInput = Partial<CreateGoalInput>;

export interface ContributeInput {
  amount: number;
  date?: Date;
  note?: string;
}

export interface ListGoalsQuery {
  completed?: boolean;
}

export const toDto = (row: GoalRow): GoalDto => ({
  id: row.id,
  name: row.name,
  type: row.type,
  targetAmount: Number(row.targetAmount),
  savedAmount: Number(row.savedAmount),
  // A goal can be over-contributed to (see `contribute`); the bar caps at 100
  // while the amounts stay honest — the same rule the budget bars follow.
  progress:
    Number(row.targetAmount) === 0
      ? 0
      : Math.min(100, Math.round((Number(row.savedAmount) / Number(row.targetAmount)) * 1000) / 10),
  deadline: row.deadline,
  icon: row.icon,
  color: row.color,
  isCompleted: row.isCompleted,
  completedAt: row.completedAt,
  notes: row.notes,
  contributions: row.contributions.map((contribution) => ({
    id: contribution.id,
    amount: Number(contribution.amount),
    note: contribution.note,
    date: contribution.date,
  })),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
