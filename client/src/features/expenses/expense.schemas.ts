import { z } from 'zod';
import { REPEAT_FREQUENCIES } from '@/types/income.types';
import { MAX_TAGS, PAYMENT_METHODS } from '@/types/expense.types';

/** Matches the server's `Decimal(12, 2)` ceiling. */
const MAX_AMOUNT = 9_999_999_999.99;

export const expenseFormSchema = z
  .object({
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
    description: z
      .string()
      .trim()
      .min(1, 'Describe what this was for')
      .max(200, 'Keep it under 200 characters'),
    date: z.string().min(1, 'Pick a date'),
    /** Empty string means "no category". */
    categoryId: z.string().optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional().or(z.literal('')),
    // One text field, comma separated — a tag pill editor is more UI than this earns.
    tags: z
      .string()
      .optional()
      .refine(
        (value) => splitTags(value ?? '').length <= MAX_TAGS,
        `Use at most ${MAX_TAGS} tags`,
      )
      .refine(
        (value) => splitTags(value ?? '').every((tag) => tag.length <= 30),
        'Each tag must be 30 characters or fewer',
      ),
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

export type ExpenseForm = z.infer<typeof expenseFormSchema>;

/** Splits the tag input, trimming and dropping blanks and case-insensitive repeats. */
export const splitTags = (value: string): string[] => {
  const seen = new Set<string>();
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => {
      if (!tag || seen.has(tag.toLowerCase())) return false;
      seen.add(tag.toLowerCase());
      return true;
    });
};

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Name the category').max(50, 'Keep it under 50 characters'),
  icon: z.string().trim().max(8, 'One emoji is plenty').optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Pick a colour')
    .optional()
    .or(z.literal('')),
  /** Empty string means top level. */
  parentId: z.string().optional(),
});

export type CategoryForm = z.infer<typeof categoryFormSchema>;
