import { describe, it, expect, vi } from 'vitest';
import { UserRole } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';

import { requirePermission, requireRole } from '../src/middlewares/rbac.middleware';
import { can, PERMISSIONS } from '../src/shared/constants/permissions';
import { hasRoleOrAbove } from '../src/shared/constants/roles';
import { ForbiddenError } from '../src/shared/errors/AuthError';

const requestWith = (role: UserRole | undefined) =>
  ({
    member: role ? { id: 'm-1', familyId: 'f-1', role } : undefined,
  }) as unknown as Request;

const call = (middleware: (req: Request, res: Response, next: NextFunction) => void, request: Request) => {
  const res = {} as Response;
  let settled: unknown;
  const next = ((err?: unknown) => {
    settled = { err: err ?? null };
  }) as NextFunction;
  middleware(request, res, next);
  return Promise.resolve(settled);
};

describe('RBAC — requirePermission', () => {
  it('rejects an unauthenticated request with no resolved member', async () => {
    const { err } = await call(requirePermission('FINANCE_WRITE'), requestWith(undefined));
    expect(err).toBeInstanceOf(ForbiddenError);
  });

  it('lets a MEMBER record income (FINANCE_WRITE)', async () => {
    const { err } = await call(requirePermission('FINANCE_WRITE'), requestWith(UserRole.MEMBER));
    expect(err).toBeNull();
  });

  it('denies a MEMBER the planning decisions (BUDGET_MANAGE)', async () => {
    const { err } = await call(requirePermission('BUDGET_MANAGE'), requestWith(UserRole.MEMBER));
    expect(err).toBeInstanceOf(ForbiddenError);
  });

  it('regression: subscription management is owner-only (SUBSCRIPTION_MANAGE), not FAMILY_HEAD', async () => {
    expect(PERMISSIONS.SUBSCRIPTION_MANAGE).toEqual([UserRole.TENANT_OWNER]);
    const { err: ownerErr } = await call(
      requirePermission('SUBSCRIPTION_MANAGE'),
      requestWith(UserRole.TENANT_OWNER),
    );
    const { err: headErr } = await call(
      requirePermission('SUBSCRIPTION_MANAGE'),
      requestWith(UserRole.FAMILY_HEAD),
    );
    expect(ownerErr).toBeNull();
    expect(headErr).toBeInstanceOf(ForbiddenError);
  });

  it('regression: a platform SUPER_ADMIN may access the admin panel even though the role lives outside the family hierarchy', async () => {
    expect(can(UserRole.SUPER_ADMIN, 'ADMIN_ACCESS')).toBe(true);
    const { err } = await call(requirePermission('ADMIN_ACCESS'), requestWith(UserRole.SUPER_ADMIN));
    expect(err).toBeNull();
  });

  it('denies admin panel access to non-platform roles', async () => {
    const { err } = await call(requirePermission('ADMIN_ACCESS'), requestWith(UserRole.TENANT_OWNER));
    expect(err).toBeInstanceOf(ForbiddenError);
  });
});

describe('RBAC — requireRole hierarchy', () => {
  it('admits anyone at or above the required rank', () => {
    expect(hasRoleOrAbove(UserRole.SUPER_ADMIN, UserRole.MEMBER)).toBe(true);
    expect(hasRoleOrAbove(UserRole.FAMILY_HEAD, UserRole.MEMBER)).toBe(true);
    expect(hasRoleOrAbove(UserRole.MEMBER, UserRole.MEMBER)).toBe(true);
  });

  it('rejects a viewer below the required rank', async () => {
    const { err } = await call(requireRole(UserRole.MEMBER), requestWith(UserRole.VIEWER));
    expect(err).toBeInstanceOf(ForbiddenError);
  });
});