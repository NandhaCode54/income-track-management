export type UserRole =
  | 'SUPER_ADMIN'
  | 'TENANT_OWNER'
  | 'FAMILY_HEAD'
  | 'MEMBER'
  | 'VIEWER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Member {
  id: string;
  familyId: string;
  role: UserRole;
  family: {
    id: string;
    name: string;
    code: string;
  };
}

export interface AuthResponse {
  user: User;
  member: Member | null;
  accessToken: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  familyName: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}
