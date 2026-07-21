import type { User } from '@prisma/client';
import { authRepository } from './auth.repository';
import type {
  RegisterInput,
  LoginInput,
  ResetPasswordInput,
  ChangePasswordInput,
  UpdateProfileInput,
  RequestContext,
  AuthResult,
  UserDto,
  MemberDto,
} from './auth.types';
import { hashPassword, comparePassword } from '../../shared/utils/bcrypt.util';
import { generateSecureToken } from '../../shared/utils/token.util';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../shared/utils/jwt.util';
import { sendEmail, emailTemplates } from '../../shared/utils/email.util';
import { addHours, addMinutes, isExpired } from '../../shared/utils/date.util';
import { REFRESH_COOKIE_MAX_AGE } from '../../shared/utils/cookie.util';
import { AppError } from '../../shared/errors/AppError';
import { AuthError } from '../../shared/errors/AuthError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { MSG } from '../../shared/constants/messages';
import { env } from '../../config/env';

const toUserDto = (user: User): UserDto => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  avatar: user.avatar,
  isVerified: user.isVerified,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

const buildVerificationLink = (token: string): string =>
  `${env.CLIENT_URL}/verify-email?token=${token}`;

const buildResetLink = (token: string): string =>
  `${env.CLIENT_URL}/reset-password?token=${token}`;

/** Issues an access token + a persisted, rotating refresh token for a user. */
const issueTokens = async (
  user: User,
  ctx: RequestContext,
): Promise<{ accessToken: string; refreshToken: string }> => {
  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({
    userId: user.id,
    tokenId: generateSecureToken(16),
  });

  await authRepository.createRefreshToken({
    userId: user.id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_COOKIE_MAX_AGE),
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { accessToken, refreshToken };
};

export const authService = {
  async register(input: RegisterInput): Promise<void> {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) {
      throw new AppError(MSG.DUPLICATE_EMAIL, 409, 'DUPLICATE_EMAIL');
    }

    const passwordHash = await hashPassword(input.password);
    const verificationToken = generateSecureToken();
    const verificationExpiry = addHours(new Date(), env.VERIFICATION_EXPIRES_HOURS);

    const user = await authRepository.createAccount({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      passwordHash,
      phone: input.phone,
      familyName: input.familyName,
      verificationToken,
      verificationExpiry,
    });

    const template = emailTemplates.verifyEmail(
      user.firstName,
      buildVerificationLink(verificationToken),
    );
    await sendEmail({ to: user.email, ...template });
  },

  async login(input: LoginInput, ctx: RequestContext): Promise<AuthResult> {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user) {
      throw new AuthError(MSG.AUTH_INVALID_CREDENTIALS);
    }

    const passwordValid = await comparePassword(input.password, user.passwordHash);
    if (!passwordValid) {
      throw new AuthError(MSG.AUTH_INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      throw new AuthError(MSG.AUTH_ACCOUNT_INACTIVE);
    }

    if (!user.isVerified) {
      throw new AppError(MSG.AUTH_EMAIL_NOT_VERIFIED, 403, 'EMAIL_NOT_VERIFIED');
    }

    const { accessToken, refreshToken } = await issueTokens(user, ctx);
    await authRepository.updateUser(user.id, { lastLoginAt: new Date() });

    const member = await this.getMemberDto(user.id);

    return { user: toUserDto(user), member, accessToken, refreshToken };
  },

  async refresh(rawToken: string | undefined, ctx: RequestContext): Promise<AuthResult> {
    if (!rawToken) {
      throw new AuthError('No refresh token provided');
    }

    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(rawToken);
    } catch {
      throw new AuthError('Invalid or expired refresh token');
    }

    const stored = await authRepository.findRefreshToken(rawToken);
    if (!stored || stored.isRevoked || isExpired(stored.expiresAt)) {
      // Possible token reuse — revoke every token for this user as a precaution.
      await authRepository.revokeAllUserTokens(payload.userId);
      throw new AuthError('Refresh token is no longer valid');
    }

    const user = await authRepository.findUserById(stored.userId);
    if (!user || !user.isActive) {
      throw new AuthError(MSG.AUTH_ACCOUNT_INACTIVE);
    }

    // Rotate: revoke the used token and issue a fresh pair.
    await authRepository.revokeRefreshToken(rawToken);
    const { accessToken, refreshToken } = await issueTokens(user, ctx);
    const member = await this.getMemberDto(user.id);

    return { user: toUserDto(user), member, accessToken, refreshToken };
  },

  async logout(rawToken: string | undefined): Promise<void> {
    if (rawToken) {
      await authRepository.revokeRefreshToken(rawToken);
    }
  },

  async verifyEmail(token: string): Promise<void> {
    const user = await authRepository.findUserByVerificationToken(token);
    if (!user || !user.verificationExpiry || isExpired(user.verificationExpiry)) {
      throw new AuthError(MSG.AUTH_TOKEN_INVALID);
    }

    if (user.isVerified) return;

    await authRepository.updateUser(user.id, {
      isVerified: true,
      verificationToken: null,
      verificationExpiry: null,
    });
  },

  async resendVerification(email: string): Promise<void> {
    const user = await authRepository.findUserByEmail(email);
    // Silently succeed for unknown / already-verified accounts (no enumeration).
    if (!user || user.isVerified) return;

    const verificationToken = generateSecureToken();
    const verificationExpiry = addHours(new Date(), env.VERIFICATION_EXPIRES_HOURS);
    await authRepository.updateUser(user.id, { verificationToken, verificationExpiry });

    const template = emailTemplates.verifyEmail(
      user.firstName,
      buildVerificationLink(verificationToken),
    );
    await sendEmail({ to: user.email, ...template });
  },

  async forgotPassword(email: string): Promise<void> {
    const user = await authRepository.findUserByEmail(email);
    // Always resolve without revealing whether the account exists.
    if (!user || !user.isActive) return;

    const resetToken = generateSecureToken();
    const resetTokenExpiry = addMinutes(new Date(), env.RESET_TOKEN_EXPIRES_MINUTES);
    await authRepository.updateUser(user.id, { resetToken, resetTokenExpiry });

    const template = emailTemplates.resetPassword(user.firstName, buildResetLink(resetToken));
    await sendEmail({ to: user.email, ...template });
  },

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const user = await authRepository.findUserByResetToken(input.token);
    if (!user || !user.resetTokenExpiry || isExpired(user.resetTokenExpiry)) {
      throw new AuthError(MSG.AUTH_TOKEN_INVALID);
    }

    const passwordHash = await hashPassword(input.password);
    await authRepository.updateUser(user.id, {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    });

    // Invalidate all existing sessions after a password reset.
    await authRepository.revokeAllUserTokens(user.id);
  },

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User');

    const valid = await comparePassword(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new AuthError('Current password is incorrect');
    }

    const passwordHash = await hashPassword(input.newPassword);
    await authRepository.updateUser(user.id, { passwordHash });
    await authRepository.revokeAllUserTokens(user.id);
  },

  async getProfile(userId: string): Promise<{ user: UserDto; member: MemberDto | null }> {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User');
    const member = await this.getMemberDto(user.id);
    return { user: toUserDto(user), member };
  },

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDto> {
    const user = await authRepository.updateUser(userId, {
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.avatar !== undefined && { avatar: input.avatar }),
    });
    return toUserDto(user);
  },

  async getMemberDto(userId: string): Promise<MemberDto | null> {
    const membership = await authRepository.getActiveMembership(userId);
    if (!membership) return null;
    return {
      id: membership.id,
      familyId: membership.familyId,
      role: membership.role,
      family: membership.family,
    };
  },
};
