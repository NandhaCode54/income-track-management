import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/modules/auth/auth.repository', () => ({
  authRepository: {
    findUserByEmail: vi.fn(),
    createAccount: vi.fn(),
    updateUser: vi.fn(),
    findUserById: vi.fn(),
    findRefreshToken: vi.fn(),
    createRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
    revokeAllUserTokens: vi.fn(),
  },
}));

vi.mock('../src/shared/utils/email.util', () => ({
  sendEmail: vi.fn(),
  emailTemplates: {
    verifyEmail: vi.fn(() => ({ subject: 'Verify your email', html: '<p>verify</p>' })),
  },
}));

import { authService } from '../src/modules/auth/auth.service';
import { authRepository } from '../src/modules/auth/auth.repository';
import { sendEmail } from '../src/shared/utils/email.util';
import { hashPassword } from '../src/shared/utils/bcrypt.util';
import { AppError } from '../src/shared/errors/AppError';
import { MSG } from '../src/shared/constants/messages';

const registerInput = {
  firstName: 'Riya',
  lastName: 'Sharma',
  email: 'riya@example.com',
  password: 'Password@123',
  familyName: 'Sharma Family',
};

const createdUser = {
  id: 'u-riya',
  firstName: 'Riya',
  lastName: 'Sharma',
  email: 'riya@example.com',
  phone: null,
  avatar: null,
  isVerified: false,
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date('2026-09-01'),
};

type MockedRepo = Record<string, ReturnType<typeof vi.fn>>;

describe('authService — registration & verification email', () => {
  beforeEach(() => {
    (authRepository as unknown as MockedRepo).findUserByEmail.mockReset();
    (authRepository as unknown as MockedRepo).createAccount.mockReset();
    (sendEmail as unknown as ReturnType<typeof vi.fn>).mockReset();
    ((authRepository as unknown as MockedRepo).createAccount as ReturnType<typeof vi.fn>).mockResolvedValue(createdUser);
  });

  it('registers a new account and reports the verification email was sent', async () => {
    (authRepository as unknown as MockedRepo).findUserByEmail.mockResolvedValue(null);
    (sendEmail as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await authService.register(registerInput);

    expect(result).toEqual({ verificationEmailSent: true });
    expect((authRepository as unknown as MockedRepo).createAccount).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('rejects a duplicate email with DUPLICATE_EMAIL before persisting or mailing', async () => {
    (authRepository as unknown as MockedRepo).findUserByEmail.mockResolvedValue({ id: 'u-existing', email: registerInput.email });

    await expect(authService.register(registerInput)).rejects.toMatchObject({
      message: MSG.DUPLICATE_EMAIL,
      code: 'DUPLICATE_EMAIL',
    });
    expect((authRepository as unknown as MockedRepo).createAccount).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('regression: a mail outage never fails registration — account created, verificationEmailSent=false', async () => {
    (authRepository as unknown as MockedRepo).findUserByEmail.mockResolvedValue(null);
    (sendEmail as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('SMTP down'));

    const result = await authService.register(registerInput);

    expect(result).toEqual({ verificationEmailSent: false });
    expect((authRepository as unknown as MockedRepo).createAccount).toHaveBeenCalledTimes(1);
  });

  it('blocks login until the email is verified', async () => {
    const passwordHash = await hashPassword('Password@123');
    (authRepository as unknown as MockedRepo).findUserByEmail.mockResolvedValue({
      ...createdUser,
      passwordHash,
      isVerified: false,
    });

    await expect(
      authService.login({ email: registerInput.email, password: 'Password@123' }, { ip: '1.2.3.4' }),
    ).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
  });
});