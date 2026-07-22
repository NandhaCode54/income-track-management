import { z } from 'zod';
import { INCOME_TYPES, REPEAT_FREQUENCIES } from '@/types/income.types';

/** Matches the server's `Decimal(12, 2)` ceiling. */
const MAX_AMOUNT = 9_999_999_999.99;

export const incomeFormSchema = z
  .object({
    type: z.enum(INCOME_TYPES, { required_error: 'Choose an income type' }),
    // `<input type="number">` yields '' when empty, so coerce and check the blank first.
    amount: z
      .string()
      .trim()
      .min(1, 'Enter an amount')
      .refine((value) => Number.isFinite(Number(value)), 'Enter a valid amount')
      .refine((value) => Number(value) > 0, 'Amount must be greater than zero')
      .refine((value) => Number(value) <= MAX_AMOUNT, 'Amount is too large')
      // Compare against the rounding — `Number.isInteger(x * 100)` passes for anything.
      .refine((value) => {
        const cents = Number(value) * 100;
        return Math.abs(cents - Math.round(cents)) < 1e-6;
      }, 'At most 2 decimal places'),
    date: z.string().min(1, 'Pick a date'),
    description: z.string().trim().max(200, 'Keep it under 200 characters').optional(),
    notes: z.string().trim().max(1000, 'Keep it under 1000 characters').optional(),
    isRecurring: z.boolean(),
    frequency: z.enum(REPEAT_FREQUENCIES).optional(),
    /** Empty string means "me" — only heads and owners see this field at all. */
    memberId: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.isRecurring && !value.frequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['frequency'],
        message: 'Choose how often this repeats',
      });
    }
  });

export type IncomeForm = z.infer<typeof incomeFormSchema>;
