import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import RoleBadge from './RoleBadge';
import { usePermission } from '@/hooks/usePermission';
import { ROLE_LABELS, type AssignableRole } from '@/constants/permissions';
import { useRemoveMember, useUpdateMemberRole } from './family.hooks';
import type { FamilyMember } from '@/types/family.types';

const initials = (member: FamilyMember) =>
  `${member.user.firstName[0] ?? ''}${member.user.lastName[0] ?? ''}`.toUpperCase();

const MembersTable = ({ members }: { members: FamilyMember[] }) => {
  const { can, outranks, assignableRoles } = usePermission();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const [pendingRemoval, setPendingRemoval] = useState<FamilyMember | null>(null);

  /** Mirrors the server guard: never yourself, never the owner, only ranks below you. */
  const canManage = (member: FamilyMember) =>
    member.isActive && !member.isSelf && member.role !== 'TENANT_OWNER' && outranks(member.role);

  const showActions = can('MEMBER_ROLE_CHANGE') || can('MEMBER_REMOVE');

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Joined</th>
              {showActions && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(member)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {member.user.firstName} {member.user.lastName}
                        {member.isSelf && (
                          <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  {can('MEMBER_ROLE_CHANGE') && canManage(member) ? (
                    <Select
                      className="h-9 w-40"
                      aria-label={`Role for ${member.user.firstName}`}
                      value={member.role}
                      disabled={updateRole.isPending}
                      onChange={(event) =>
                        updateRole.mutate({
                          memberId: member.id,
                          role: event.target.value as AssignableRole,
                        })
                      }
                    >
                      {assignableRoles.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <RoleBadge role={member.role} />
                  )}
                </td>

                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                  {member.isActive ? (
                    new Date(member.joinedAt).toLocaleDateString()
                  ) : (
                    <Badge variant="destructive">Removed</Badge>
                  )}
                </td>

                {showActions && (
                  <td className="px-4 py-3 text-right">
                    {can('MEMBER_REMOVE') && canManage(member) && (
                      <button
                        type="button"
                        onClick={() => setPendingRemoval(member)}
                        aria-label={`Remove ${member.user.firstName}`}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {updateRole.isPending && (
        <p className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Updating role…
        </p>
      )}

      <ConfirmDialog
        open={!!pendingRemoval}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        title="Remove member?"
        description={
          pendingRemoval
            ? `${pendingRemoval.user.firstName} ${pendingRemoval.user.lastName} will lose access to this workspace. Their past income and expense records are kept.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        loading={removeMember.isPending}
        onConfirm={() =>
          pendingRemoval &&
          removeMember.mutate(pendingRemoval.id, { onSuccess: () => setPendingRemoval(null) })
        }
      />
    </>
  );
};

export default MembersTable;
