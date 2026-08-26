import { Router } from 'express';
import { AuditAction } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenant } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { audit } from '../../middlewares/audit.middleware';
import { settingsController } from './settings.controller';
import { updateSettingsSchema } from './settings.validator';

const router = Router();
router.use(authenticate, resolveTenant);

router.get('/', requirePermission('SETTINGS_MANAGE'), settingsController.get);
router.patch(
  '/',
  requirePermission('SETTINGS_MANAGE'),
  validate(updateSettingsSchema),
  audit({ action: AuditAction.UPDATE, entity: 'FamilySettings' }),
  settingsController.update,
);

export const settingsRoutes = router;
