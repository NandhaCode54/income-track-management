import { api } from './api';
import { unwrap, type ApiEnvelope, type PaginationMeta } from '@/types/api.types';
import type { NotificationItem, NotificationsQuery } from '@/types/notifications.types';

export const notificationsApi = {
  async list(
    query: NotificationsQuery,
  ): Promise<{ items: NotificationItem[]; meta?: PaginationMeta }> {
    const { data } = await api.get<ApiEnvelope<{ items: NotificationItem[] }>>('/notifications', {
      params: { page: query.page, unreadOnly: query.unreadOnly ?? false },
    });
    const payload = unwrap(data);
    return { items: payload.items, meta: data.meta };
  },

  async unreadCount(): Promise<number> {
    const { data } = await api.get<ApiEnvelope<{ count: number }>>('/notifications/unread-count');
    return unwrap(data).count;
  },

  async markRead(id: string): Promise<string> {
    const { data } = await api.patch<ApiEnvelope<never>>(`/notifications/${id}/read`);
    return data.message;
  },

  async markAllRead(): Promise<string> {
    const { data } = await api.post<ApiEnvelope<never>>('/notifications/read-all');
    return data.message;
  },
};
