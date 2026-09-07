import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QK } from '@/constants/queryKeys';
import { adminApi } from '@/services/admin.service';
import type {
  ListUsersQuery,
  ListFamiliesQuery,
  ListAuditLogsQuery,
  ListSubscriptionsQuery,
} from '@/types/admin.types';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';

// ─── Users ──────────────────────────────────────────────────────────────────

export const useAdminUsers = (query: ListUsersQuery) =>
  useQuery({
    queryKey: [...QK.ADMIN_USERS, query],
    queryFn: () => adminApi.listUsers(query),
    placeholderData: keepPreviousData,
  });

export const useAdminUser = (id: string) =>
  useQuery({
    queryKey: QK.ADMIN_USER_DETAIL(id),
    queryFn: () => adminApi.getUser(id),
  });

export const useSetUserStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.setUserStatus(id, isActive),
    onSuccess: (_msg, { isActive }) => {
      void queryClient.invalidateQueries({ queryKey: QK.ADMIN_USERS });
      toast.success(isActive ? 'User activated.' : 'User deactivated.');
    },
    onError: (e) => toast.error('Could not update user', getApiErrorMessage(e)),
  });
};

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, familyId, role }: { userId: string; familyId: string; role: string }) =>
      adminApi.updateMemberRole(userId, familyId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QK.ADMIN_USERS });
      toast.success('Role updated.');
    },
    onError: (e) => toast.error('Could not update role', getApiErrorMessage(e)),
  });
};

// ─── Families ───────────────────────────────────────────────────────────────

export const useAdminFamilies = (query: ListFamiliesQuery) =>
  useQuery({
    queryKey: [...QK.ADMIN_FAMILIES, query],
    queryFn: () => adminApi.listFamilies(query),
    placeholderData: keepPreviousData,
  });

export const useAdminFamily = (id: string) =>
  useQuery({
    queryKey: QK.ADMIN_FAMILY_DETAIL(id),
    queryFn: () => adminApi.getFamily(id),
  });

// ─── Subscriptions ──────────────────────────────────────────────────────────

export const useAdminSubscriptions = (query: ListSubscriptionsQuery) =>
  useQuery({
    queryKey: [...QK.ADMIN_SUBSCRIPTIONS, query],
    queryFn: () => adminApi.listSubscriptions(query),
    placeholderData: keepPreviousData,
  });

// ─── Audit Logs ─────────────────────────────────────────────────────────────

export const useAdminAuditLogs = (query: ListAuditLogsQuery) =>
  useQuery({
    queryKey: [...QK.ADMIN_AUDIT_LOGS, query],
    queryFn: () => adminApi.listAuditLogs(query),
    placeholderData: keepPreviousData,
  });

// ─── Analytics ──────────────────────────────────────────────────────────────

export const useAdminAnalytics = () =>
  useQuery({
    queryKey: QK.ADMIN_ANALYTICS,
    queryFn: () => adminApi.getAnalytics(),
  });

// ─── Announcements ──────────────────────────────────────────────────────────

export const useAdminAnnouncements = () =>
  useQuery({
    queryKey: QK.ADMIN_ANNOUNCEMENTS,
    queryFn: () => adminApi.listAnnouncements(),
  });

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ title, message }: { title: string; message: string }) =>
      adminApi.createAnnouncement(title, message),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QK.ADMIN_ANNOUNCEMENTS });
      toast.success('Announcement sent.');
    },
    onError: (e) => toast.error('Could not send announcement', getApiErrorMessage(e)),
  });
};
