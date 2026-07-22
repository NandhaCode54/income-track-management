import { Router } from 'express';
import { AuditAction } from '@prisma/client';
import { incomeController } from './income.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenant } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { audit } from '../../middlewares/audit.middleware';
import {
  createIncomeSchema,
  updateIncomeSchema,
  listIncomeSchema,
  incomeSummarySchema,
  idParamSchema,
} from './income.validator';

const router = Router();

// Every income route is family-scoped: authenticate, then pin to the active workspace.
router.use(authenticate, resolveTenant);

// ── Collection reads. Static paths must precede `/:id` or they'd be swallowed by it.
router.get(
  '/summary',
  requirePermission('FINANCE_VIEW'),
  validate(incomeSummarySchema, 'query'),
  incomeController.summary,
);

router.get('/recurring', requirePermission('FINANCE_VIEW'), incomeController.listRecurring);

router.get(
  '/',
  requirePermission('FINANCE_VIEW'),
  validate(listIncomeSchema, 'query'),
  incomeController.list,
);

router.get(
  '/:id',
  requirePermission('FINANCE_VIEW'),
  validate(idParamSchema, 'params'),
  incomeController.getOne,
);

// ── Writes.
router.post(
  '/',
  requirePermission('FINANCE_WRITE'),
  validate(createIncomeSchema),
  audit({ action: AuditAction.CREATE, entity: 'Income' }),
  incomeController.create,
);

router.patch(
  '/:id',
  requirePermission('FINANCE_WRITE'),
  validate(idParamSchema, 'params'),
  validate(updateIncomeSchema),
  audit({ action: AuditAction.UPDATE, entity: 'Income' }),
  incomeController.update,
);

/**
 * Guarded by FINANCE_WRITE rather than FINANCE_DELETE so a member can remove an entry
 * they added by mistake. Deleting *someone else's* row still requires a family head —
 * the service enforces that ownership rule.
 */
router.delete(
  '/:id',
  requirePermission('FINANCE_WRITE'),
  validate(idParamSchema, 'params'),
  audit({ action: AuditAction.DELETE, entity: 'Income' }),
  incomeController.remove,
);

export const incomeRoutes = router;
