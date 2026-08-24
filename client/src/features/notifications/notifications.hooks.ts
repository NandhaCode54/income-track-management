import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QK } from '@/constants/queryKeys';
import { notificationsApi } from '@/services/notification.service';
import type { NotificationsQuery } from '@/types/notifications.types';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';

export const useNotifications = (query: NotificationsQuery) =>
  useQuery({
    queryKey: [...QK.NOTIFICATIONS, query],
    queryFn: () => notificationsApi.list(query),
    placeholderData: keepPreviousData,
  });

/**
 * The bell's badge. Polled rather than pushed — no socket infra exists and a
 * sixty-second cadence is plenty for payment reminders.
 */
export const useUnreadCount = () =>
  useQuery({
    queryKey: QK.UNREAD_COUNT,
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

const invalidateNotifications = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: QK.NOTIFICATIONS });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => invalidateNotifications(queryClient),
    onError: (e) => toast.error('Could not mark as read', getApiErrorMessage(e)),
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      invalidateNotifications(queryClient);
      toast.success('All caught up');
    },
    onError: (e) => toast.error('Could not mark all as read', getApiErrorMessage(e)),
  });
};
