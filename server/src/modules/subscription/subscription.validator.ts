import { z } from 'zod';
import { PlanType } from '@prisma/client';

export const upgradePlanSchema = z.object({
  plan: z.nativeEnum(PlanType).refine((v) => v !== 'FREE', 'Cannot upgrade to Free plan'),
  billingCycle: z.enum(['monthly', 'yearly']),
  paymentMethod: z.string().trim().max(50).optional(),
  externalId: z.string().trim().max(200).optional(),
});

export const cancelSubscriptionSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const changePlanSchema = z.object({
  plan: z.nativeEnum(PlanType),
});
