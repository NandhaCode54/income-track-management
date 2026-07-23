import type { Prisma, User } from '@prisma/client';
import { UserRole, PlanType, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { generateFamilyCode } from '../../shared/utils/token.util';
import { addDays } from '../../shared/utils/date.util';
import { DEFAULT_EXPENSE_CATEGORIES } from '../../shared/constants/categories';

interface CreateAccountData {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  phone?: string;
  familyName: string;
  verificationToken: string;
  verificationExpiry: Date;
}

interface CreateRefreshTokenData {
  userId: string;
  token: string;
  expiresAt: Date;
  ip?: string;
  userAgent?: string;
}

/**
 * Generates a family code that is guaranteed unique against existing families.
 */
const generateUniqueFamilyCode = async (tx: Prisma.TransactionClient): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateFamilyCode();
    const existing = await tx.family.findUnique({ where: { code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new Error('Failed to generate a unique family code');
};

export const authRepository = {
  findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  findUserByVerificationToken(token: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { verificationToken: token } });
  },

  findUserByResetToken(token: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { resetToken: token } });
  },

  /**
   * Creates a User plus a fresh Tenant, Family, owning FamilyMember,
   * FamilySettings and a trial Subscription — all in one transaction.
   */
  async createAccount(data: CreateAccountData): Promise<User> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          passwordHash: data.passwordHash,
          phone: data.phone,
          verificationToken: data.verificationToken,
          verificationExpiry: data.verificationExpiry,
        },
      });

      const tenant = await tx.tenant.create({
        data: { name: data.familyName, plan: PlanType.FREE },
      });

      const code = await generateUniqueFamilyCode(tx);
      const family = await tx.family.create({
        data: { tenantId: tenant.id, name: data.familyName, code },
      });

      await tx.familyMember.create({
        data: { familyId: family.id, userId: user.id, role: UserRole.TENANT_OWNER },
      });

      await tx.familySettings.create({ data: { familyId: family.id } });

      await tx.subscription.create({
        data: {
          familyId: family.id,
          plan: PlanType.FREE,
          status: SubscriptionStatus.TRIAL,
          trialEndsAt: addDays(new Date(), 14),
        },
      });

      // A workspace with no categories makes the expense form unusable on day one,
      // so the starter set is part of creating the family, not a later chore.
      await tx.expenseCategory.createMany({
        data: DEFAULT_EXPENSE_CATEGORIES.map((category) => ({
          familyId: family.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          isDefault: true,
        })),
      });

      return user;
    });
  },

  updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },

  /**
   * Returns the membership for the family the user is currently working in
   * (`user.activeFamilyId`), falling back to their oldest active membership.
   * Mirrors the resolution done by the `resolveTenant` middleware.
   */
  async getActiveMembership(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        activeFamilyId: true,
        familyMembers: {
          where: { isActive: true, family: { isActive: true } },
          orderBy: { joinedAt: 'asc' },
          select: {
            id: true,
            familyId: true,
            role: true,
            family: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    const memberships = user?.familyMembers ?? [];
    return memberships.find((m) => m.familyId === user?.activeFamilyId) ?? memberships[0] ?? null;
  },

  createRefreshToken(data: CreateRefreshTokenData) {
    return prisma.refreshToken.create({ data });
  },

  findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({ where: { token } });
  },

  revokeRefreshToken(token: string) {
    return prisma.refreshToken.updateMany({
      where: { token, isRevoked: false },
      data: { isRevoked: true },
    });
  },

  revokeAllUserTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  },
};
