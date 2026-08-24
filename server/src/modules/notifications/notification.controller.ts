import type { NextFunction, Request, Response } from 'express';
import { notificationRepository } from './notification.repository';
import type { ListNotificationsQuery, NotificationDto } from './notification.types';
import { actorFrom, param } from '../../shared/utils/request.util';
import { sendSuccess } from '../../shared/utils/api-response.util';
import { MSG } from '../../shared/constants/messages';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { buildMeta } from '../../shared/utils/pagination.util';

const toDto = (row: {
  id: string;
  type: NotificationDto['type'];
  title: string;
  message: string;
  isRead: boolean;
  readAt: Date | null;
  metadata: unknown;
  createdAt: Date;
}): NotificationDto => ({
  ...row,
  metadata: (row.metadata as Record<string, unknown> | null) ?? null,
});

export const notificationsController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = actorFrom(req);
      const query = req.query as unknown as ListNotificationsQuery;

      const [items, total] = await notificationRepository.list(actor.userId, actor.familyId, query);

      sendSuccess(
        res,
        MSG.NOTIFICATIONS_LISTED,
        { items: items.map(toDto) },
        200,
        buildMeta(total, query.page, query.perPage),
      );
    } catch (e) {
      next(e);
    }
  },

  unreadCount: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = actorFrom(req);
      const count = await notificationRepository.unreadCount(actor.userId, actor.familyId);
      sendSuccess(res, MSG.FETCHED, { count });
    } catch (e) {
      next(e);
    }
  },

  markRead: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { count } = await notificationRepository.markRead(param(req, 'id'), actorFrom(req).userId);
      if (count === 0) throw new NotFoundError('Notification');
      sendSuccess(res, MSG.NOTIFICATIONS_READ);
    } catch (e) {
      next(e);
    }
  },

  markAllRead: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = actorFrom(req);
      await notificationRepository.markAllRead(actor.familyId, actor.userId);
      sendSuccess(res, MSG.NOTIFICATIONS_ALL_READ);
    } catch (e) {
      next(e);
    }
  },
};
