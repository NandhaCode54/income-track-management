import { z } from 'zod';
import { GOAL_TYPES } from '@/types/goals.types';

/** Matches the server's `Decimal(12, 2)` ceiling. */
const MAX_AMOUNT = 9_999_999_999.99;

const moneyField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}`)
    .refine((value) => Number.isFinite(Number(value)), 'Enter a valid amount')
    .refine((value) => Number(value) > 0, 'Must be greater than zero')
    .refine((value) => Number(value) <= MAX_AMOUNT, 'That is too large')
    .refine((value) => {
      const cents = Number(value) * 100;
      return Math.abs(cents - Math.round(cents)) < 1e-6;
    }, 'At most 2 decimal places');

export const goalFormSchema = z.object({
  name: z.string().trim().min(1, 'Give the goal a name').max(100, 'Keep it under 100 characters'),
  type: z.enum(GOAL_TYPES),
  targetAmount: moneyField('a target amount'),
  /** Blank deadline is allowed — some goals have no fixed end date. */
  deadline: z.string().optional(),
  notes: z.string().trim().max(1000, 'Keep it under 1000 characters').optional(),
});
export type GoalForm = z.infer<typeof goalFormSchema>;

export const contributeFormSchema = z.object({
  amount: moneyField('the amount saved'),
  date: z.string().optional(),
  note: z.string().trim().max(500, 'Keep it under 500 characters').optional(),
});
export type ContributeForm = z.infer<typeof contributeFormSchema>;
