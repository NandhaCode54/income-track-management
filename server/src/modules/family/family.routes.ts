import { Router } from 'express';
import { AuditAction } from '@prisma/client';
import { familyController } from './family.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenant } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { audit } from '../../middlewares/audit.middleware';
import {
  updateFamilySchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  switchFamilySchema,
  idParamSchema,
  tokenParamSchema,
} from './family.validator';

const router = Router();

// ── Public: preview an invitation before signing in.
router.get(
  '/invites/token/:token',
  validate(tokenParamSchema, 'params'),
  familyController.previewInvite,
);

// ── Authenticated, but *not* scoped to a family: joining / switching workspaces.
router.use(authenticate);

router.get('/', familyController.listMyFamilies);
router.post('/switch', validate(switchFamilySchema), familyController.switchFamily);
router.post(
  '/join/:token',
  validate(tokenParamSchema, 'params'),
  familyController.acceptInvite,
);

// ── Everything below is scoped to the caller's active family and RBAC-guarded.
router.use(resolveTenant);

router.get('/me', requirePermission('FAMILY_VIEW'), familyController.getFamily);
router.patch(
  '/me',
  requirePermission('FAMILY_MANAGE'),
  validate(updateFamilySchema),
  audit({ action: AuditAction.UPDATE, entity: 'Family' }),
  familyController.updateFamily,
);

router.get('/members', requirePermission('FAMILY_VIEW'), familyController.listMembers);
router.patch(
  '/members/:id/role',
  requirePermission('MEMBER_ROLE_CHANGE'),
  validate(idParamSchema, 'params'),
  validate(updateMemberRoleSchema),
  audit({ action: AuditAction.ROLE_CHANGED, entity: 'FamilyMember' }),
  familyController.updateMemberRole,
);
router.delete(
  '/members/:id',
  requirePermission('MEMBER_REMOVE'),
  validate(idParamSchema, 'params'),
  audit({ action: AuditAction.DELETE, entity: 'FamilyMember' }),
  familyController.removeMember,
);

router.get('/invites', requirePermission('MEMBER_INVITE'), familyController.listInvites);
router.post(
  '/invite',
  requirePermission('MEMBER_INVITE'),
  validate(inviteMemberSchema),
  audit({ action: AuditAction.INVITE_SENT, entity: 'Invite' }),
  familyController.inviteMember,
);
router.post(
  '/invites/:id/resend',
  requirePermission('MEMBER_INVITE'),
  validate(idParamSchema, 'params'),
  familyController.resendInvite,
);
router.delete(
  '/invites/:id',
  requirePermission('MEMBER_INVITE'),
  validate(idParamSchema, 'params'),
  familyController.revokeInvite,
);

export const familyRoutes = router;
