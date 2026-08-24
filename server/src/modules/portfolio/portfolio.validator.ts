import { z } from 'zod';
import { AssetType, InvestmentType, LiabilityType } from '@prisma/client';
import { amountSchema, dateSchema, idParamSchema, optionalText } from '../../shared/validators/field.validator';
import { MAX_AMOUNT } from '../../shared/validators/field.validator';

/**
 * Units are a quantity, not money — `Decimal(12, 4)` in the schema, so up to
 * four decimal places are legitimate (fractional mutual-fund units) and the
 * two-decimal `amountSchema` would wrongly reject them.
 */
const unitsSchema = z.coerce
  .number({ invalid_type_error: 'Units must be a number' })
  .finite('Units must be a number')
  .positive('Units must be greater than zero')
  .max(MAX_AMOUNT, 'Units is too large')
  .refine((value) => Math.abs(value * 10_000 - Math.round(value * 10_000)) < 1e-6, {
    message: 'Units can have at most 4 decimal places',
  });

/** Rates live in `Decimal(5, 2)` — percentages up to 999.99. */
const rateSchema = z.coerce
  .number()
  .min(0, 'Rate cannot be negative')
  .max(999.99, 'Rate is too large')
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
    message: 'Rate can have at most 2 decimal places',
  });

// ── Investments ──────────────────────────────────────────────────────────────

const investmentFields = {
  type: z.nativeEnum(InvestmentType),
  name: z.string().trim().min(1, 'Name the investment').max(100),
  investedAmount: amountSchema,
  currentValue: amountSchema,
  units: unitsSchema.optional(),
  purchaseDate: dateSchema,
  notes: optionalText(1000, 'Notes'),
};

export const createInvestmentSchema = z.object(investmentFields);
export const updateInvestmentSchema = z.object(investmentFields).partial().refine(
  (value) => Object.keys(value).length > 0,
  'Nothing to update',
);

// ── Assets ───────────────────────────────────────────────────────────────────

const assetFields = {
  type: z.nativeEnum(AssetType),
  name: z.string().trim().min(1, 'Name the asset').max(100),
  value: amountSchema,
  purchaseValue: amountSchema.optional(),
  purchaseDate: dateSchema.optional(),
  description: optionalText(1000, 'Description'),
};

export const createAssetSchema = z.object(assetFields);
export const updateAssetSchema = z.object(assetFields).partial().refine(
  (value) => Object.keys(value).length > 0,
  'Nothing to update',
);

// ── Liabilities ──────────────────────────────────────────────────────────────

const liabilityFields = {
  type: z.nativeEnum(LiabilityType),
  name: z.string().trim().min(1, 'Name the liability').max(100),
  amount: amountSchema,
  interestRate: rateSchema.optional(),
  dueDate: dateSchema.optional(),
  description: optionalText(1000, 'Description'),
};

export const createLiabilitySchema = z.object(liabilityFields);
export const updateLiabilitySchema = z.object(liabilityFields).partial().refine(
  (value) => Object.keys(value).length > 0,
  'Nothing to update',
);

export { idParamSchema };
