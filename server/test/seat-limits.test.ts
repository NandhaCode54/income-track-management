import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRole } from '@prisma/client';

vi.mock('../src/modules/family/family.repository', () => ({
  familyRepository: {
    findActiveMemberByEmail: vi.fn(),
    listPendingInvites: vi.fn(),
    upsertInvite: vi.fn(),
    findInviteByToken: vi.fn(),
    findMembershipByUserId: vi.fn(),
    acceptInvite: vi.fn(),
    findMember: vi.fn(),
    findFamilyById: vi.fn(),
  },
}));

vi.mock('../src/modules/subscription/subscription.repository', () => ({
  subscriptionRepository: {
    isWithinMemberLimit: vi.fn(),
  },
}));

vi.mock('../src/shared/utils/email.util', () => ({
  sendEmail: vi.fn(),
  emailTemplates: {
    familyInvite: vi.fn(() => ({ subject: 'You are invited', html: '<p>hi</p>' })),
  },
}));

import { familyService } from '../src/modules/family/family.service';
import { familyRepository } from '../src/modules/family/family.repository';
import { subscriptionRepository } from '../src/modules/subscription/subscription.repository';
import { ValidationError } from '../src/shared/errors/ValidationError';

type Fn = ReturnType<typeof vi.fn>;

const owner = {
  memberId: 'm-owner',
  familyId: 'f-1',
  userId: 'u-owner',
  role: UserRole.TENANT_OWNER,
  email: 'owner@fam.com',
  firstName: 'Owner',
  lastName: 'One',
};

const inviteFixture = {
  id: 'invite-1',
  familyId: 'f-1',
  email: 'nandini@fam.com',
  role: UserRole.MEMBER,
  token: 'tok-1',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  isAccepted: false,
  family: { isActive: true, name: 'Sharma Family' },
};

describe('seat limits — invite time', () => {
  beforeEach(() => {
    (familyRepository.findActiveMemberByEmail as unknown as Fn).mockReset();
    (familyRepository.listPendingInvites as unknown as Fn).mockReset();
    (familyRepository.upsertInvite as unknown as Fn).mockReset();
    (subscriptionRepository.isWithinMemberLimit as unknown as Fn).mockReset();
  });

  it('rejects an invite when the family sits at its plan’s member cap', async () => {
    (familyRepository.findActiveMemberByEmail as unknown as Fn).mockResolvedValue(null);
    (subscriptionRepository.isWithinMemberLimit as unknown as Fn).mockResolvedValue({ current: 2, limit: 2 });
    (familyRepository.listPendingInvites as unknown as Fn).mockResolvedValue([{ id: 'inv-a' }]);

    await expect(
      familyService.inviteMember(owner, { email: 'nandini@fam.com', role: UserRole.MEMBER }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(familyRepository.upsertInvite).not.toHaveBeenCalled();
  });

  it('counts pending invites toward the cap so seats cannot be piled up', async () => {
    (familyRepository.findActiveMemberByEmail as unknown as Fn).mockResolvedValue(null);
    // 1 active member + the invite being sent would be 2 — but 2 other invites
    // are already pending, so the family would blow past the limit of 2 if all accepted.
    (subscriptionRepository.isWithinMemberLimit as unknown as Fn).mockResolvedValue({ current: 1, limit: 2 });
    (familyRepository.listPendingInvites as unknown as Fn).mockResolvedValue([{ id: 'inv-a' }, { id: 'inv-b' }]);

    await expect(
      familyService.inviteMember(owner, { email: 'nandini@fam.com', role: UserRole.MEMBER }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('allows an invite when seats remain', async () => {
    (familyRepository.findActiveMemberByEmail as unknown as Fn).mockResolvedValue(null);
    (subscriptionRepository.isWithinMemberLimit as unknown as Fn).mockResolvedValue({ current: 1, limit: 5 });
    (familyRepository.listPendingInvites as unknown as Fn).mockResolvedValue([]);
    (familyRepository.upsertInvite as unknown as Fn).mockResolvedValue({ id: 'invite-new', familyId: 'f-1' });

    const invite = await familyService.inviteMember(owner, { email: 'nandini@fam.com', role: UserRole.MEMBER });

    expect(invite.id).toBe('invite-new');
    expect(familyRepository.upsertInvite).toHaveBeenCalledTimes(1);
  });
});

describe('seat limits — accept time (regression: enforced on acceptance too)', () => {
  beforeEach(() => {
    (familyRepository.findInviteByToken as unknown as Fn).mockReset();
    (familyRepository.findMembershipByUserId as unknown as Fn).mockReset();
    (familyRepository.listPendingInvites as unknown as Fn).mockReset();
    (familyRepository.acceptInvite as unknown as Fn).mockReset();
    (subscriptionRepository.isWithinMemberLimit as unknown as Fn).mockReset();
  });

  it('rejects an acceptance when the family reached its cap since the invite was sent', async () => {
    (familyRepository.findInviteByToken as unknown as Fn).mockResolvedValue(inviteFixture);
    (familyRepository.findMembershipByUserId as unknown as Fn).mockResolvedValue(null);
    (subscriptionRepository.isWithinMemberLimit as unknown as Fn).mockResolvedValue({ current: 2, limit: 2 });
    (familyRepository.listPendingInvites as unknown as Fn).mockResolvedValue([inviteFixture]);

    await expect(
      familyService.acceptInvite({ id: 'u-nandini', email: 'nandini@fam.com' }, 'tok-1'),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(familyRepository.acceptInvite).not.toHaveBeenCalled();
  });

  it('allows acceptance while seats remain, passing the resolved role and membership state', async () => {
    (familyRepository.findInviteByToken as unknown as Fn).mockResolvedValue(inviteFixture);
    (familyRepository.findMembershipByUserId as unknown as Fn).mockResolvedValue(null);
    (subscriptionRepository.isWithinMemberLimit as unknown as Fn).mockResolvedValue({ current: 1, limit: 5 });
    (familyRepository.listPendingInvites as unknown as Fn).mockResolvedValue([inviteFixture]);
    (familyRepository.acceptInvite as unknown as Fn).mockResolvedValue({});

    const result = await familyService.acceptInvite(
      { id: 'u-nandini', email: 'nandini@fam.com' },
      'tok-1',
    );

    expect(result.familyId).toBe('f-1');
    expect(familyRepository.acceptInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteId: 'invite-1',
        familyId: 'f-1',
        userId: 'u-nandini',
        role: UserRole.MEMBER,
      }),
    );
  });
});