import { Router } from 'express';
import { AuditAction } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenant } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { audit } from '../../middlewares/audit.middleware';
import { goalsController } from './goals.controller';
import {
  contributionSchema,
  createGoalSchema,
  idParamSchema,
  listGoalSchema,
  updateGoalSchema,
} from './goals.validator';

const router = Router();
router.use(authenticate, resolveTenant);

router.get('/', requirePermission('FINANCE_VIEW'), validate(listGoalSchema, 'query'), goalsController.list);
router.post(
  '/',
  requirePermission('FINANCE_WRITE'),
  validate(createGoalSchema),
  audit({ action: AuditAction.CREATE, entity: 'Goal' }),
  goalsController.create,
);
// Declared before /:id, or Express would read the word "contributions" as an id.
router.post(
  '/:id/contributions',
  requirePermission('FINANCE_WRITE'),
  validate(idParamSchema, 'params'),
  validate(contributionSchema),
  audit({ action: AuditAction.UPDATE, entity: 'GoalContribution' }),
  goalsController.contribute,
);
router.get('/:id', requirePermission('FINANCE_VIEW'), validate(idParamSchema, 'params'), goalsController.get);
router.patch(
  '/:id',
  requirePermission('FINANCE_WRITE'),
  validate(idParamSchema, 'params'),
  validate(updateGoalSchema),
  audit({ action: AuditAction.UPDATE, entity: 'Goal' }),
  goalsController.update,
);
router.delete(
  '/:id',
  requirePermission('FINANCE_DELETE'),
  validate(idParamSchema, 'params'),
  audit({ action: AuditAction.DELETE, entity: 'Goal' }),
  goalsController.remove,
);

export const goalsRoutes = router;
