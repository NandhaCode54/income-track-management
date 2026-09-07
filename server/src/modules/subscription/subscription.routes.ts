import { Router } from 'express';
import { AuditAction } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenant } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { audit } from '../../middlewares/audit.middleware';
import { subscriptionController } from './subscription.controller';
import { upgradePlanSchema, cancelSubscriptionSchema } from './subscription.validator';

const router = Router();
router.use(authenticate, resolveTenant);

router.get(
  '/',
  requirePermission('SUBSCRIPTION_MANAGE'),
  subscriptionController.getCurrent,
);
router.get(
  '/plans',
  requirePermission('SUBSCRIPTION_MANAGE'),
  subscriptionController.getPlans,
);
router.get(
  '/status',
  requirePermission('SUBSCRIPTION_MANAGE'),
  subscriptionController.getPlanStatus,
);
router.post(
  '/upgrade',
  requirePermission('SUBSCRIPTION_MANAGE'),
  validate(upgradePlanSchema),
  audit({ action: AuditAction.UPDATE, entity: 'Subscription' }),
  subscriptionController.upgrade,
);
router.post(
  '/cancel',
  requirePermission('SUBSCRIPTION_MANAGE'),
  validate(cancelSubscriptionSchema),
  audit({ action: AuditAction.UPDATE, entity: 'Subscription' }),
  subscriptionController.cancel,
);
router.post(
  '/reactivate',
  requirePermission('SUBSCRIPTION_MANAGE'),
  audit({ action: AuditAction.UPDATE, entity: 'Subscription' }),
  subscriptionController.reactivate,
);

export const subscriptionRoutes = router;
