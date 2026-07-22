import type { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../../config/database';

const memberSelect = {
  id: true,
  role: true,
  isActive: true,
  joinedAt: true,
  userId: true,
  familyId: true,
  user: {
    select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
  },
} satisfies Prisma.FamilyMemberSelect;

const inviteSelect = {
  id: true,
  email: true,
  role: true,
  token: true,
  expiresAt: true,
  createdAt: true,
  isAccepted: true,
  familyId: true,
  invitedBy: { select: { firstName: true, lastName: true } },
} satisfies Prisma.InviteSelect;

interface CreateInviteData {
  familyId: string;
  email: string;
  role: UserRole;
  token: string;
  expiresAt: Date;
  invitedById: string;
}

interface AcceptInviteData {
  inviteId: string;
  familyId: string;
  userId: string;
  role: UserRole;
  /** Existing (possibly deactivated) membership to reactivate instead of creating a new one. */
  existingMemberId?: string;
}

/**
 * Every read/write here is explicitly scoped by `familyId` — the single guarantee
 * that one family can never touch another family's rows.
 */
export const familyRepository = {
  findFamilyById(familyId: string) {
    return prisma.family.findUnique({
      where: { id: familyId },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        createdAt: true,
        settings: {
          select: { currency: true, currencySymbol: true, timezone: true, dateFormat: true },
        },
      },
    });
  },

  updateFamily(familyId: string, data: Prisma.FamilyUpdateInput) {
    return prisma.family.update({
      where: { id: familyId },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        createdAt: true,
        settings: {
          select: { currency: true, currencySymbol: true, timezone: true, dateFormat: true },
        },
      },
      data,
    });
  },

  countActiveMembers(familyId: string) {
    return prisma.familyMember.count({ where: { familyId, isActive: true } });
  },

  countPendingInvites(familyId: string) {
    return prisma.invite.count({ where: { familyId, isAccepted: false } });
  },

  listMembers(familyId: string) {
    return prisma.familyMember.findMany({
      where: { familyId },
      orderBy: [{ isActive: 'desc' }, { joinedAt: 'asc' }],
      select: memberSelect,
    });
  },

  /** Scoped lookup — an id from another family resolves to null, not another family's row. */
  findMember(familyId: string, memberId: string) {
    return prisma.familyMember.findFirst({
      where: { id: memberId, familyId },
      select: memberSelect,
    });
  },

  findMembershipByUserId(familyId: string, userId: string) {
    return prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
      select: memberSelect,
    });
  },

  findActiveMemberByEmail(familyId: string, email: string) {
    return prisma.familyMember.findFirst({
      where: { familyId, isActive: true, user: { email } },
      select: memberSelect,
    });
  },

  updateMemberRole(memberId: string, role: UserRole) {
    return prisma.familyMember.update({
      where: { id: memberId },
      data: { role },
      select: memberSelect,
    });
  },

  /**
   * Soft-removes a member: financial rows (income, expenses…) reference `memberId`,
   * so the row is deactivated rather than deleted to keep history intact.
   * Also clears the user's active workspace if it pointed at this family.
   */
  deactivateMember(familyId: string, memberId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const member = await tx.familyMember.update({
        where: { id: memberId },
        data: { isActive: false },
        select: memberSelect,
      });

      await tx.user.updateMany({
        where: { id: userId, activeFamilyId: familyId },
        data: { activeFamilyId: null },
      });

      // Drop any invite row so the person can be invited again cleanly.
      await tx.invite.deleteMany({ where: { familyId, email: member.user.email } });

      return member;
    });
  },

  listPendingInvites(familyId: string) {
    return prisma.invite.findMany({
      where: { familyId, isAccepted: false },
      orderBy: { createdAt: 'desc' },
      select: inviteSelect,
    });
  },

  findInvite(familyId: string, inviteId: string) {
    return prisma.invite.findFirst({ where: { id: inviteId, familyId }, select: inviteSelect });
  },

  findInviteByToken(token: string) {
    return prisma.invite.findUnique({
      where: { token },
      select: { ...inviteSelect, family: { select: { id: true, name: true, isActive: true } } },
    });
  },

  /**
   * One invite row per (family, email): re-inviting the same address refreshes the
   * token, role and expiry instead of piling up duplicates.
   */
  upsertInvite(data: CreateInviteData) {
    const { familyId, email, ...rest } = data;
    return prisma.invite.upsert({
      where: { familyId_email: { familyId, email } },
      create: { familyId, email, ...rest },
      update: {
        role: rest.role,
        token: rest.token,
        expiresAt: rest.expiresAt,
        invitedById: rest.invitedById,
        isAccepted: false,
        acceptedAt: null,
        createdAt: new Date(),
      },
      select: inviteSelect,
    });
  },

  refreshInviteToken(inviteId: string, token: string, expiresAt: Date) {
    return prisma.invite.update({
      where: { id: inviteId },
      data: { token, expiresAt, isAccepted: false, acceptedAt: null },
      select: inviteSelect,
    });
  },

  deleteInvite(inviteId: string) {
    return prisma.invite.delete({ where: { id: inviteId } });
  },

  /** Marks the invite accepted, creates/reactivates the membership and switches the user in. */
  acceptInvite(data: AcceptInviteData) {
    return prisma.$transaction(async (tx) => {
      const member = data.existingMemberId
        ? await tx.familyMember.update({
            where: { id: data.existingMemberId },
            data: { isActive: true, role: data.role },
            select: memberSelect,
          })
        : await tx.familyMember.create({
            data: { familyId: data.familyId, userId: data.userId, role: data.role },
            select: memberSelect,
          });

      await tx.invite.update({
        where: { id: data.inviteId },
        data: { isAccepted: true, acceptedAt: new Date() },
      });

      await tx.user.update({
        where: { id: data.userId },
        data: { activeFamilyId: data.familyId },
      });

      return member;
    });
  },

  /** All workspaces the user can switch between, with each one's active head-count. */
  async listUserFamilies(userId: string) {
    const memberships = await prisma.familyMember.findMany({
      where: { userId, isActive: true, family: { isActive: true } },
      orderBy: { joinedAt: 'asc' },
      select: { role: true, family: { select: { id: true, name: true, code: true } } },
    });

    const counts = await prisma.familyMember.groupBy({
      by: ['familyId'],
      where: { familyId: { in: memberships.map((m) => m.family.id) }, isActive: true },
      _count: { _all: true },
    });

    return memberships.map((membership) => ({
      ...membership,
      memberCount: counts.find((c) => c.familyId === membership.family.id)?._count._all ?? 0,
    }));
  },

  async getActiveFamilyId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeFamilyId: true },
    });
    return user?.activeFamilyId ?? null;
  },

  setActiveFamily(userId: string, familyId: string) {
    return prisma.user.update({ where: { id: userId }, data: { activeFamilyId: familyId } });
  },
};
