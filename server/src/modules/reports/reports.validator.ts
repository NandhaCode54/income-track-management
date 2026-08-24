import { z } from 'zod';

const monthSchema = z.coerce.number().int().min(1).max(12).default(new Date().getUTCMonth() + 1);
const yearSchema = z.coerce
  .number()
  .int()
  .min(2000)
  .max(2100)
  .default(new Date().getUTCFullYear());

export const reportPeriodSchema = z.object({ month: monthSchema, year: yearSchema });
export const reportYearSchema = z.object({ year: yearSchema });

/** Category-wise / member-wise: a whole year, or one month of it. */
export const reportRangeSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: yearSchema,
});

export const reportExportSchema = z.object({
  scope: z.enum(['monthly', 'yearly']).default('monthly'),
  month: monthSchema,
  year: yearSchema,
});
