import type { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
      };
      member?: {
        id: string;
        familyId: string;
        role: UserRole;
      };
      familyId?: string;
    }
  }
}
