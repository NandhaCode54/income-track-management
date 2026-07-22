import { api } from './api';
import type {
  AcceptInviteResult,
  Family,
  FamilyMember,
  FamilySummary,
  Invite,
  InviteMemberPayload,
  InvitePreview,
} from '@/types/family.types';
import type { AssignableRole } from '@/constants/permissions';
import { unwrap, type ApiEnvelope } from '@/types/api.types';

export const familyApi = {
  async getFamily(): Promise<Family> {
    const { data } = await api.get<ApiEnvelope<{ family: Family }>>('/families/me');
    return unwrap(data).family;
  },

  async updateFamily(payload: { name: string }): Promise<Family> {
    const { data } = await api.patch<ApiEnvelope<{ family: Family }>>('/families/me', payload);
    return unwrap(data).family;
  },

  async listMembers(): Promise<FamilyMember[]> {
    const { data } = await api.get<ApiEnvelope<{ members: FamilyMember[] }>>('/families/members');
    return unwrap(data).members;
  },

  async updateMemberRole(memberId: string, role: AssignableRole): Promise<FamilyMember> {
    const { data } = await api.patch<ApiEnvelope<{ member: FamilyMember }>>(
      `/families/members/${memberId}/role`,
      { role },
    );
    return unwrap(data).member;
  },

  async removeMember(memberId: string): Promise<string> {
    const { data } = await api.delete<ApiEnvelope<never>>(`/families/members/${memberId}`);
    return data.message;
  },

  async listInvites(): Promise<Invite[]> {
    const { data } = await api.get<ApiEnvelope<{ invites: Invite[] }>>('/families/invites');
    return unwrap(data).invites;
  },

  async inviteMember(payload: InviteMemberPayload): Promise<Invite> {
    const { data } = await api.post<ApiEnvelope<{ invite: Invite }>>('/families/invite', payload);
    return unwrap(data).invite;
  },

  async resendInvite(inviteId: string): Promise<string> {
    const { data } = await api.post<ApiEnvelope<{ invite: Invite }>>(
      `/families/invites/${inviteId}/resend`,
    );
    return data.message;
  },

  async revokeInvite(inviteId: string): Promise<string> {
    const { data } = await api.delete<ApiEnvelope<never>>(`/families/invites/${inviteId}`);
    return data.message;
  },

  async listMyFamilies(): Promise<FamilySummary[]> {
    const { data } = await api.get<ApiEnvelope<{ families: FamilySummary[] }>>('/families');
    return unwrap(data).families;
  },

  async switchFamily(familyId: string): Promise<FamilySummary[]> {
    const { data } = await api.post<ApiEnvelope<{ families: FamilySummary[] }>>(
      '/families/switch',
      { familyId },
    );
    return unwrap(data).families;
  },

  /** Public — no auth header required. */
  async previewInvite(token: string): Promise<InvitePreview> {
    const { data } = await api.get<ApiEnvelope<{ invite: InvitePreview }>>(
      `/families/invites/token/${token}`,
    );
    return unwrap(data).invite;
  },

  async acceptInvite(token: string): Promise<AcceptInviteResult> {
    const { data } = await api.post<ApiEnvelope<AcceptInviteResult>>(`/families/join/${token}`);
    return unwrap(data);
  },
};
