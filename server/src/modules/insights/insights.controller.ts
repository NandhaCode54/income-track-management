import type { NextFunction, Request, Response } from 'express';
import { insightsService } from './insights.service';
import { actorFrom } from '../../shared/utils/request.util';
import { sendSuccess } from '../../shared/utils/api-response.util';
import { MSG } from '../../shared/constants/messages';

export const insightsController = {
  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const insights = await insightsService.build(
        actorFrom(req).familyId,
        req.query as unknown as { month: number; year: number },
      );
      sendSuccess(res, MSG.FETCHED, insights);
    } catch (e) {
      next(e);
    }
  },
};
