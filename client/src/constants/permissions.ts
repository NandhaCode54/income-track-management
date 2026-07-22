import type { UserRole } from '@/types/auth.types';

/**
 * Mirror of the server's `shared/constants/{roles,permissions}.ts`.
 * The backend remains authoritative — this copy only decides what the UI *offers*,
 * so a user is never shown a button that would 403.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  TENANT_OWNER: 80,
  FAMILY_HEAD: 60,
  MEMBER: 40,
  VIEWER: 20,
};

export const PERMISSIONS = {
  FAMILY_MANAGE: ['TENANT_OWNER', 'FAMILY_HEAD'],
  FAMILY_VIEW: ['TENANT_OWNER', 'FAMILY_HEAD', 'MEMBER', 'VIEWER'],
  MEMBER_INVITE: ['TENANT_OWNER', 'FAMILY_HEAD'],
  MEMBER_REMOVE: ['TENANT_OWNER', 'FAMILY_HEAD'],
  MEMBER_ROLE_CHANGE: ['TENANT_OWNER', 'FAMILY_HEAD'],
  FINANCE_WRITE: ['TENANT_OWNER', 'FAMILY_HEAD', 'MEMBER'],
  FINANCE_DELETE: ['TENANT_OWNER', 'FAMILY_HEAD'],
  FINANCE_VIEW: ['TENANT_OWNER', 'FAMILY_HEAD', 'MEMBER', 'VIEWER'],
  REPORTS_VIEW: ['TENANT_OWNER', 'FAMILY_HEAD', 'MEMBER', 'VIEWER'],
  REPORTS_EXPORT: ['TENANT_OWNER', 'FAMILY_HEAD'],
  SETTINGS_MANAGE: ['TENANT_OWNER', 'FAMILY_HEAD'],
  ADMIN_ACCESS: ['SUPER_ADMIN'],
} satisfies Record<string, UserRole[]>;

export type PermissionKey = keyof typeof PERMISSIONS;

/** Roles a user is allowed to hand out — always strictly below their own. */
export const ASSIGNABLE_ROLES = ['FAMILY_HEAD', 'MEMBER', 'VIEWER'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  TENANT_OWNER: 'Owner',
  FAMILY_HEAD: 'Family Head',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<AssignableRole, string> = {
  FAMILY_HEAD: 'Full access — can invite members and delete records.',
  MEMBER: 'Can add and edit income, expenses and budgets.',
  VIEWER: 'Read-only access to the family’s finances.',
};
