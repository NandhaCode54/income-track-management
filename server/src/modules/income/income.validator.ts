import { z } from 'zod';
import { Frequency, IncomeType } from '@prisma/client';
import { INCOME_SORT_FIELDS } from './income.types';
import {
  amountSchema,
  booleanQuery,
  dateSchema,
  flexibleBoolean,
  idSchema,
  optionalText,
} from '../../shared/validators/field.validator';

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

export { idParamSchema } from '../../shared/validators/field.validator';
