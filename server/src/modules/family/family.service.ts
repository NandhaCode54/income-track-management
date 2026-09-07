import { UserRole } from '@prisma/client';
import { familyRepository } from './family.repository';
import type {
  ActorContext,
  AssignableRole,
  FamilyDto,
  FamilyMemberDto,
  FamilySummaryDto,
  InviteDto,
  InviteMemberInput,
  InvitePreviewDto,
  UpdateFamilyInput,
} from './family.types';
import { ROLE_HIERARCHY } from '../../shared/constants/roles';
import { generateSecureToken } from '../../shared/utils/token.util';
import { sendEmail, emailTemplates } from '../../shared/utils/email.util';
import { addHours, isExpired } from '../../shared/utils/date.util';
import { AppError } from '../../shared/errors/AppError';
import { ForbiddenError } from '../../shared/errors/AuthError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { MSG } from '../../shared/constants/messages';
import { env } from '../../config/env';
import { logger } from '../../shared/utils/logger';
import { subscriptionRepository } from '../subscription/subscription.repository';
import { ValidationError } from '../../shared/errors/ValidationError';

type MemberRow = Awaited<ReturnType<typeof familyRepository.listMembers>>[number];
type InviteRow = Awaited<ReturnType<typeof familyRepository.listPendingInvites>>[number];
type FamilyRow = NonNullable<Awaited<ReturnType<typeof familyRepository.findFamilyById>>>;

const buildInviteLink = (token: string): string => `${env.CLIENT_URL}/join/${token}`;

const toMemberDto = (member: MemberRow, actorMemberId: string): FamilyMemberDto => ({
  id: member.id,
  role: member.role,
  isActive: member.isActive,
  joinedAt: member.joinedAt,
  isSelf: member.id === actorMemberId,
  user: member.user,
});

const toInviteDto = (invite: InviteRow): InviteDto => ({
  id: invite.id,
  email: invite.email,
  role: invite.role,
  expiresAt: invite.expiresAt,
  createdAt: invite.createdAt,
  isExpired: isExpired(invite.expiresAt),
  invitedBy: invite.invitedBy,
});

const toFamilyDto = (
  family: FamilyRow,
  memberCount: number,
  pendingInviteCount: number,
): FamilyDto => ({
  id: family.id,
  name: family.name,
  code: family.code,
  isActive: family.isActive,
  createdAt: family.createdAt,
  memberCount,
  pendingInviteCount,
  settings: family.settings,
});

/**
 * Privilege-escalation guard: you may only hand out roles strictly below your own.
 * A TENANT_OWNER (80) can create FAMILY_HEADs (60); a FAMILY_HEAD can only create
 * MEMBERs (40) and VIEWERs (20) — never another FAMILY_HEAD, and never an owner.
 */
const assertCanAssignRole = (actorRole: UserRole, targetRole: AssignableRole): void => {
  if (ROLE_HIERARCHY[targetRole] >= ROLE_HIERARCHY[actorRole]) {
    throw new ForbiddenError(MSG.FAMILY_ROLE_TOO_HIGH);
  }
};

/** You may only manage members that rank strictly below you. */
const assertCanManageMember = (actor: ActorContext, member: MemberRow): void => {
  if (member.role === UserRole.TENANT_OWNER) {
    throw new ForbiddenError(MSG.FAMILY_OWNER_PROTECTED);
  }
  if (ROLE_HIERARCHY[member.role] >= ROLE_HIERARCHY[actor.role]) {
    throw new ForbiddenError(MSG.FAMILY_MEMBER_OUTRANKS);
  }
};

export const familyService = {
  // ── Workspace ─────────────────────────────────────────────────────────────

  async getFamily(familyId: string): Promise<FamilyDto> {
    const [family, memberCount, pendingInviteCount] = await Promise.all([
      familyRepository.findFamilyById(familyId),
      familyRepository.countActiveMembers(familyId),
      familyRepository.countPendingInvites(familyId),
    ]);

    if (!family) throw new NotFoundError('Family');
    return toFamilyDto(family, memberCount, pendingInviteCount);
  },

  async updateFamily(familyId: string, input: UpdateFamilyInput): Promise<FamilyDto> {
    const family = await familyRepository.updateFamily(familyId, { name: input.name });
    const [memberCount, pendingInviteCount] = await Promise.all([
      familyRepository.countActiveMembers(familyId),
      familyRepository.countPendingInvites(familyId),
    ]);
    return toFamilyDto(family, memberCount, pendingInviteCount);
  },

  /** Workspaces the user belongs to — powers the switcher. */
  async listMyFamilies(userId: string): Promise<FamilySummaryDto[]> {
    const [memberships, activeFamilyId] = await Promise.all([
      familyRepository.listUserFamilies(userId),
      familyRepository.getActiveFamilyId(userId),
    ]);

    // Mirrors resolveTenant: without an explicit choice the oldest membership wins.
    const currentId = memberships.some((m) => m.family.id === activeFamilyId)
      ? activeFamilyId
      : memberships[0]?.family.id;

    return memberships.map((membership) => ({
      id: membership.family.id,
      name: membership.family.name,
      code: membership.family.code,
      role: membership.role,
      memberCount: membership.memberCount,
      isCurrent: membership.family.id === currentId,
    }));
  },

  async switchFamily(userId: string, familyId: string): Promise<FamilySummaryDto[]> {
    const memberships = await familyRepository.listUserFamilies(userId);
    if (!memberships.some((m) => m.family.id === familyId)) {
      throw new ForbiddenError(MSG.FAMILY_NOT_A_MEMBER);
    }

    await familyRepository.setActiveFamily(userId, familyId);
    return this.listMyFamilies(userId);
  },

  // ── Members ───────────────────────────────────────────────────────────────

  async listMembers(familyId: string, actorMemberId: string): Promise<FamilyMemberDto[]> {
    const members = await familyRepository.listMembers(familyId);
    return members.map((member) => toMemberDto(member, actorMemberId));
  },

  async updateMemberRole(
    actor: ActorContext,
    memberId: string,
    role: AssignableRole,
  ): Promise<FamilyMemberDto> {
    const member = await familyRepository.findMember(actor.familyId, memberId);
    if (!member) throw new NotFoundError('Member');

    if (member.id === actor.memberId) {
      throw new ForbiddenError(MSG.FAMILY_SELF_ROLE_CHANGE);
    }
    assertCanManageMember(actor, member);
    assertCanAssignRole(actor.role, role);

    const updated = await familyRepository.updateMemberRole(member.id, role as UserRole);
    return toMemberDto(updated, actor.memberId);
  },

  async removeMember(actor: ActorContext, memberId: string): Promise<void> {
    const member = await familyRepository.findMember(actor.familyId, memberId);
    if (!member) throw new NotFoundError('Member');

    if (member.id === actor.memberId) {
      throw new ForbiddenError(MSG.FAMILY_SELF_REMOVE);
    }
    assertCanManageMember(actor, member);

    await familyRepository.deactivateMember(actor.familyId, member.id, member.userId);
  },

  // ── Invites ───────────────────────────────────────────────────────────────

  async listInvites(familyId: string): Promise<InviteDto[]> {
    const invites = await familyRepository.listPendingInvites(familyId);
    return invites.map(toInviteDto);
  },

  async inviteMember(actor: ActorContext, input: InviteMemberInput): Promise<InviteDto> {
    assertCanAssignRole(actor.role, input.role);

    const existing = await familyRepository.findActiveMemberByEmail(actor.familyId, input.email);
    if (existing) {
      throw new AppError(MSG.FAMILY_ALREADY_MEMBER, 409, 'ALREADY_MEMBER');
    }

    // A seat is claimed the moment an invite is sent (the invited email could
    // accept tomorrow), so reject when the family is at or beyond its plan's
    // member limit. Pending invites count towards that limit too, otherwise a
    // family at the cap could pile up invites and blow past its seats when they
    // all accept. This mirrors the guard used on plan downgrades.
    const { current, limit } =
      await subscriptionRepository.isWithinMemberLimit(actor.familyId);
    if (limit !== null) {
      const pendingInvites = await familyRepository.listPendingInvites(actor.familyId);
      const seatsInUse = current + pendingInvites.length;
      if (seatsInUse >= limit) {
        throw new ValidationError(MSG.VALIDATION_ERROR, {
          members: [
            `Your plan allows a maximum of ${limit} active member${limit === 1 ? '' : 's'} (${seatsInUse} in use).`,
          ],
        });
      }
    }

    const token = generateSecureToken();
    const invite = await familyRepository.upsertInvite({
      familyId: actor.familyId,
      email: input.email,
      role: input.role as UserRole,
      token,
      expiresAt: addHours(new Date(), env.INVITE_EXPIRES_HOURS),
      invitedById: actor.userId,
    });

    await this.sendInviteEmail(actor, input.email, token);
    return toInviteDto(invite);
  },

  async resendInvite(actor: ActorContext, inviteId: string): Promise<InviteDto> {
    const invite = await familyRepository.findInvite(actor.familyId, inviteId);
    if (!invite) throw new NotFoundError('Invitation');

    const token = generateSecureToken();
    const refreshed = await familyRepository.refreshInviteToken(
      invite.id,
      token,
      addHours(new Date(), env.INVITE_EXPIRES_HOURS),
    );

    await this.sendInviteEmail(actor, invite.email, token);
    return toInviteDto(refreshed);
  },

  async revokeInvite(familyId: string, inviteId: string): Promise<void> {
    const invite = await familyRepository.findInvite(familyId, inviteId);
    if (!invite) throw new NotFoundError('Invitation');
    await familyRepository.deleteInvite(invite.id);
  },

  /**
   * Unauthenticated preview so the accept page can say *what* you were invited to
   * before asking you to sign in. The token itself is the secret — nothing is
   * exposed to someone who does not already hold the link.
   */
  async previewInvite(token: string): Promise<InvitePreviewDto> {
    const invite = await familyRepository.findInviteByToken(token);
    if (!invite || !invite.family.isActive) {
      throw new AppError(MSG.FAMILY_INVITE_INVALID, 404, 'INVITE_INVALID');
    }

    return {
      email: invite.email,
      role: invite.role,
      familyName: invite.family.name,
      expiresAt: invite.expiresAt,
      isAccepted: invite.isAccepted,
      isExpired: isExpired(invite.expiresAt),
    };
  },

  /**
   * Joins the authenticated user to the inviting family. The invite email must match
   * the signed-in account, otherwise anyone holding the link could join.
   */
  async acceptInvite(
    user: { id: string; email: string },
    token: string,
  ): Promise<{ familyId: string; familyName: string; role: UserRole }> {
    const invite = await familyRepository.findInviteByToken(token);
    if (!invite || !invite.family.isActive) {
      throw new AppError(MSG.FAMILY_INVITE_INVALID, 404, 'INVITE_INVALID');
    }
    if (invite.isAccepted) {
      throw new AppError(MSG.FAMILY_INVITE_ALREADY_ACCEPTED, 409, 'INVITE_ACCEPTED');
    }
    if (isExpired(invite.expiresAt)) {
      throw new AppError(MSG.FAMILY_INVITE_INVALID, 410, 'INVITE_EXPIRED');
    }
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenError(MSG.FAMILY_INVITE_EMAIL_MISMATCH);
    }

    const existing = await familyRepository.findMembershipByUserId(invite.familyId, user.id);
    if (existing?.isActive) {
      throw new AppError(MSG.FAMILY_ALREADY_MEMBER, 409, 'ALREADY_MEMBER');
    }

    // The seat guard is re-checked at accept time, not just when the invite is
    // issued — a downgrade, or another invite accepted meanwhile, could have
    // moved the family to its cap. This invite is still pending here and becomes
    // this acceptee's active seat, so counting it keeps the pre/post-accept math
    // identical to the guard `inviteMember` runs.
    const { current, limit } = await subscriptionRepository.isWithinMemberLimit(invite.familyId);
    if (limit !== null) {
      const pendingInvites = await familyRepository.listPendingInvites(invite.familyId);
      if (current + pendingInvites.length >= limit) {
        throw new ValidationError(MSG.VALIDATION_ERROR, {
          members: [
            `This family is at its ${limit}-member plan limit. Ask the family owner to upgrade before accepting.`,
          ],
        });
      }
    }

    await familyRepository.acceptInvite({
      inviteId: invite.id,
      familyId: invite.familyId,
      userId: user.id,
      role: invite.role,
      existingMemberId: existing?.id,
    });

    return { familyId: invite.familyId, familyName: invite.family.name, role: invite.role };
  },

  /** Email delivery must never roll back an invite that was already persisted. */
  async sendInviteEmail(actor: ActorContext, email: string, token: string): Promise<void> {
    const family = await familyRepository.findFamilyById(actor.familyId);
    const template = emailTemplates.familyInvite(
      `${actor.firstName} ${actor.lastName}`,
      family?.name ?? 'a family workspace',
      buildInviteLink(token),
    );

    try {
      await sendEmail({ to: email, ...template });
    } catch (err) {
      logger.error(`Failed to send invitation email to ${email}`, err);
    }
  },
};
