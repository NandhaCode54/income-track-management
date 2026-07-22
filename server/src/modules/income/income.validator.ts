import { z } from 'zod';
import { Frequency, IncomeType } from '@prisma/client';
import { INCOME_SORT_FIELDS } from './income.types';

/** `Decimal(12, 2)` — anything larger silently overflows in Postgres. */
const MAX_AMOUNT = 9_999_999_999.99;

const amountSchema = z.coerce
  .number({ invalid_type_error: 'Amount must be a number' })
  .finite('Amount must be a number')
  .positive('Amount must be greater than zero')
  .max(MAX_AMOUNT, 'Amount is too large')
  // `x * 100` is never exactly integral for a float, so compare against its rounding
  // instead of testing `Number.isInteger` — which would pass for *any* input.
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
    message: 'Amount can have at most 2 decimal places',
  });

const dateSchema = z.coerce
  .date({ invalid_type_error: 'Enter a valid date' })
  .refine((value) => value.getFullYear() >= 1970, 'Date is too far in the past')
  .refine((value) => value.getFullYear() <= 2100, 'Date is too far in the future');

const idSchema = z.string().trim().min(1, 'Identifier is required');

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .optional()
    // Empty strings from a cleared form field mean "unset", not "".
    .transform((value) => (value ? value : undefined));

/** Accepts a real JSON boolean or the `"true"`/`"false"` strings a form may send. */
const flexibleBoolean = z.union([
  z.boolean(),
  z.enum(['true', 'false']).transform((value) => value === 'true'),
]);

const incomeTypeSchema = z.nativeEnum(IncomeType, {
  errorMap: () => ({ message: 'Choose a valid income type' }),
});

const frequencySchema = z.nativeEnum(Frequency, {
  errorMap: () => ({ message: 'Choose a valid frequency' }),
});

const incomeFields = {
  type: incomeTypeSchema,
  amount: amountSchema,
  date: dateSchema,
  description: optionalText(200, 'Description'),
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
      message: 'A recurring income needs a repeating frequency',
    });
  }
  if (value.isRecurring === false && value.frequency && value.frequency !== Frequency.ONCE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['frequency'],
      message: 'Only recurring income can have a frequency',
    });
  }
};

export const createIncomeSchema = z
  .object(incomeFields)
  .superRefine((value, ctx) => {
    if (value.isRecurring && !value.frequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['frequency'],
        message: 'Choose how often this income repeats',
      });
    }
    assertRecurrenceConsistent(value, ctx);
  });

export const updateIncomeSchema = z
  .object(incomeFields)
  .partial()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nothing to update' });
    }
    assertRecurrenceConsistent(value, ctx);
  });

/** `true`/`false` arrive as strings on the query string. */
const booleanQuery = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();

export const listIncomeSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(INCOME_SORT_FIELDS).default('date'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    type: incomeTypeSchema.optional(),
    memberId: idSchema.optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    search: z.string().trim().max(100).optional(),
    isRecurring: booleanQuery,
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ['to'],
    message: '"To" date must not be before the "From" date',
  });

export const incomeSummarySchema = z.object({
  year: z.coerce.number().int().min(1970).max(2100).default(new Date().getFullYear()),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export const idParamSchema = z.object({ id: idSchema });
