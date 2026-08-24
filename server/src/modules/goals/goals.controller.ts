import type { NextFunction, Request, Response } from 'express';
import { goalsService } from './goals.service';
import { actorFrom, param } from '../../shared/utils/request.util';
import { sendCreated, sendSuccess } from '../../shared/utils/api-response.util';
export const goalsController = {
  list: async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, 'Data fetched successfully.', { goals: await goalsService.list(actorFrom(req).familyId, req.query.completed as unknown as boolean | undefined) }); } catch (e) { next(e); } },
  get: async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, 'Data fetched successfully.', { goal: await goalsService.get(actorFrom(req).familyId, param(req, 'id')) }); } catch (e) { next(e); } },
  create: async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, 'Goal created.', { goal: await goalsService.create(actorFrom(req).familyId, req.body) }); } catch (e) { next(e); } },
  update: async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, 'Goal updated.', { goal: await goalsService.update(actorFrom(req).familyId, param(req, 'id'), req.body) }); } catch (e) { next(e); } },
  remove: async (req: Request, res: Response, next: NextFunction) => { try { await goalsService.remove(actorFrom(req).familyId, param(req, 'id')); sendSuccess(res, 'Goal deleted.'); } catch (e) { next(e); } },
  contribute: async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, 'Contribution added.', { goal: await goalsService.contribute(actorFrom(req).familyId, param(req, 'id'), req.body) }); } catch (e) { next(e); } },
};
