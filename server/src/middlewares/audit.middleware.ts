import type { Request, Response, NextFunction } from 'express';
import { Prisma, type AuditAction } from '@prisma/client';
import { prisma } from '../config/database';

interface AuditOptions {
  action: AuditAction;
  entity: string;
  getEntityId?: (req: Request, res: Response, body: unknown) => string | undefined;
}

/** Keys never persisted to the audit log, wherever they appear. */
const REDACTED_KEYS = new Set([
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'verificationtoken',
  'resettoken',
  'authorization',
  'cookie',
]);

const CUID_REGEX = /^c[0-9a-z]{24}$/;

/** Returns a JSON-safe copy of the input with sensitive keys stripped. */
const normalizeForAudit = (value: unknown, key = ''): unknown => {
  if (REDACTED_KEYS.has(key.toLowerCase())) return undefined;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    const items = value.map((item) => normalizeForAudit(item)).filter((item) => item !== undefined);
    return items.length > 0 ? items : undefined;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      const normalized = normalizeForAudit(childValue, childKey);
      if (normalized !== undefined) out[childKey] = normalized;
    }
    return out;
  }
  return undefined;
};

/** Finds the first plausible entity id anywhere inside a (possibly nested) response body. */
const findEntityId = (value: unknown): string | undefined => {
  if (typeof value === 'string' && CUID_REGEX.test(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const id = findEntityId(item);
      if (id) return id;
    }
    return undefined;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.id === 'string' && CUID_REGEX.test(record.id)) return record.id;
    for (const childValue of Object.values(record)) {
      const id = findEntityId(childValue);
      if (id) return id;
    }
  }
  return undefined;
};

export const audit = (options: AuditOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = options.getEntityId
          ? options.getEntityId(req, res, body)
          : (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) ?? findEntityId(body);

        prisma.auditLog
          .create({
            data: {
              familyId: req.familyId,
              userId: req.user?.id,
              action: options.action,
              entity: options.entity,
              entityId: entityId ?? undefined,
              newData:
                req.method !== 'DELETE'
                  ? (normalizeForAudit(req.body) as Prisma.InputJsonValue)
                  : undefined,
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