import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthError, ForbiddenError } from '../shared/errors/AuthError';
import { UserRole } from '@prisma/client';

/**
 * Resolves the active family membership for the authenticated user and pins every
 * downstream query to it. Attaches `req.member` (with role) and `req.familyId`.
 *
 * A user may belong to several families; `user.activeFamilyId` records which one they
 * are currently working in. If it is unset (or points at a family they have since left)
 * we fall back to their oldest active membership.
 *
 * Super admins bypass family membership checks — they operate across all families.
 *
 * Must run after the `authenticate` middleware.
 */
export const resolveTenant = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthError();

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        activeFamilyId: true,
        familyMembers: {
          where: { isActive: true, family: { isActive: true } },
          orderBy: { joinedAt: 'asc' },
          select: { id: true, familyId: true, role: true },
        },
      },
    });

    const memberships = user?.familyMembers ?? [];
    const member =
      memberships.find((m) => m.familyId === user?.activeFamilyId) ?? memberships[0];

    // Super admins can operate without a family context (admin panel).
    if (!member) {
      // Check if the user has any SUPER_ADMIN role at all
      const hasSuperAdminRole = memberships.some((m) => m.role === UserRole.SUPER_ADMIN);
      if (hasSuperAdminRole) {
        // For super admins with an explicit SUPER_ADMIN role, allow through without family context.
        // Admin routes that need family context will handle it themselves.
        req.member = { id: '', familyId: '', role: UserRole.SUPER_ADMIN };
        req.familyId = '';
        return next();
      }
      throw new ForbiddenError('You are not a member of any family workspace');
    }

    req.member = { id: member.id, familyId: member.familyId, role: member.role };
    req.familyId = member.familyId;

    next();
  } catch (err) {
    next(err);
  }
};
