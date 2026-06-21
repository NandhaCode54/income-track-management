import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthError, ForbiddenError } from '../shared/errors/AuthError';

/**
 * Resolves the active family membership for the authenticated user.
 * Attaches req.member (with role) and req.familyId.
 * Must be used after authenticate middleware.
 */
export const resolveTenant = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthError();

    const member = await prisma.familyMember.findFirst({
      where: { userId: req.user.id, isActive: true },
      select: { id: true, familyId: true, role: true },
    });

    if (!member) throw new ForbiddenError('You are not a member of any family workspace');

    req.member = { id: member.id, familyId: member.familyId, role: member.role };
    req.familyId = member.familyId;

    next();
  } catch (err) {
    next(err);
  }
};
