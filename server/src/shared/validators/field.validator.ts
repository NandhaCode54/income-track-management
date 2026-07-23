import { z } from 'zod';

/**
 * Field-level schemas shared by every finance module. Money, dates and ids are
 * validated identically whether the row is income, an expense or a bill, so the
 * rules live in one place — a fix to the decimal check should not have to be
 * applied module by module.
 */

/** `Decimal(12, 2)` — anything larger silently overflows in Postgres. */
export const MAX_AMOUNT = 9_999_999_999.99;

export const amountSchema = z.coerce
  .number({ invalid_type_error: 'Amount must be a number' })
  .finite('Amount must be a number')
  .positive('Amount must be greater than zero')
  .max(MAX_AMOUNT, 'Amount is too large')
  // `x * 100` is never exactly integral for a float, so compare against its rounding
  // instead of testing `Number.isInteger` — which would pass for *any* input.
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
    message: 'Amount can have at most 2 decimal places',
  });

export const dateSchema = z.coerce
  .date({ invalid_type_error: 'Enter a valid date' })
  .refine((value) => value.getFullYear() >= 1970, 'Date is too far in the past')
  .refine((value) => value.getFullYear() <= 2100, 'Date is too far in the future');

export const idSchema = z.string().trim().min(1, 'Identifier is required');

export const idParamSchema = z.object({ id: idSchema });

export const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .optional()
    // Empty strings from a cleared form field mean "unset", not "".
    .transform((value) => (value ? value : undefined));

/** Accepts a real JSON boolean or the `"true"`/`"false"` strings a form may send. */
export const flexibleBoolean = z.union([
  z.boolean(),
  z.enum(['true', 'false']).transform((value) => value === 'true'),
]);

/** `true`/`false` arrive as strings on the query string. */
export const booleanQuery = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();
