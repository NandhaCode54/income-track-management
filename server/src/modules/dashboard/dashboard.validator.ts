import { z } from 'zod';
import {
  DEFAULT_TOP_LIMIT,
  DEFAULT_UPCOMING_DAYS,
  MAX_TOP_LIMIT,
  MAX_UPCOMING_DAYS,
} from './dashboard.types';

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

/**
 * The dashboard opens on "now", so both parts default. The defaults are
 * **functions**: a captured `new Date()` would pin a long-running server to
 * whatever month it happened to boot in.
 */
export const dashboardPeriodSchema = z.object({
  month: monthSchema.default(() => new Date().getMonth() + 1),
  year: yearSchema.default(() => new Date().getFullYear()),
});

export const topExpensesSchema = dashboardPeriodSchema.extend({
  limit: z.coerce
    .number({ invalid_type_error: 'Limit must be a number' })
    .int()
    .min(1, 'Show at least one row')
    .max(MAX_TOP_LIMIT, `Show at most ${MAX_TOP_LIMIT} rows`)
    .default(DEFAULT_TOP_LIMIT),
});

/**
 * `/upcoming` is a forward window, not a calendar month — a bill due on the 2nd
 * of next month is exactly what the last week of this month needs to show.
 */
export const upcomingSchema = z.object({
  days: z.coerce
    .number({ invalid_type_error: 'Days must be a number' })
    .int()
    .min(1, 'Look at least one day ahead')
    .max(MAX_UPCOMING_DAYS, `Look at most ${MAX_UPCOMING_DAYS} days ahead`)
    .default(DEFAULT_UPCOMING_DAYS),
});
