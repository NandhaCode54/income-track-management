import type { NextFunction, Request, Response } from 'express';
import { settingsService } from './settings.service';
import { actorFrom } from '../../shared/utils/request.util';
import { sendSuccess } from '../../shared/utils/api-response.util';
import { MSG } from '../../shared/constants/messages';
import type { UpdateSettingsInput } from './settings.types';

export const settingsController = {
  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await settingsService.get(actorFrom(req).familyId);
      sendSuccess(res, MSG.FETCHED, { settings });
    } catch (e) {
      next(e);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await settingsService.update(
        actorFrom(req).familyId,
        req.body as UpdateSettingsInput,
      );
      sendSuccess(res, MSG.UPDATED, { settings });
    } catch (e) {
      next(e);
    }
  },
};
