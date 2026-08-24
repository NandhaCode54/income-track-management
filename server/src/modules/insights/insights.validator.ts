import { z } from 'zod';

/**
 * Insights default to "now", so both parts are function defaults — the same
 * rule the dashboard follows: a captured `new Date()` would pin a long-running
 * server to whatever month it booted in.
 */
export const insightsPeriodSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).default(() => new Date().getUTCMonth() + 1),
  year: z.coerce
    .number()
    .int()
    .min(1970)
    .max(2100)
    .default(() => new Date().getUTCFullYear()),
});
