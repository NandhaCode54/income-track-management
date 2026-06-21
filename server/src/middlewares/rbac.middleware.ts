import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../shared/errors/AuthError';
import { can, type PermissionKey } from '../shared/constants/permissions';
import { hasRoleOrAbove } from '../shared/constants/roles';
import type { UserRole } from '@prisma/client';

export const requirePermission = (permission: PermissionKey) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.member) {
      next(new ForbiddenError());
      return;
    }
    if (!can(req.member.role, permission)) {
      next(new ForbiddenError(`Permission denied: ${permission}`));
      return;
    }
    next();
  };
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.member) {
      next(new ForbiddenError());
      return;
    }
    const allowed = roles.some((role) => hasRoleOrAbove(req.member!.role, role));
    if (!allowed) {
      next(new ForbiddenError('Insufficient role'));
      return;
    }
    next();
  };
};
