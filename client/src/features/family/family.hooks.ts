import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { familyApi } from '@/services/family.service';
import { QK } from '@/constants/queryKeys';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/services/auth.service';
import { usePermission } from '@/hooks/usePermission';
import type { AssignableRole } from '@/constants/permissions';
import type { InviteMemberPayload } from '@/types/family.types';

// ── Queries ───────────────────────────────────────────────────────────────────

export const useFamily = () =>
  useQuery({ queryKey: QK.FAMILY, queryFn: familyApi.getFamily });

export const useFamilyMembers = () =>
  useQuery({ queryKey: QK.FAMILY_MEMBERS, queryFn: familyApi.listMembers });

/** Only members who may invite are allowed to read pending invites. */
export const useFamilyInvites = () => {
  const { can } = usePermission();
  return useQuery({
    queryKey: QK.FAMILY_INVITES,
    queryFn: familyApi.listInvites,
    enabled: can('MEMBER_INVITE'),
  });
};

export const useMyFamilies = () =>
  useQuery({ queryKey: QK.MY_FAMILIES, queryFn: familyApi.listMyFamilies });

// ── Mutations ─────────────────────────────────────────────────────────────────

const useFamilyMutation = <TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  options: {
    successTitle: string;
    errorTitle: string;
    invalidate: readonly (readonly unknown[])[];
  },
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      options.invalidate.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      toast.success(options.successTitle);
    },
    onError: (error) => toast.error(options.errorTitle, getApiErrorMessage(error)),
  });
};

export const useRenameFamily = () =>
  useFamilyMutation((payload: { name: string }) => familyApi.updateFamily(payload), {
    successTitle: 'Family name updated',
    errorTitle: 'Could not update family',
    invalidate: [QK.FAMILY, QK.MY_FAMILIES, QK.ME],
  });

export const useInviteMember = () =>
  useFamilyMutation((payload: InviteMemberPayload) => familyApi.inviteMember(payload), {
    successTitle: 'Invitation sent',
    errorTitle: 'Could not send invitation',
    invalidate: [QK.FAMILY_INVITES, QK.FAMILY],
  });

export const useResendInvite = () =>
  useFamilyMutation((inviteId: string) => familyApi.resendInvite(inviteId), {
    successTitle: 'Invitation sent again',
    errorTitle: 'Could not resend invitation',
    invalidate: [QK.FAMILY_INVITES],
  });

export const useRevokeInvite = () =>
  useFamilyMutation((inviteId: string) => familyApi.revokeInvite(inviteId), {
    successTitle: 'Invitation revoked',
    errorTitle: 'Could not revoke invitation',
    invalidate: [QK.FAMILY_INVITES, QK.FAMILY],
  });

export const useUpdateMemberRole = () =>
  useFamilyMutation(
    (args: { memberId: string; role: AssignableRole }) =>
      familyApi.updateMemberRole(args.memberId, args.role),
    {
      successTitle: 'Role updated',
      errorTitle: 'Could not update role',
      invalidate: [QK.FAMILY_MEMBERS],
    },
  );

export const useRemoveMember = () =>
  useFamilyMutation((memberId: string) => familyApi.removeMember(memberId), {
    successTitle: 'Member removed',
    errorTitle: 'Could not remove member',
    invalidate: [QK.FAMILY_MEMBERS, QK.FAMILY],
  });

/**
 * Switching workspaces changes the tenant every subsequent request is scoped to,
 * so the entire query cache is dropped and `/auth/me` is re-read for the new role.
 */
export const useSwitchFamily = () => {
  const queryClient = useQueryClient();
  const setMember = useAuthStore((s) => s.setMember);

  return useMutation({
    mutationFn: familyApi.switchFamily,
    onSuccess: async (families) => {
      const current = families.find((family) => family.isCurrent);
      queryClient.removeQueries();
      const profile = await queryClient.fetchQuery({ queryKey: QK.ME, queryFn: authApi.me });
      if (profile.member) setMember(profile.member);
      toast.success('Workspace switched', current ? `You are now in ${current.name}.` : undefined);
    },
    onError: (error) => toast.error('Could not switch workspace', getApiErrorMessage(error)),
  });
};
