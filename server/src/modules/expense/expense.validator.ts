import { z } from 'zod';
import { Frequency } from '@prisma/client';
import { EXPENSE_SORT_FIELDS, MAX_TAGS, PAYMENT_METHODS } from './expense.types';
import {
  amountSchema,
  booleanQuery,
  dateSchema,
  flexibleBoolean,
  idSchema,
  optionalText,
} from '../../shared/validators/field.validator';

const frequencySchema = z.nativeEnum(Frequency, {
  errorMap: () => ({ message: 'Choose a valid frequency' }),
});

const paymentMethodSchema = z.enum(PAYMENT_METHODS, {
  errorMap: () => ({ message: 'Choose a valid payment method' }),
});

/**
 * Tags arrive as an array from JSON, but a form or query string sends one comma
 * separated string. Both are normalised to a trimmed, de-duplicated list —
 * casing is preserved for display, but duplicates are matched case-insensitively
 * so "Groceries" and "groceries" cannot both be attached to one expense.
 */
const tagsSchema = z
  .union([z.array(z.string()), z.string()])
  .transform((value) => (Array.isArray(value) ? value : value.split(',')))
  .transform((values) => {
    const seen = new Set<string>();
    return values
      .map((tag) => tag.trim())
      .filter((tag) => {
        if (!tag || seen.has(tag.toLowerCase())) return false;
        seen.add(tag.toLowerCase());
        return true;
      });
  })
  .refine((tags) => tags.length <= MAX_TAGS, `Use at most ${MAX_TAGS} tags`)
  .refine(
    (tags) => tags.every((tag) => tag.length <= 30),
    'Each tag must be 30 characters or fewer',
  )
  .optional();

const expenseFields = {
  amount: amountSchema,
  description: z
    .string()
    .trim()
    .min(1, 'Describe what this was for')
    .max(200, 'Description must be 200 characters or fewer'),
  date: dateSchema,
  // An empty string is how a cleared "no category" dropdown arrives.
  categoryId: idSchema.optional().or(z.literal('').transform(() => undefined)),
  paymentMethod: paymentMethodSchema.optional().or(z.literal('').transform(() => undefined)),
  tags: tagsSchema,
  notes: optionalText(1000, 'Notes'),
  isRecurring: flexibleBoolean.default(false),
  frequency: frequencySchema.optional(),
  memberId: idSchema.optional(),
};

/**
 * A recurring entry needs a repeating frequency; a one-off must not carry one.
 * On update the flag may be absent, in which case the service re-checks against
 * the stored row — this only catches what the payload itself contradicts.
 */
const assertRecurrenceConsistent = (
  value: { isRecurring?: boolean; frequency?: Frequency },
  ctx: z.RefinementCtx,
): void => {
  if (value.isRecurring === true && value.frequency === Frequency.ONCE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['frequency'],
      message: 'A recurring expense needs a repeating frequency',
    });
  }
  if (value.isRecurring === false && value.frequency && value.frequency !== Frequency.ONCE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['frequency'],
      message: 'Only recurring expenses can have a frequency',
    });
  }
};

export const createExpenseSchema = z.object(expenseFields).superRefine((value, ctx) => {
  if (value.isRecurring && !value.frequency) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['frequency'],
      message: 'Choose how often this expense repeats',
    });
  }
  assertRecurrenceConsistent(value, ctx);
});

export const updateExpenseSchema = z
  .object(expenseFields)
  .partial()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nothing to update' });
    }
    assertRecurrenceConsistent(value, ctx);
  });

const listFilters = {
  categoryId: idSchema.optional(),
  memberId: idSchema.optional(),
  paymentMethod: paymentMethodSchema.optional(),
  tag: z.string().trim().max(30).optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  search: z.string().trim().max(100).optional(),
  isRecurring: booleanQuery,
  uncategorized: booleanQuery,
};

/** Both ends of every range must be the right way round, whatever the caller sent. */
const assertRangesOrdered = (
  value: { from?: Date; to?: Date; minAmount?: number; maxAmount?: number },
  ctx: z.RefinementCtx,
): void => {
  if (value.from && value.to && value.from > value.to) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['to'],
      message: '"To" date must not be before the "From" date',
    });
  }
  if (
    value.minAmount !== undefined &&
    value.maxAmount !== undefined &&
    value.minAmount > value.maxAmount
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['maxAmount'],
      message: 'Maximum amount must not be below the minimum',
    });
  }
};

export const listExpenseSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(EXPENSE_SORT_FIELDS).default('date'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    ...listFilters,
  })
  .superRefine(assertRangesOrdered);

/** The export reuses the list filters, minus paging — it always returns the whole match. */
export const exportExpenseSchema = z
  .object({
    sortBy: z.enum(EXPENSE_SORT_FIELDS).default('date'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    ...listFilters,
  })
  .superRefine(assertRangesOrdered);

export const expenseSummarySchema = z.object({
  year: z.coerce.number().int().min(1970).max(2100).default(new Date().getFullYear()),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

/** `/:id/receipts/:receiptId` — both ids are validated, not just the expense. */
export const receiptParamsSchema = z.object({ id: idSchema, receiptId: idSchema });

export const importExpenseSchema = z.object({
  // Multipart text fields are always strings, so this can never be a real boolean.
  createMissingCategories: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
});

// ── Categories ──────────────────────────────────────────────────────────────

/** A hex colour; the UI paints it directly into a style attribute. */
const colorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #f97316')
  .optional()
  .or(z.literal('').transform(() => undefined));

const categoryFields = {
  name: z
    .string()
    .trim()
    .min(1, 'Name the category')
    .max(50, 'Name must be 50 characters or fewer'),
  // Emoji or a short glyph — long enough for any single pictograph.
  icon: optionalText(8, 'Icon'),
  color: colorSchema,
  parentId: idSchema.optional().or(z.literal('').transform(() => undefined)),
};

export const createCategorySchema = z.object(categoryFields);

export const updateCategorySchema = z
  .object({
    ...categoryFields,
    // `null` is meaningful here: it promotes a subcategory to the top level,
    // which an omitted key cannot express.
    parentId: categoryFields.parentId.nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update');
