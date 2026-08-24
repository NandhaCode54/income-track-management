import { z } from 'zod';
import { EMI_STATUSES, RECORDABLE_STATUSES } from '@/types/emi.types';

/** Matches the server's `Decimal(12, 2)` ceiling. */
const MAX_AMOUNT = 9_999_999_999.99;

/** Mirrors `MAX_TENURE_MONTHS` on the server. */
const MAX_TENURE_MONTHS = 480;

/**
 * `<input type="number">` yields `''` when empty, so every numeric field is
 * validated as a string and converted at submit. Checking `Number('')` first
 * would pass, because `Number('')` is `0`.
 */
const moneyField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}`)
    .refine((value) => Number.isFinite(Number(value)), 'Enter a valid amount')
    .refine((value) => Number(value) > 0, 'Must be greater than zero')
    .refine((value) => Number(value) <= MAX_AMOUNT, 'That is too large')
    // Compare against the rounding — `Number.isInteger(x * 100)` passes for anything.
    .refine((value) => {
      const cents = Number(value) * 100;
      return Math.abs(cents - Math.round(cents)) < 1e-6;
    }, 'At most 2 decimal places');

export const emiFormSchema = z.object({
  name: z.string().trim().min(1, 'Give the loan a name').max(100, 'Keep it under 100 characters'),
  lenderName: z.string().trim().max(100, 'Keep it under 100 characters').optional(),
  loanAmount: moneyField('the loan amount'),
  /** Zero is valid: no-cost EMIs and family loans really do carry no interest. */
  interestRate: z
    .string()
    .trim()
    .min(1, 'Enter an interest rate')
    .refine((value) => Number.isFinite(Number(value)), 'Enter a valid rate')
    .refine((value) => Number(value) >= 0, 'Rate cannot be negative')
    .refine((value) => Number(value) <= 99.99, 'That rate looks too high'),
  tenureMonths: z
    .string()
    .trim()
    .min(1, 'Enter the tenure')
    .refine((value) => Number.isInteger(Number(value)), 'Whole months only')
    .refine((value) => Number(value) >= 1, 'At least one month')
    .refine((value) => Number(value) <= MAX_TENURE_MONTHS, `At most ${MAX_TENURE_MONTHS} months`),
  /** Blank means "work it out for me"; a value means the lender stated it. */
  monthlyEMI: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || (Number.isFinite(Number(value)) && Number(value) > 0),
      'Enter a valid instalment, or leave it blank',
    ),
  startDate: z.string().min(1, 'Pick a start date'),
  dueDay: z
    .string()
    .trim()
    .min(1, 'Pick a due day')
    .refine((value) => Number.isInteger(Number(value)), 'Whole days only')
    .refine((value) => Number(value) >= 1 && Number(value) <= 31, 'Between 1 and 31'),
  status: z.enum(EMI_STATUSES).optional(),
  notes: z.string().trim().max(1000, 'Keep it under 1000 characters').optional(),
});

export type EmiForm = z.infer<typeof emiFormSchema>;

export const recordPaymentSchema = z.object({
  /**
   * Which instalment. The form works in payment ids because that is what the
   * dropdown lists; the month/year the API actually wants is read off the
   * selected row at submit, so a stale id can never be posted as a valid period.
   */
  paymentId: z.string().min(1, 'Choose an instalment'),
  amount: moneyField('the amount paid'),
  paidDate: z.string().min(1, 'Pick the date it was paid'),
  status: z.enum(RECORDABLE_STATUSES),
  notes: z.string().trim().max(500, 'Keep it under 500 characters').optional(),
});

export type RecordPaymentForm = z.infer<typeof recordPaymentSchema>;

export const calculatorSchema = z.object({
  loanAmount: moneyField('a loan amount'),
  interestRate: z
    .string()
    .trim()
    .min(1, 'Enter an interest rate')
    .refine((value) => Number.isFinite(Number(value)), 'Enter a valid rate')
    .refine((value) => Number(value) >= 0, 'Rate cannot be negative')
    .refine((value) => Number(value) <= 99.99, 'That rate looks too high'),
  tenureMonths: z
    .string()
    .trim()
    .min(1, 'Enter the tenure')
    .refine((value) => Number.isInteger(Number(value)), 'Whole months only')
    .refine((value) => Number(value) >= 1, 'At least one month')
    .refine((value) => Number(value) <= MAX_TENURE_MONTHS, `At most ${MAX_TENURE_MONTHS} months`),
});

export type CalculatorForm = z.infer<typeof calculatorSchema>;
