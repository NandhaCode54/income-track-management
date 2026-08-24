import { z } from 'zod';
import { BILL_TYPES, FREQUENCIES } from '@/types/payments.types';

/** Matches the server's `Decimal(12, 2)` ceiling. */
const MAX_AMOUNT = 9_999_999_999.99;

/**
 * `<input type="number">` yields `''` when empty, so every numeric field is
 * validated as a string and converted at submit — the same rule emi.schemas
 * established. `Number('')` is `0`, which would silently pass a required check.
 */
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

const wholeBetween = (
  label: string,
  min: number,
  max: number,
) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}`)
    .refine((value) => Number.isInteger(Number(value)), 'Whole numbers only')
    .refine((value) => Number(value) >= min && Number(value) <= max, `${min}–${max}`);

const name = z.string().trim().min(1, 'Required').max(100, 'Keep it under 100 characters');
const optional = (max: number, label: string) =>
  z.string().trim().max(max, `Keep ${label} under ${max} characters`).optional();

export const billFormSchema = z
  .object({
    type: z.enum(BILL_TYPES),
    name,
    providerName: optional(100, 'the provider name'),
    amount: moneyField('the amount'),
    dueDate: z.string().min(1, 'Pick a due date'),
    /**
     * The recurrence bug this schema exists to prevent: the old form hardcoded
     * `isRecurring: true, frequency: 'MONTHLY'`. Recurrence is now opt-in and
     * the refinement below makes the frequency mandatory whenever it is on.
     */
    isRecurring: z.boolean(),
    frequency: z.enum(FREQUENCIES).optional(),
    notes: optional(1000, 'notes'),
  })
  .refine((v) => !v.isRecurring || !!v.frequency, {
    path: ['frequency'],
    message: 'Choose how often this bill repeats',
  });
export type BillForm = z.infer<typeof billFormSchema>;

export const rentFormSchema = z.object({
  propertyName: name,
  landlordName: optional(100, 'the landlord name'),
  landlordPhone: z
    .string()
    .trim()
    .max(30, 'Keep it under 30 characters')
    .optional(),
  amount: moneyField('the rent amount'),
  dueDay: wholeBetween('a due day', 1, 31),
  month: wholeBetween('a month', 1, 12),
  year: wholeBetween('a year', 1970, 2100),
  notes: optional(1000, 'notes'),
});
export type RentForm = z.infer<typeof rentFormSchema>;

export const schoolFeeFormSchema = z.object({
  studentName: name,
  school: z.string().trim().min(1, 'Enter the school').max(150, 'Keep it under 150 characters'),
  class: optional(50, 'the class name'),
  amount: moneyField('the fee amount'),
  dueDate: z.string().min(1, 'Pick a due date'),
  term: optional(50, 'the term'),
  academicYear: optional(20, 'the academic year'),
});
export type SchoolFeeForm = z.infer<typeof schoolFeeFormSchema>;

export const recordPaymentFormSchema = z.object({
  /** WAIVED keeps paidDate null on the server; the field is disabled for it. */
  status: z.enum(['PAID', 'PARTIAL', 'WAIVED']),
  paidDate: z.string().min(1, 'Pick the date it was paid').optional(),
}).refine(
  (v) => v.status === 'WAIVED' || !!v.paidDate,
  { path: ['paidDate'], message: 'Pick the date it was paid' },
);
export type RecordPaymentForm = z.infer<typeof recordPaymentFormSchema>;
