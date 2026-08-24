import { z } from 'zod';
import { BillType, Frequency, PaymentStatus } from '@prisma/client';
import { amountSchema, dateSchema, idParamSchema, optionalText } from '../../shared/validators/field.validator';

const status = z.nativeEnum(PaymentStatus);
const frequency = z.nativeEnum(Frequency);
const dueDay = z.coerce.number().int().min(1).max(31);

export const listSchema = z.object({
  status: status.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export const billSchema = z.object({
  type: z.nativeEnum(BillType),
  name: z.string().trim().min(1).max(100),
  providerName: optionalText(100, 'Provider name'),
  amount: amountSchema,
  dueDate: dateSchema,
  isRecurring: z.boolean().optional(),
  frequency: frequency.optional(),
  notes: optionalText(1000, 'Notes'),
});
export const billUpdateSchema = billSchema.partial().refine((data) => Object.keys(data).length > 0, 'Nothing to update');

export const rentSchema = z.object({
  propertyName: z.string().trim().min(1).max(100),
  landlordName: optionalText(100, 'Landlord name'),
  landlordPhone: optionalText(30, 'Landlord phone'),
  amount: amountSchema,
  dueDay,
  dueDate: dateSchema,
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(1970).max(2100),
  notes: optionalText(1000, 'Notes'),
});
export const rentUpdateSchema = rentSchema.partial().refine((data) => Object.keys(data).length > 0, 'Nothing to update');

export const schoolFeeSchema = z.object({
  studentName: z.string().trim().min(1).max(100),
  school: z.string().trim().min(1).max(150),
  class: optionalText(50, 'Class'),
  amount: amountSchema,
  dueDate: dateSchema,
  term: optionalText(50, 'Term'),
  academicYear: optionalText(20, 'Academic year'),
  notes: optionalText(1000, 'Notes'),
});
export const schoolFeeUpdateSchema = schoolFeeSchema.partial().refine((data) => Object.keys(data).length > 0, 'Nothing to update');

export const paymentSchema = z.object({
  status: z.enum([PaymentStatus.PAID, PaymentStatus.PARTIAL, PaymentStatus.WAIVED]),
  paidDate: dateSchema.optional(),
});
export { idParamSchema };
