import type { UserRole } from '@prisma/client';

/**
 * Roles that can be handed out through the invite / role-change flows.
 * `SUPER_ADMIN` is platform-level and `TENANT_OWNER` is created once, at registration —
 * neither may ever be assigned from the family module.
 */
export const ASSIGNABLE_ROLES = ['FAMILY_HEAD', 'MEMBER', 'VIEWER'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

// ── Inputs ──────────────────────────────────────────────────────────────────

export interface UpdateFamilyInput {
  name: string;
}

export interface InviteMemberInput {
  email: string;
  role: AssignableRole;
}

export interface UpdateMemberRoleInput {
  role: AssignableRole;
}

export interface SwitchFamilyInput {
  familyId: string;
}

export type { ActorContext } from '../../shared/types/actor';

// ── DTOs ────────────────────────────────────────────────────────────────────

export interface FamilyDto {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: Date;
  memberCount: number;
  pendingInviteCount: number;
  settings: {
    currency: string;
    currencySymbol: string;
    timezone: string;
    dateFormat: string;
  } | null;
}

export interface FamilyMemberDto {
  id: string;
  role: UserRole;
  isActive: boolean;
  joinedAt: Date;
  /** True for the member making the request — the UI disables self-actions. */
  isSelf: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  };
}

export interface InviteDto {
  id: string;
  email: string;
  role: UserRole;
  expiresAt: Date;
  createdAt: Date;
  isExpired: boolean;
  invitedBy: { firstName: string; lastName: string } | null;
}

/** Public (unauthenticated) view of an invite, used by the accept-invite page. */
export interface InvitePreviewDto {
  email: string;
  role: UserRole;
  familyName: string;
  expiresAt: Date;
  isAccepted: boolean;
  isExpired: boolean;
}

/** One row of the workspace switcher. */
export interface FamilySummaryDto {
  id: string;
  name: string;
  code: string;
  role: UserRole;
  memberCount: number;
  isCurrent: boolean;
}
