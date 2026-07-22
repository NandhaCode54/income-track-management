import { z } from 'zod';
import { ASSIGNABLE_ROLES } from '@/constants/permissions';

export const inviteMemberSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  role: z.enum(ASSIGNABLE_ROLES),
});

export type InviteMemberForm = z.infer<typeof inviteMemberSchema>;

export const renameFamilySchema = z.object({
  name: z.string().trim().min(1, 'Family name is required').max(80),
});

export type RenameFamilyForm = z.infer<typeof renameFamilySchema>;
