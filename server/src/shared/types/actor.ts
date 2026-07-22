import type { UserRole } from '@prisma/client';

/**
 * The member making the request, resolved by `authenticate` + `resolveTenant`.
 * Every family-scoped module builds one of these instead of reaching into `req`.
 */
export interface ActorContext {
  userId: string;
  memberId: string;
  familyId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
}
