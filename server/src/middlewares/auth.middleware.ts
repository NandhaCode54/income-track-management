import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../shared/utils/jwt.util';
import { AuthError } from '../shared/errors/AuthError';
import { prisma } from '../config/database';

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthError('No token provided');
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true, isVerified: true },
    });

    if (!user) throw new AuthError('User not found');
    if (!user.isActive) throw new AuthError('Account is deactivated');
    if (!user.isVerified) throw new AuthError('Please verify your email first');

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    next();
  } catch (err) {
    if (err instanceof AuthError) {
      next(err);
    } else {
      next(new AuthError('Invalid or expired token'));
    }
  }
};
