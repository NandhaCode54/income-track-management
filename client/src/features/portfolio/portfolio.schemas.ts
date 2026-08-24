import { z } from 'zod';
import {
  ASSET_TYPES,
  INVESTMENT_TYPES,
  LIABILITY_TYPES,
} from '@/types/portfolio.types';

/** Matches the server's `Decimal(12, 2)` money ceiling. */
const MAX_AMOUNT = 9_999_999_999.99;
/** Matches the server's `Decimal(12, 4)` units ceiling. */
const MAX_UNITS = 999_999_999.9999;

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

const optionalMoney = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || (Number.isFinite(Number(value)) && Number(value) > 0),
      `Enter ${label}, or leave it blank`,
    );

const unitsField = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || (Number.isFinite(Number(value)) && Number(value) > 0),
    'Enter the unit count, or leave it blank',
  )
  .refine((value) => !value || Number(value) <= MAX_UNITS, 'That is too many units');

const rateField = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || (Number.isFinite(Number(value)) && Number(value) >= 0),
    'Enter a valid rate, or leave it blank',
  )
  .refine((value) => !value || Number(value) <= 99.99, 'That rate looks too high');

const name = z.string().trim().min(1, 'Required').max(100, 'Keep it under 100 characters');
const description = z.string().trim().max(1000, 'Keep it under 1000 characters').optional();

export const investmentFormSchema = z.object({
  type: z.enum(INVESTMENT_TYPES),
  name,
  investedAmount: moneyField('the invested amount'),
  currentValue: moneyField('the current value'),
  units: unitsField,
  purchaseDate: z.string().min(1, 'Pick the purchase date'),
  notes: description,
});
export type InvestmentForm = z.infer<typeof investmentFormSchema>;

export const assetFormSchema = z.object({
  type: z.enum(ASSET_TYPES),
  name,
  value: moneyField('the current value'),
  purchaseValue: optionalMoney('what you paid'),
  purchaseDate: z.string().optional(),
  description,
});
export type AssetForm = z.infer<typeof assetFormSchema>;

export const liabilityFormSchema = z.object({
  type: z.enum(LIABILITY_TYPES),
  name,
  amount: moneyField('the outstanding amount'),
  interestRate: rateField,
  dueDate: z.string().optional(),
  description,
});
export type LiabilityForm = z.infer<typeof liabilityFormSchema>;
