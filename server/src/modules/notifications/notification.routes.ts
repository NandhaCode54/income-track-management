import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenant } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { notificationsController } from './notification.controller';
import { idParamSchema, listNotificationsSchema } from './notification.validator';

/**
 * Notifications are personal, not a family ledger: any member may read and
 * dismiss their own feed. FAMILY_VIEW gates the routes only to prove the caller
 * belongs to the resolved workspace — every query is additionally scoped by
 * `actorFrom(req).userId`, so one member can never see another's bell.
 */
const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', requirePermission('FAMILY_VIEW'), validate(listNotificationsSchema, 'query'), notificationsController.list);
router.get('/unread-count', requirePermission('FAMILY_VIEW'), notificationsController.unreadCount);
router.post('/read-all', requirePermission('FAMILY_VIEW'), notificationsController.markAllRead);
router.patch(
  '/:id/read',
  requirePermission('FAMILY_VIEW'),
  validate(idParamSchema, 'params'),
  notificationsController.markRead,
);

export { router as notificationRoutes };
