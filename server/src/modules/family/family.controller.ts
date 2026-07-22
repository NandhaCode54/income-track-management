import type { Request, Response, NextFunction } from 'express';
import { familyService } from './family.service';
import { sendSuccess, sendCreated } from '../../shared/utils/api-response.util';
import { actorFrom, param } from '../../shared/utils/request.util';
import { AuthError } from '../../shared/errors/AuthError';
import { MSG } from '../../shared/constants/messages';

export const familyController = {
  async getFamily(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const family = await familyService.getFamily(actorFrom(req).familyId);
      sendSuccess(res, MSG.FETCHED, { family });
    } catch (err) {
      next(err);
    }
  },

  async updateFamily(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const family = await familyService.updateFamily(actorFrom(req).familyId, req.body);
      sendSuccess(res, MSG.FAMILY_UPDATED, { family });
    } catch (err) {
      next(err);
    }
  },

  async listMyFamilies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AuthError();
      const families = await familyService.listMyFamilies(req.user.id);
      sendSuccess(res, MSG.FETCHED, { families });
    } catch (err) {
      next(err);
    }
  },

  async switchFamily(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AuthError();
      const families = await familyService.switchFamily(req.user.id, req.body.familyId);
      sendSuccess(res, MSG.FAMILY_SWITCHED, { families });
    } catch (err) {
      next(err);
    }
  },

  async listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = actorFrom(req);
      const members = await familyService.listMembers(actor.familyId, actor.memberId);
      sendSuccess(res, MSG.FETCHED, { members });
    } catch (err) {
      next(err);
    }
  },

  async updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const member = await familyService.updateMemberRole(
        actorFrom(req),
        param(req, 'id'),
        req.body.role,
      );
      sendSuccess(res, MSG.FAMILY_ROLE_UPDATED, { member });
    } catch (err) {
      next(err);
    }
  },

  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await familyService.removeMember(actorFrom(req), param(req, 'id'));
      sendSuccess(res, MSG.FAMILY_MEMBER_REMOVED);
    } catch (err) {
      next(err);
    }
  },

  async listInvites(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invites = await familyService.listInvites(actorFrom(req).familyId);
      sendSuccess(res, MSG.FETCHED, { invites });
    } catch (err) {
      next(err);
    }
  },

  async inviteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invite = await familyService.inviteMember(actorFrom(req), req.body);
      sendCreated(res, MSG.FAMILY_INVITE_SENT, { invite });
    } catch (err) {
      next(err);
    }
  },

  async resendInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invite = await familyService.resendInvite(actorFrom(req), param(req, 'id'));
      sendSuccess(res, MSG.FAMILY_INVITE_RESENT, { invite });
    } catch (err) {
      next(err);
    }
  },

  async revokeInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await familyService.revokeInvite(actorFrom(req).familyId, param(req, 'id'));
      sendSuccess(res, MSG.FAMILY_INVITE_REVOKED);
    } catch (err) {
      next(err);
    }
  },

  async previewInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invite = await familyService.previewInvite(param(req, 'token'));
      sendSuccess(res, MSG.FETCHED, { invite });
    } catch (err) {
      next(err);
    }
  },

  async acceptInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AuthError();
      const result = await familyService.acceptInvite(req.user, param(req, 'token'));
      sendSuccess(res, MSG.FAMILY_INVITE_ACCEPTED, result);
    } catch (err) {
      next(err);
    }
  },
};
