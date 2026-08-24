import { UserRole } from '@prisma/client';

export const PERMISSIONS = {
  // Family management
  FAMILY_MANAGE: [UserRole.TENANT_OWNER, UserRole.FAMILY_HEAD],
  FAMILY_VIEW: [UserRole.TENANT_OWNER, UserRole.FAMILY_HEAD, UserRole.MEMBER, UserRole.VIEWER],

  // Member management
  MEMBER_INVITE: [UserRole.TENANT_OWNER, UserRole.FAMILY_HEAD],
  MEMBER_REMOVE: [UserRole.TENANT_OWNER, UserRole.FAMILY_HEAD],
  MEMBER_ROLE_CHANGE: [UserRole.TENANT_OWNER, UserRole.FAMILY_HEAD],

  // Financial write operations
  FINANCE_WRITE: [UserRole.TENANT_OWNER, UserRole.FAMILY_HEAD, UserRole.MEMBER],
  FINANCE_DELETE: [UserRole.TENANT_OWNER, UserRole.FAMILY_HEAD],
  FINANCE_VIEW: [UserRole.TENANT_OWNER, UserRole.FAMILY_HEAD, UserRole.MEMBER, UserRole.VIEWER],

  /**
   * Setting the household's spending limits is a planning decision, not a
   * bookkeeping one — a member may record what they spent without being able to
   * decide what everyone is allowed to spend.
   */
  BUDGET_MANAGE: [UserRole.TENANT_OWNER, UserRole.FAMILY_HEAD],

  // Reports
  REPORTS_VIEW: [UserRole.TENANT_OWNER, UserRole.FAMILY_HEAD, UserRole.MEMBER, UserRole.VIEWER],
  REPORTS_EXPORT: [UserRole.TENANT_OWNER, UserRole.FAMILY_HEAD],

  // Settings
  SETTINGS_MANAGE: [UserRole.TENANT_OWNER, UserRole.FAMILY_HEAD],

  // Admin
  ADMIN_ACCESS: [UserRole.SUPER_ADMIN],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const can = (role: UserRole, permission: PermissionKey): boolean => {
  // A platform super admin sits above the family-role system and holds every
  // permission — otherwise the seeded admin account is locked out of the very
  // app it administers, because SUPER_ADMIN appears in no other grant list.
  if (role === UserRole.SUPER_ADMIN) return true;
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
};
