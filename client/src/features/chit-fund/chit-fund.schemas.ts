import { z } from 'zod';

/** Matches the server's `Decimal(12, 2)` ceiling. */
const MAX_AMOUNT = 9_999_999_999.99;

const moneyField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}`)
    .refine((value) => Number.isFinite(Number(value)), 'Enter a valid amount')
    .refine((value) => Number(value) > 0, 'Must be greater than zero')
    .refine((value) => Number(value) <= MAX_AMOUNT, 'That is too large')
    .refine((value) => {
      const cents = Number(value) * 100;
      return Math.abs(cents - Math.round(cents)) < 1e-6;
    }, 'At most 2 decimal places');

const wholeField = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}`)
    .refine((value) => Number.isInteger(Number(value)), 'Whole numbers only')
    .refine((value) => Number(value) >= min && Number(value) <= max, `${min}–${max}`);

export const chitFundFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name the fund').max(100, 'Keep it under 100 characters'),
    organizer: z.string().trim().max(100, 'Keep it under 100 characters').optional(),
    totalAmount: moneyField('the total amount'),
    monthlyAmount: moneyField('the monthly payment'),
    totalMembers: wholeField('the member count', 2, 120),
    dueDay: wholeField('a due day', 1, 31),
    startDate: z.string().min(1, 'Pick a start month'),
    endDate: z.string().min(1, 'Pick an end month'),
  })
  // The server validates the same window; catching it here saves a round trip.
  .refine((v) => !v.startDate || !v.endDate || new Date(v.endDate) > new Date(v.startDate), {
    path: ['endDate'],
    message: 'The fund must end after it starts',
  })
  .superRefine((v, ctx) => {
    if (!v.totalAmount || !v.monthlyAmount || !v.totalMembers) return;
    const months = Number(v.totalMembers);
    const implied = Number(v.monthlyAmount) * months;
    if (Math.abs(implied - Number(v.totalAmount)) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['monthlyAmount'],
        message:
          `${months} members × this amount is ${implied.toFixed(2)}, not the total entered. ` +
          'Check either figure.',
      });
    }
  });
export type ChitFundForm = z.infer<typeof chitFundFormSchema>;

export const chitPaymentFormSchema = z.object({
  month: wholeField('a month', 1, 12),
  year: wholeField('a year', 1970, 2100),
  amount: moneyField('the amount paid'),
  paidDate: z.string().optional(),
});
export type ChitPaymentForm = z.infer<typeof chitPaymentFormSchema>;
