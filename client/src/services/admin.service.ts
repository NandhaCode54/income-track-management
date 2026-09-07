import { api } from './api';
import { unwrap, type ApiEnvelope, type PaginationMeta } from '@/types/api.types';
import type {
  AdminUser,
  AdminFamily,
  AdminAuditLog,
  AdminSubscription,
  AdminAnalytics,
  AdminAnnouncement,
  ListUsersQuery,
  ListFamiliesQuery,
  ListAuditLogsQuery,
  ListSubscriptionsQuery,
} from '@/types/admin.types';

export const adminApi = {
  // ─── Users ────────────────────────────────────────────────────────────────

  async listUsers(
    query: ListUsersQuery,
  ): Promise<{ items: AdminUser[]; meta?: PaginationMeta }> {
    const { data } = await api.get<ApiEnvelope<{ items: AdminUser[] }>>('/admin/users', {
      params: { page: query.page, perPage: query.perPage ?? 20, search: query.search, isActive: query.isActive },
    });
    const payload = unwrap(data);
    return { items: payload.items, meta: data.meta };
  },

  async getUser(id: string): Promise<AdminUser> {
    const { data } = await api.get<ApiEnvelope<{ user: AdminUser }>>(`/admin/users/${id}`);
    return unwrap(data).user;
  },

  async setUserStatus(id: string, isActive: boolean): Promise<string> {
    const { data } = await api.patch<ApiEnvelope<never>>(`/admin/users/${id}/status`, { isActive });
    return data.message;
  },

  async updateMemberRole(userId: string, familyId: string, role: string): Promise<{ member: { id: string; role: string; family: { id: string; name: string } } }> {
    const { data } = await api.patch<ApiEnvelope<{ member: { id: string; role: string; family: { id: string; name: string } } }>>(
      `/admin/users/${userId}/families/${familyId}/role`,
      { role },
    );
    return unwrap(data);
  },

  // ─── Families ─────────────────────────────────────────────────────────────

  async listFamilies(
    query: ListFamiliesQuery,
  ): Promise<{ items: AdminFamily[]; meta?: PaginationMeta }> {
    const { data } = await api.get<ApiEnvelope<{ items: AdminFamily[] }>>('/admin/families', {
      params: { page: query.page, perPage: query.perPage ?? 20, search: query.search, plan: query.plan },
    });
    const payload = unwrap(data);
    return { items: payload.items, meta: data.meta };
  },

  async getFamily(id: string): Promise<AdminFamily> {
    const { data } = await api.get<ApiEnvelope<{ family: AdminFamily }>>(`/admin/families/${id}`);
    return unwrap(data).family;
  },

  // ─── Subscriptions ────────────────────────────────────────────────────────

  async listSubscriptions(
    query: ListSubscriptionsQuery,
  ): Promise<{ items: AdminSubscription[]; meta?: PaginationMeta }> {
    const { data } = await api.get<ApiEnvelope<{ items: AdminSubscription[] }>>('/admin/subscriptions', {
      params: { page: query.page, perPage: query.perPage ?? 20, plan: query.plan, status: query.status },
    });
    const payload = unwrap(data);
    return { items: payload.items, meta: data.meta };
  },

  // ─── Audit Logs ───────────────────────────────────────────────────────────

  async listAuditLogs(
    query: ListAuditLogsQuery,
  ): Promise<{ items: AdminAuditLog[]; meta?: PaginationMeta }> {
    const { data } = await api.get<ApiEnvelope<{ items: AdminAuditLog[] }>>('/admin/audit-logs', {
      params: { page: query.page, perPage: query.perPage ?? 20, action: query.action, entity: query.entity, userId: query.userId, familyId: query.familyId },
    });
    const payload = unwrap(data);
    return { items: payload.items, meta: data.meta };
  },

  // ─── Analytics ────────────────────────────────────────────────────────────

  async getAnalytics(): Promise<AdminAnalytics> {
    const { data } = await api.get<ApiEnvelope<{ analytics: AdminAnalytics }>>('/admin/analytics');
    return unwrap(data).analytics;
  },

  // ─── Announcements ────────────────────────────────────────────────────────

  async createAnnouncement(title: string, message: string): Promise<AdminAnnouncement> {
    const { data } = await api.post<ApiEnvelope<{ announcement: AdminAnnouncement }>>('/admin/announcements', { title, message });
    return unwrap(data).announcement;
  },

  async listAnnouncements(): Promise<AdminAnnouncement[]> {
    const { data } = await api.get<ApiEnvelope<{ announcements: AdminAnnouncement[] }>>('/admin/announcements');
    return unwrap(data).announcements;
  },
};
