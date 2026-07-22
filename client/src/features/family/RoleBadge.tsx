import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/constants/permissions';
import type { UserRole } from '@/types/auth.types';

const ROLE_VARIANTS: Record<UserRole, 'default' | 'success' | 'secondary' | 'muted'> = {
  SUPER_ADMIN: 'default',
  TENANT_OWNER: 'default',
  FAMILY_HEAD: 'success',
  MEMBER: 'secondary',
  VIEWER: 'muted',
};

const RoleBadge = ({ role }: { role: UserRole }) => (
  <Badge variant={ROLE_VARIANTS[role]}>{ROLE_LABELS[role]}</Badge>
);

export default RoleBadge;
