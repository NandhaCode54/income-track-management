import type { NextFunction, Request, Response } from 'express';
import {
  assetService,
  investmentService,
  liabilityService,
  netWorth,
} from './portfolio.service';
import { actorFrom, param } from '../../shared/utils/request.util';
import { sendCreated, sendSuccess } from '../../shared/utils/api-response.util';
import { MSG } from '../../shared/constants/messages';
import type { EntityService } from './portfolio.types';

/**
 * One generic handler set per entity. `EntityService` pins the input and DTO
 * types at each call site below, so the factory stays fully typed — the same
 * idea as the payments module's controller factory, minus the `any`.
 */
const crudHandlers = <TCreate, TUpdate, TDto>(
  label: string,
  service: EntityService<TCreate, TUpdate, TDto>,
) => ({
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await service.list(actorFrom(req).familyId);
      sendSuccess(res, MSG.FETCHED, { items });
    } catch (e) {
      next(e);
    }
  },

  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await service.getById(actorFrom(req).familyId, param(req, 'id'));
      sendSuccess(res, MSG.FETCHED, { item });
    } catch (e) {
      next(e);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await service.create(
        actorFrom(req).familyId,
        req.body as TCreate,
      );
      sendCreated(res, MSG.PORTFOLIO_ITEM_CREATED.replace('Created', `${label} created`), { item });
    } catch (e) {
      next(e);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await service.update(
        actorFrom(req).familyId,
        param(req, 'id'),
        req.body as TUpdate,
      );
      sendSuccess(res, MSG.UPDATED, { item });
    } catch (e) {
      next(e);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.remove(actorFrom(req).familyId, param(req, 'id'));
      sendSuccess(res, MSG.DELETED);
    } catch (e) {
      next(e);
    }
  },
});

export const investmentsController = crudHandlers('Investment', investmentService);
export const assetsController = crudHandlers('Asset', assetService);
export const liabilitiesController = crudHandlers('Liability', liabilityService);

export const netWorthController = {
  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await netWorth(actorFrom(req).familyId);
      sendSuccess(res, MSG.FETCHED, { netWorth: result });
    } catch (e) {
      next(e);
    }
  },
};
