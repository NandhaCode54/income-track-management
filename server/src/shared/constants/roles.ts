import { UserRole } from '@prisma/client';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.TENANT_OWNER]: 80,
  [UserRole.FAMILY_HEAD]: 60,
  [UserRole.MEMBER]: 40,
  [UserRole.VIEWER]: 20,
};

export const hasRoleOrAbove = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};
