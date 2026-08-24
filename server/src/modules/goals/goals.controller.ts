import type { NextFunction, Request, Response } from 'express';
import { goalsService } from './goals.service';
import { actorFrom, param } from '../../shared/utils/request.util';
import { sendCreated, sendSuccess } from '../../shared/utils/api-response.util';
import { MSG } from '../../shared/constants/messages';
import type {
  ContributeInput,
  CreateGoalInput,
  ListGoalsQuery,
  UpdateGoalInput,
} from './goals.types';

export const goalsController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as ListGoalsQuery;
      const goals = await goalsService.list(actorFrom(req).familyId, query);
      sendSuccess(res, MSG.GOALS_LISTED, { goals });
    } catch (e) {
      next(e);
    }
  },

  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const goal = await goalsService.getById(actorFrom(req).familyId, param(req, 'id'));
      sendSuccess(res, MSG.FETCHED, { goal });
    } catch (e) {
      next(e);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const goal = await goalsService.create(
        actorFrom(req).familyId,
        req.body as CreateGoalInput,
      );
      sendCreated(res, MSG.GOAL_CREATED, { goal });
    } catch (e) {
      next(e);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const goal = await goalsService.update(
        actorFrom(req).familyId,
        param(req, 'id'),
        req.body as UpdateGoalInput,
      );
      sendSuccess(res, MSG.GOAL_UPDATED, { goal });
    } catch (e) {
      next(e);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await goalsService.remove(actorFrom(req).familyId, param(req, 'id'));
      sendSuccess(res, MSG.GOAL_DELETED);
    } catch (e) {
      next(e);
    }
  },

  contribute: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const goal = await goalsService.contribute(
        actorFrom(req).familyId,
        param(req, 'id'),
        req.body as ContributeInput,
      );
      sendSuccess(res, MSG.GOAL_CONTRIBUTION_ADDED, { goal });
    } catch (e) {
      next(e);
    }
  },
};
