import type { Request, Response, NextFunction } from 'express';
import type { AuditAction } from '@prisma/client';
import { prisma } from '../config/database';

interface AuditOptions {
  action: AuditAction;
  entity: string;
  getEntityId?: (req: Request, res: Response) => string | undefined;
}

export const audit = (options: AuditOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = options.getEntityId
          ? options.getEntityId(req, res)
          : (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) ?? body?.data?.id;

        prisma.auditLog
          .create({
            data: {
              familyId: req.familyId,
              userId: req.user?.id,
              action: options.action,
              entity: options.entity,
              entityId: entityId ?? undefined,
              newData: req.method !== 'DELETE' ? req.body : undefined,
              ip: req.ip,
              userAgent: req.get('user-agent'),
            },
          })
          .catch(console.error);
      }
      return originalJson(body);
    };

    next();
  };
};
