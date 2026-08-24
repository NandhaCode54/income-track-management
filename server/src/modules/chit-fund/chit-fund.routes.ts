import { Router } from 'express';
import { z } from 'zod';
import { AuditAction } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenant } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { audit } from '../../middlewares/audit.middleware';
import { chitFundController } from './chit-fund.controller';
import { amountSchema, dateSchema, idParamSchema, optionalText } from '../../shared/validators/field.validator';

const createSchema = z
  .object({
    name: z.string().trim().min(1, 'Name the fund').max(100),
    organizer: optionalText(100, 'Organizer'),
    totalAmount: amountSchema,
    monthlyAmount: amountSchema,
    totalMembers: z.coerce.number().int().min(2).max(1000),
    startDate: dateSchema,
    endDate: dateSchema,
    dueDay: z.coerce.number().int().min(1).max(31),
    notes: optionalText(1000, 'Notes'),
  })
  .refine((value) => value.endDate >= value.startDate, {
    path: ['endDate'],
    message: 'End date must follow start date',
  });

const paymentSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(1970).max(2100),
  amount: amountSchema.optional(),
  paidDate: dateSchema.optional(),
  notes: optionalText(500, 'Notes'),
});

const router = Router();
router.use(authenticate, resolveTenant);

router.get('/', requirePermission('FINANCE_VIEW'), chitFundController.list);
router.post(
  '/',
  requirePermission('FINANCE_WRITE'),
  validate(createSchema),
  audit({ action: AuditAction.CREATE, entity: 'ChitFund' }),
  chitFundController.create,
);
// Declared before /:id for the usual reason.
router.post(
  '/:id/payments',
  requirePermission('FINANCE_WRITE'),
  validate(idParamSchema, 'params'),
  validate(paymentSchema),
  audit({ action: AuditAction.UPDATE, entity: 'ChitPayment' }),
  chitFundController.recordPayment,
);
router.get('/:id', requirePermission('FINANCE_VIEW'), validate(idParamSchema, 'params'), chitFundController.get);
router.delete(
  '/:id',
  requirePermission('FINANCE_DELETE'),
  validate(idParamSchema, 'params'),
  audit({ action: AuditAction.DELETE, entity: 'ChitFund' }),
  chitFundController.remove,
);

export const chitFundRoutes = router;
