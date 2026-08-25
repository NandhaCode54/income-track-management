import { Router } from 'express';
import { AuditAction } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenant } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { audit } from '../../middlewares/audit.middleware';
import { adminController } from './admin.controller';
import {
  announcementSchema,
  idParamSchema,
  listAuditLogsSchema,
  listFamiliesSchema,
  listSubscriptionsSchema,
  listUsersSchema,
  userStatusSchema,
} from './admin.validator';

const router = Router();

router.use(authenticate, resolveTenant);

// ─── Users ──────────────────────────────────────────────────────────────────

router.get(
  '/users',
  requirePermission('ADMIN_ACCESS'),
  validate(listUsersSchema, 'query'),
  adminController.listUsers,
);

router.get(
  '/users/:id',
  requirePermission('ADMIN_ACCESS'),
  validate(idParamSchema, 'params'),
  adminController.getUser,
);

router.patch(
  '/users/:id/status',
  requirePermission('ADMIN_ACCESS'),
  validate(idParamSchema, 'params'),
  validate(userStatusSchema),
  audit({ action: AuditAction.UPDATE, entity: 'User' }),
  adminController.setUserStatus,
);

// ─── Families ───────────────────────────────────────────────────────────────

router.get(
  '/families',
  requirePermission('ADMIN_ACCESS'),
  validate(listFamiliesSchema, 'query'),
  adminController.listFamilies,
);

router.get(
  '/families/:id',
  requirePermission('ADMIN_ACCESS'),
  validate(idParamSchema, 'params'),
  adminController.getFamily,
);

// ─── Subscriptions ──────────────────────────────────────────────────────────

router.get(
  '/subscriptions',
  requirePermission('ADMIN_ACCESS'),
  validate(listSubscriptionsSchema, 'query'),
  adminController.listSubscriptions,
);

// ─── Audit Logs ─────────────────────────────────────────────────────────────

router.get(
  '/audit-logs',
  requirePermission('ADMIN_ACCESS'),
  validate(listAuditLogsSchema, 'query'),
  adminController.listAuditLogs,
);

// ─── Analytics ──────────────────────────────────────────────────────────────

router.get(
  '/analytics',
  requirePermission('ADMIN_ACCESS'),
  adminController.getAnalytics,
);

// ─── Announcements ──────────────────────────────────────────────────────────

router.get(
  '/announcements',
  requirePermission('ADMIN_ACCESS'),
  adminController.listAnnouncements,
);

router.post(
  '/announcements',
  requirePermission('ADMIN_ACCESS'),
  validate(announcementSchema),
  audit({ action: AuditAction.CREATE, entity: 'Announcement' }),
  adminController.createAnnouncement,
);

export { router as adminRoutes };
