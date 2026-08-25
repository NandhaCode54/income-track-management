import { z } from 'zod';

export const upgradePlanSchema = z.object({
  plan: z.enum(['PRO', 'FAMILY'] as const),
  billingCycle: z.enum(['monthly', 'yearly']),
});
export type UpgradePlanForm = z.infer<typeof upgradePlanSchema>;
