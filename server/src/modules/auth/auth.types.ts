import type { UserRole } from '@prisma/client';

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  familyName: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface ResendVerificationInput {
  email: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  avatar?: string | null;
}

/** Request context captured for refresh-token / session tracking. */
export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface MemberDto {
  id: string;
  familyId: string;
  role: UserRole;
  family: {
    id: string;
    name: string;
    code: string;
  };
}

export interface AuthResult {
  user: UserDto;
  member: MemberDto | null;
  accessToken: string;
  /** Raw refresh token — the controller sets it as an httpOnly cookie. */
  refreshToken: string;
}
