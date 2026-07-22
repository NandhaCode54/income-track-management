import { useMemo } from 'react';
import { useAuthStore } from '@/store/auth.store';
import {
  PERMISSIONS,
  ROLE_HIERARCHY,
  ASSIGNABLE_ROLES,
  type PermissionKey,
  type AssignableRole,
} from '@/constants/permissions';
import type { UserRole } from '@/types/auth.types';

/**
 * Role-aware helpers for conditionally rendering UI.
 * Purely cosmetic — every guarded action is re-checked on the server.
 */
export const usePermission = () => {
  const role = useAuthStore((s) => s.member?.role) as UserRole | undefined;

  return useMemo(() => {
    const rank = role ? ROLE_HIERARCHY[role] : 0;

    return {
      role,
      /** Does the current role hold this permission? */
      can: (permission: PermissionKey): boolean =>
        !!role && (PERMISSIONS[permission] as readonly UserRole[]).includes(role),

      /** Is the current role at least as senior as `target`? */
      isAtLeast: (target: UserRole): boolean => rank >= ROLE_HIERARCHY[target],

      /** Can the current role manage a member holding `target`? Strictly-below rule. */
      outranks: (target: UserRole): boolean => rank > ROLE_HIERARCHY[target],

      /** Roles the current user is allowed to assign — matches the server's guard. */
      assignableRoles: ASSIGNABLE_ROLES.filter(
        (candidate) => ROLE_HIERARCHY[candidate] < rank,
      ) as AssignableRole[],
    };
  }, [role]);
};
