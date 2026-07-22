import type { UserRole } from './auth.types';
import type { AssignableRole } from '@/constants/permissions';

export interface Family {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  memberCount: number;
  pendingInviteCount: number;
  settings: {
    currency: string;
    currencySymbol: string;
    timezone: string;
    dateFormat: string;
  } | null;
}

export interface FamilyMember {
  id: string;
  role: UserRole;
  isActive: boolean;
  joinedAt: string;
  isSelf: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  };
}

export interface Invite {
  id: string;
  email: string;
  role: UserRole;
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
  invitedBy: { firstName: string; lastName: string } | null;
}

export interface InvitePreview {
  email: string;
  role: UserRole;
  familyName: string;
  expiresAt: string;
  isAccepted: boolean;
  isExpired: boolean;
}

export interface FamilySummary {
  id: string;
  name: string;
  code: string;
  role: UserRole;
  memberCount: number;
  isCurrent: boolean;
}

export interface InviteMemberPayload {
  email: string;
  role: AssignableRole;
}

export interface AcceptInviteResult {
  familyId: string;
  familyName: string;
  role: UserRole;
}
