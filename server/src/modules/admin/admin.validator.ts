import { z } from 'zod';

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

export const listFamiliesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  plan: z.enum(['FREE', 'PRO', 'FAMILY', 'ENTERPRISE']).optional(),
});

export const listAuditLogsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'INVITE_SENT', 'INVITE_ACCEPTED', 'ROLE_CHANGED', 'PASSWORD_CHANGED']).optional(),
  entity: z.string().optional(),
  userId: z.string().cuid().optional(),
  familyId: z.string().cuid().optional(),
});

export const listSubscriptionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  plan: z.enum(['FREE', 'PRO', 'FAMILY', 'ENTERPRISE']).optional(),
  status: z.enum(['TRIAL', 'ACTIVE', 'INACTIVE', 'CANCELLED', 'EXPIRED']).optional(),
});

export const idParamSchema = z.object({ id: z.string().cuid() });

export const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
});

export const userStatusSchema = z.object({
  isActive: z.boolean(),
});
