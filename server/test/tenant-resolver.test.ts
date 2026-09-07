import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRole } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../src/config/database', async () => {
  const { createPrismaMock } = await import('./helpers/mock-db');
  return { prisma: createPrismaMock() };
});

import { prisma } from '../src/config/database';
import { resetPrismaMocks } from './helpers/mock-db';
import { resolveTenant } from '../src/middlewares/tenant.middleware';
import { ForbiddenError } from '../src/shared/errors/AuthError';

type PrismaMock = typeof prisma;

const req = (userId: string) =>
  ({ user: { id: userId } }) as unknown as Request;

const run = (request: Request): Promise<NextFunction> =>
  new Promise((resolve) => {
    resolveTenant(request, {} as Response, resolve as unknown as NextFunction);
  });

const member = (id: string, familyId: string, role: UserRole, joinedAt: Date) => ({
  id,
  familyId,
  role,
  joinedAt,
});

describe('resolveTenant — tenant resolution regression suite', () => {
  beforeEach(() => resetPrismaMocks(prisma));

  it('for an authenticated user whose account row no longer exists (removed/deleted), returns a ForbiddenError', async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const request = req('user-gone');
    const next = await run(request);

    expect(next).toBeInstanceOf(ForbiddenError);
    expect((request as Request & { familyId?: string }).familyId).toBeUndefined();
  });

  it('for a user with no active family memberships, returns a ForbiddenError (no family workspace)', async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      activeFamilyId: 'f-1',
      familyMembers: [],
    });

    const request = req('user-familyless');
    const next = await run(request);

    expect(next).toBeInstanceOf(ForbiddenError);
  });

  it('ignores memberships in inactive families, so a user whose only family was deactivated is rejected', async () => {
    // The middleware filters with family: { isActive: true } server-side; here we
    // simulate the query results it would receive.
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      activeFamilyId: 'f-1',
      familyMembers: [],
    });

    const request = req('user-orphaned');
    const next = await run(request);

    expect(next).toBeInstanceOf(ForbiddenError);
  });

  it('lets a platform admin (SUPER_ADMIN membership) through and pins their family context', async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      activeFamilyId: 'fam-admin',
      familyMembers: [member('m-admin', 'fam-admin', UserRole.SUPER_ADMIN, new Date('2026-01-01'))],
    });

    const request = req('admin-1');
    const next = await run(request);

    expect(next).toBeUndefined();
    const typed = request as Request & { member: { id: string; familyId: string; role: UserRole }; familyId: string };
    expect(typed.member).toEqual({ id: 'm-admin', familyId: 'fam-admin', role: UserRole.SUPER_ADMIN });
    expect(typed.familyId).toBe('fam-admin');
  });

  it('honours activeFamilyId when it points at a live membership', async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      activeFamilyId: 'fam-b',
      familyMembers: [
        member('m-a', 'fam-a', UserRole.MEMBER, new Date('2026-01-01')),
        member('m-b', 'fam-b', UserRole.FAMILY_HEAD, new Date('2026-02-01')),
      ],
    });

    const request = req('user-two-homes');
    const next = await run(request);

    expect(next).toBeUndefined();
    const typed = request as Request & { familyId: string };
    expect(typed.familyId).toBe('fam-b');
  });

  it('falls back to the oldest active membership when activeFamilyId is stale (family they left)', async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      activeFamilyId: 'fam-gone',
      familyMembers: [
        member('m-a', 'fam-a', UserRole.MEMBER, new Date('2026-01-01')),
        member('m-b', 'fam-b', UserRole.MEMBER, new Date('2026-05-01')),
      ],
    });

    const request = req('user-left-family');
    const next = await run(request);

    expect(next).toBeUndefined();
    const typed = request as Request & { familyId: string };
    expect(typed.familyId).toBe('fam-a');
  });
});