import { z } from 'zod';
import { GoalType } from '@prisma/client';
import { amountSchema, dateSchema, idParamSchema, optionalText } from '../../shared/validators/field.validator';

const fields = {
  name: z.string().trim().min(1, 'Name the goal').max(100),
  type: z.nativeEnum(GoalType).optional(),
  targetAmount: amountSchema,
  deadline: dateSchema.optional(),
  icon: optionalText(8, 'Icon'),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour').optional().or(z.literal('').transform(() => undefined)),
  notes: optionalText(1000, 'Notes'),
};
export const createGoalSchema = z.object(fields);
export const updateGoalSchema = z.object(fields).partial().refine((value) => Object.keys(value).length > 0, 'Nothing to update');
export const contributionSchema = z.object({ amount: amountSchema, date: dateSchema.optional(), note: optionalText(500, 'Note') });
export const listGoalSchema = z.object({ completed: z.enum(['true', 'false']).transform((value) => value === 'true').optional() });
export { idParamSchema };
