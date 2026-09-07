import type { NextFunction, Request, Response } from 'express';
import { adminService } from './admin.service';
import { actorFrom, param } from '../../shared/utils/request.util';
import { buildMeta } from '../../shared/utils/pagination.util';
import { sendCreated, sendSuccess } from '../../shared/utils/api-response.util';
import { MSG } from '../../shared/constants/messages';
import type {
  ListUsersQuery,
  ListFamiliesQuery,
  ListAuditLogsQuery,
  ListSubscriptionsQuery,
} from './admin.types';

export const adminController = {
  // ─── Users ────────────────────────────────────────────────────────────────

  listUsers: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as ListUsersQuery;
      const result = await adminService.listUsers(query);
      sendSuccess(res, MSG.FETCHED, { items: result.items }, 200, buildMeta(result.total, query.page, query.perPage));
    } catch (e) {
      next(e);
    }
  },

  getUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await adminService.getUser(param(req, 'id'));
      sendSuccess(res, MSG.FETCHED, { user });
    } catch (e) {
      next(e);
    }
  },

  setUserStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { isActive } = req.body as { isActive: boolean };
      await adminService.setUserStatus(param(req, 'id'), isActive);
      sendSuccess(res, isActive ? 'User activated.' : 'User deactivated.');
    } catch (e) {
      next(e);
    }
  },

  updateMemberRole: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = param(req, 'id');
      const familyId = req.params.familyId as string;
      const { role } = req.body as { role: string };
      const member = await adminService.updateMemberRole(userId, familyId, role);
      sendSuccess(res, MSG.ADMIN_MEMBER_ROLE_UPDATED, { member });
    } catch (e) {
      next(e);
    }
  },

  // ─── Families ─────────────────────────────────────────────────────────────

  listFamilies: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as ListFamiliesQuery;
      const result = await adminService.listFamilies(query);
      sendSuccess(res, MSG.FETCHED, { items: result.items }, 200, buildMeta(result.total, query.page, query.perPage));
    } catch (e) {
      next(e);
    }
  },

  getFamily: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const family = await adminService.getFamily(param(req, 'id'));
      sendSuccess(res, MSG.FETCHED, { family });
    } catch (e) {
      next(e);
    }
  },

  // ─── Subscriptions ────────────────────────────────────────────────────────

  listSubscriptions: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as ListSubscriptionsQuery;
      const result = await adminService.listSubscriptions(query);
      sendSuccess(res, MSG.FETCHED, { items: result.items }, 200, buildMeta(result.total, query.page, query.perPage));
    } catch (e) {
      next(e);
    }
  },

  // ─── Audit Logs ───────────────────────────────────────────────────────────

  listAuditLogs: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as ListAuditLogsQuery;
      const result = await adminService.listAuditLogs(query);
      sendSuccess(res, MSG.FETCHED, { items: result.items }, 200, buildMeta(result.total, query.page, query.perPage));
    } catch (e) {
      next(e);
    }
  },

  // ─── Analytics ────────────────────────────────────────────────────────────

  getAnalytics: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const analytics = await adminService.getAnalytics();
      sendSuccess(res, MSG.FETCHED, { analytics });
    } catch (e) {
      next(e);
    }
  },

  // ─── Announcements ────────────────────────────────────────────────────────

  createAnnouncement: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = actorFrom(req);
      const { title, message } = req.body as { title: string; message: string };
      const announcement = await adminService.createAnnouncement(title, message, actor.userId);
      sendCreated(res, MSG.CREATED, { announcement });
    } catch (e) {
      next(e);
    }
  },

  listAnnouncements: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const announcements = await adminService.listAnnouncements();
      sendSuccess(res, MSG.FETCHED, { announcements });
    } catch (e) {
      next(e);
    }
  },
};
