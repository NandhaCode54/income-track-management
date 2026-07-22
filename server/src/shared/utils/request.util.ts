import type { Request } from 'express';
import type { ActorContext } from '../types/actor';
import { AuthError, ForbiddenError } from '../errors/AuthError';

/** Express types route params as `string | string[]`; validators guarantee a single value. */
export const param = (req: Request, name: string): string => {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
};

/** Builds the acting member's context from what `authenticate` + `resolveTenant` attached. */
export const actorFrom = (req: Request): ActorContext => {
  if (!req.user) throw new AuthError();
  if (!req.member) throw new ForbiddenError();
  return {
    userId: req.user.id,
    email: req.user.email,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    memberId: req.member.id,
    familyId: req.member.familyId,
    role: req.member.role,
  };
};
