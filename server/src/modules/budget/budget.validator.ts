import { z } from 'zod';
import { amountSchema, flexibleBoolean, idSchema } from '../../shared/validators/field.validator';

const monthSchema = z.coerce
  .number({ invalid_type_error: 'Choose a month' })
  .int()
  .min(1, 'Choose a month between 1 and 12')
  .max(12, 'Choose a month between 1 and 12');

const yearSchema = z.coerce
  .number({ invalid_type_error: 'Choose a year' })
  .int()
  .min(1970, 'Year is too far in the past')
  .max(2100, 'Year is too far in the future');

export const createBudgetSchema = z.object({
  amount: amountSchema,
  month: monthSchema,
  year: yearSchema,
  // An empty string is how "no category — this is the overall budget" arrives
  // from a cleared dropdown.
  categoryId: idSchema.optional().or(z.literal('').transform(() => undefined)),
});

export const updateBudgetSchema = z.object({ amount: amountSchema });

/**
 * Defaults to the current month so the UI can open without naming a period.
 * The defaults are functions, not values: a captured `new Date()` would pin a
 * long-running server to whatever month it booted in.
 */
export const budgetPeriodSchema = z.object({
  month: monthSchema.default(() => new Date().getMonth() + 1),
  year: yearSchema.default(() => new Date().getFullYear()),
});

export const copyBudgetsSchema = z
  .object({
    fromMonth: monthSchema,
    fromYear: yearSchema,
    toMonth: monthSchema,
    toYear: yearSchema,
    overwrite: flexibleBoolean.default(false),
  })
  .refine((value) => value.fromMonth !== value.toMonth || value.fromYear !== value.toYear, {
    path: ['toMonth'],
    message: 'Choose a different month to copy into',
  });
