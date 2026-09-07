import { adminRepository } from './admin.repository';
import type {
  ListUsersQuery,
  ListFamiliesQuery,
  ListAuditLogsQuery,
  ListSubscriptionsQuery,
} from './admin.types';
import { NotFoundError } from '../../shared/errors/NotFoundError';

export const adminService = {
  // ─── Users ────────────────────────────────────────────────────────────────

  async listUsers(query: ListUsersQuery) {
    const [items, total] = await adminRepository.listUsers(query);
    return {
      items: items.map((u) => ({
        ...u,
        families: u.familyMembers.map((fm) => ({
          id: fm.family.id,
          name: fm.family.name,
          role: fm.role,
        })),
      })),
      total,
    };
  },

  async getUser(id: string) {
    const user = await adminRepository.getUser(id);
    if (!user) throw new NotFoundError('User');
    return {
      ...user,
      families: user.familyMembers.map((fm) => ({
        id: fm.family.id,
        name: fm.family.name,
        role: fm.role,
      })),
    };
  },

  async setUserStatus(id: string, isActive: boolean) {
    const user = await adminRepository.getUser(id);
    if (!user) throw new NotFoundError('User');
    return adminRepository.setUserStatus(id, isActive);
  },

  async updateMemberRole(userId: string, familyId: string, role: string) {
    const member = await adminRepository.findMember(userId, familyId);
    if (!member) throw new NotFoundError('Member');
    return adminRepository.updateMemberRole(userId, familyId, role);
  },

  // ─── Families ─────────────────────────────────────────────────────────────

  async listFamilies(query: ListFamiliesQuery) {
    const [items, total] = await adminRepository.listFamilies(query);
    return { items, total };
  },

  async getFamily(id: string) {
    const family = await adminRepository.getFamily(id);
    if (!family) throw new NotFoundError('Family');
    return family;
  },

  // ─── Subscriptions ────────────────────────────────────────────────────────

  async listSubscriptions(query: ListSubscriptionsQuery) {
    const [items, total] = await adminRepository.listSubscriptions(query);
    return { items, total };
  },

  // ─── Audit Logs ───────────────────────────────────────────────────────────

  async listAuditLogs(query: ListAuditLogsQuery) {
    const [items, total] = await adminRepository.listAuditLogs(query);
    return { items, total };
  },

  // ─── Analytics ────────────────────────────────────────────────────────────

  async getAnalytics() {
    return adminRepository.getAnalytics();
  },

  // ─── Announcements ────────────────────────────────────────────────────────

  async createAnnouncement(title: string, message: string, createdBy: string) {
    return adminRepository.createAnnouncement({ title, message, createdBy });
  },

  async listAnnouncements() {
    return adminRepository.listAnnouncements();
  },
};
