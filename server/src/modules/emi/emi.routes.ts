import { Router } from 'express';
import { AuditAction } from '@prisma/client';
import { emiController } from './emi.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenant } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { audit } from '../../middlewares/audit.middleware';
import {
  calculatorSchema,
  createEmiSchema,
  idParamSchema,
  listEmiSchema,
  recordPaymentSchema,
  updateEmiSchema,
  upcomingEmiSchema,
} from './emi.validator';

const router = Router();

// Every EMI route is family-scoped: authenticate, then pin to the active workspace.
router.use(authenticate, resolveTenant);

// ── Collection reads. Static paths must precede `/:id` or they'd be swallowed by it.
router.get(
  '/calculator',
  requirePermission('FINANCE_VIEW'),
  validate(calculatorSchema, 'query'),
  emiController.calculator,
);

router.get(
  '/upcoming',
  requirePermission('FINANCE_VIEW'),
  validate(upcomingEmiSchema, 'query'),
  emiController.upcoming,
);

router.get('/', requirePermission('FINANCE_VIEW'), validate(listEmiSchema, 'query'), emiController.list);

router.get(
  '/:id',
  requirePermission('FINANCE_VIEW'),
  validate(idParamSchema, 'params'),
  emiController.getOne,
);

router.get(
  '/:id/payments',
  requirePermission('FINANCE_VIEW'),
  validate(idParamSchema, 'params'),
  emiController.listPayments,
);

// ── Writes.

/**
 * An EMI carries no `memberId`: a loan is a household obligation, not one
 * person's entry. So there is no row-level ownership rule to enforce in the
 * service the way income and expenses have one — the route guard is the whole
 * check, and it is `FINANCE_WRITE` because recording a loan the family already
 * has is bookkeeping, not a planning decision like setting a budget.
 */
router.post(
  '/',
  requirePermission('FINANCE_WRITE'),
  validate(createEmiSchema),
  audit({ action: AuditAction.CREATE, entity: 'EMI' }),
  emiController.create,
);

router.patch(
  '/:id',
  requirePermission('FINANCE_WRITE'),
  validate(idParamSchema, 'params'),
  validate(updateEmiSchema),
  audit({ action: AuditAction.UPDATE, entity: 'EMI' }),
  emiController.update,
);

/** Marking this month's instalment paid is ordinary bookkeeping — any member may. */
router.post(
  '/:id/payment',
  requirePermission('FINANCE_WRITE'),
  validate(idParamSchema, 'params'),
  validate(recordPaymentSchema),
  audit({ action: AuditAction.UPDATE, entity: 'EMIPayment' }),
  emiController.recordPayment,
);

/**
 * `FINANCE_DELETE`, unlike income and expenses, which sit on `FINANCE_WRITE` so a
 * member can undo their own mistake. There is no "their own" here: deleting a
 * loan cascades away its entire payment history for the whole household, so it
 * needs a family head.
 */
router.delete(
  '/:id',
  requirePermission('FINANCE_DELETE'),
  validate(idParamSchema, 'params'),
  audit({ action: AuditAction.DELETE, entity: 'EMI' }),
  emiController.remove,
);

export const emiRoutes = router;
