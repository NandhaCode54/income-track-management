import { z } from 'zod';

/** Matches the server's `Decimal(12, 2)` ceiling. */
const MAX_AMOUNT = 9_999_999_999.99;

export const budgetFormSchema = z.object({
  // `<input type="number">` yields '' when empty, so coerce and check the blank first.
  amount: z
    .string()
    .trim()
    .min(1, 'Enter an amount')
    .refine((value) => Number.isFinite(Number(value)), 'Enter a valid amount')
    .refine((value) => Number(value) > 0, 'Amount must be greater than zero')
    .refine((value) => Number(value) <= MAX_AMOUNT, 'Amount is too large')
    // Compare against the rounding — float multiplication never lands exactly.
    .refine((value) => {
      const cents = Number(value) * 100;
      return Math.abs(cents - Math.round(cents)) < 1e-6;
    }, 'At most 2 decimal places'),
  /** Empty string means the family-wide budget. */
  categoryId: z.string().optional(),
});

export type BudgetForm = z.infer<typeof budgetFormSchema>;
