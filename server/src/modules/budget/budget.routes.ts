import { Router } from 'express';
import { AuditAction } from '@prisma/client';
import { budgetController } from './budget.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenant } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { audit } from '../../middlewares/audit.middleware';
import { idParamSchema } from '../../shared/validators/field.validator';
import {
  budgetPeriodSchema,
  copyBudgetsSchema,
  createBudgetSchema,
  updateBudgetSchema,
} from './budget.validator';

const router = Router();

// Every budget route is family-scoped: authenticate, then pin to the active workspace.
router.use(authenticate, resolveTenant);

/**
 * Reads are open to anyone who can see the finances — a viewer should be able to
 * see how the household is tracking. Writes need `BUDGET_MANAGE`, because
 * deciding the limits is a different act from recording spending against them.
 */
router.get(
  '/vs-actual',
  requirePermission('FINANCE_VIEW'),
  validate(budgetPeriodSchema, 'query'),
  budgetController.vsActual,
);

router.get(
  '/',
  requirePermission('FINANCE_VIEW'),
  validate(budgetPeriodSchema, 'query'),
  budgetController.list,
);

router.post(
  '/copy',
  requirePermission('BUDGET_MANAGE'),
  validate(copyBudgetsSchema),
  audit({ action: AuditAction.CREATE, entity: 'Budget' }),
  budgetController.copy,
);

router.post(
  '/',
  requirePermission('BUDGET_MANAGE'),
  validate(createBudgetSchema),
  audit({ action: AuditAction.CREATE, entity: 'Budget' }),
  budgetController.create,
);

router.patch(
  '/:id',
  requirePermission('BUDGET_MANAGE'),
  validate(idParamSchema, 'params'),
  validate(updateBudgetSchema),
  audit({ action: AuditAction.UPDATE, entity: 'Budget' }),
  budgetController.update,
);

router.delete(
  '/:id',
  requirePermission('BUDGET_MANAGE'),
  validate(idParamSchema, 'params'),
  audit({ action: AuditAction.DELETE, entity: 'Budget' }),
  budgetController.remove,
);

export const budgetRoutes = router;
