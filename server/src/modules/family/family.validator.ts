import { z } from 'zod';
import { ASSIGNABLE_ROLES } from './family.types';

const assignableRoleSchema = z.enum(ASSIGNABLE_ROLES);

const idSchema = z.string().trim().min(1, 'Identifier is required');

export const updateFamilySchema = z.object({
  name: z.string().trim().min(1, 'Family name is required').max(80),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  role: assignableRoleSchema.default('MEMBER'),
});

export const updateMemberRoleSchema = z.object({
  role: assignableRoleSchema,
});

export const switchFamilySchema = z.object({
  familyId: idSchema,
});

export const idParamSchema = z.object({
  id: idSchema,
});

export const tokenParamSchema = z.object({
  token: z.string().trim().min(1, 'Invitation token is required'),
});
