import { prisma } from '../../config/database';
import type { ListNotificationsQuery } from './notification.types';

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  isRead: true,
  readAt: true,
  metadata: true,
  createdAt: true,
} as const;

export const notificationRepository = {
  /**
   * A feed is personal (userId) but scoped to the workspace being viewed
   * (familyId), so switching families switches the bell — the same rule the
   * dashboard follows.
   */
  list(userId: string, familyId: string, query: ListNotificationsQuery) {
    const where = {
      userId,
      familyId,
      ...(query.unreadOnly ? { isRead: false } : {}),
    };

    return prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: notificationSelect,
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      prisma.notification.count({ where }),
    ]);
  },

  unreadCount(userId: string, familyId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, familyId, isRead: false } });
  },

  markRead(id: string, userId: string) {
    // Scoped by userId: a crafted id must not be able to read-mark someone else's.
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  },

  markAllRead(familyId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { familyId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  },
};
