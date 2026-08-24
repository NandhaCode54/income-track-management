import { z } from 'zod';
import { EMIStatus, PaymentStatus } from '@prisma/client';
import { EMI_SORT_FIELDS, DEFAULT_UPCOMING_DAYS } from './emi.types';
import { MAX_TENURE_MONTHS } from '../../shared/utils/emi-calculator.util';
import {
  amountSchema,
  dateSchema,
  optionalText,
} from '../../shared/validators/field.validator';

/**
 * A rate of zero is valid — no-cost EMIs and family loans are real. The cap is
 * `Decimal(5, 2)`, so 999.99 is the largest value the column can hold.
 */
const interestRateSchema = z.coerce
  .number({ invalid_type_error: 'Interest rate must be a number' })
  .finite('Interest rate must be a number')
  .min(0, 'Interest rate cannot be negative')
  .max(99.99, 'Interest rate looks too high')
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
    message: 'Interest rate can have at most 2 decimal places',
  });

const tenureSchema = z.coerce
  .number({ invalid_type_error: 'Tenure must be a number' })
  .int('Tenure must be a whole number of months')
  .min(1, 'Tenure must be at least one month')
  .max(MAX_TENURE_MONTHS, `Tenure cannot exceed ${MAX_TENURE_MONTHS} months`);

/**
 * The day of the month the instalment is taken.
 *
 * 29–31 are allowed and clamped to the last day of a short month when the
 * schedule is generated, rather than being rejected — plenty of loans really are
 * debited on the 31st, and refusing the input would force a wrong answer.
 */
const dueDaySchema = z.coerce
  .number({ invalid_type_error: 'Due day must be a number' })
  .int('Due day must be a whole number')
  .min(1, 'Due day must be between 1 and 31')
  .max(31, 'Due day must be between 1 and 31');

const emiStatusSchema = z.nativeEnum(EMIStatus, {
  errorMap: () => ({ message: 'Choose a valid loan status' }),
});

/**
 * Only the statuses that make sense for recording a payment. `PENDING` is where
 * an instalment starts and `OVERDUE` is set by the reminder job — neither is
 * something a user "records", so offering them here would let the UI undo the
 * schedule's own bookkeeping through the payment endpoint.
 */
const paymentStatusSchema = z.enum([PaymentStatus.PAID, PaymentStatus.PARTIAL, PaymentStatus.WAIVED], {
  errorMap: () => ({ message: 'Choose a valid payment status' }),
});

const emiFields = {
  name: z.string().trim().min(1, 'Give the loan a name').max(100, 'Name must be 100 characters or fewer'),
  lenderName: optionalText(100, 'Lender name'),
  loanAmount: amountSchema,
  interestRate: interestRateSchema,
  tenureMonths: tenureSchema,
  monthlyEMI: amountSchema.optional(),
  startDate: dateSchema,
  dueDay: dueDaySchema,
  notes: optionalText(1000, 'Notes'),
};

export const createEmiSchema = z.object(emiFields);

/**
 * Everything is optional, and *which* of these the service will actually accept
 * depends on whether the loan has been paid against — a rule the validator
 * cannot see, because it does not know the row. Terms rejected there come back
 * as a 422 all the same.
 */
export const updateEmiSchema = z
  .object({ ...emiFields, status: emiStatusSchema })
  .partial()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nothing to update' });
    }
  });

export const listEmiSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(EMI_SORT_FIELDS).default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: emiStatusSchema.optional(),
  search: z.string().trim().max(100).optional(),
});

export const recordPaymentSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(1970).max(2100),
  amount: amountSchema.optional(),
  paidDate: dateSchema.optional(),
  status: paymentStatusSchema.default(PaymentStatus.PAID),
  notes: optionalText(500, 'Notes'),
});

/**
 * The calculator is a pure function of these three, so they are all required —
 * defaulting a loan amount would produce a confident answer to a question nobody
 * asked.
 */
export const calculatorSchema = z.object({
  loanAmount: amountSchema,
  interestRate: interestRateSchema,
  tenureMonths: tenureSchema,
});

export const upcomingEmiSchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(DEFAULT_UPCOMING_DAYS),
});

export { idParamSchema } from '../../shared/validators/field.validator';
