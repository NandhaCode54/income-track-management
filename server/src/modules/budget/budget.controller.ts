import type { Request, Response, NextFunction } from 'express';
import { budgetService } from './budget.service';
import type { BudgetPeriodQuery } from './budget.types';
import { sendSuccess, sendCreated } from '../../shared/utils/api-response.util';
import { actorFrom, param } from '../../shared/utils/request.util';
import { MSG } from '../../shared/constants/messages';

export const budgetController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as BudgetPeriodQuery;
      const budgets = await budgetService.list(actorFrom(req), query);
      sendSuccess(res, MSG.FETCHED, { budgets });
    } catch (err) {
      next(err);
    }
  },

  async vsActual(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as BudgetPeriodQuery;
      const comparison = await budgetService.vsActual(actorFrom(req), query);
      sendSuccess(res, MSG.FETCHED, { comparison });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const budget = await budgetService.create(actorFrom(req), req.body);
      sendCreated(res, MSG.BUDGET_CREATED, { budget });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const budget = await budgetService.update(actorFrom(req), param(req, 'id'), req.body);
      sendSuccess(res, MSG.BUDGET_UPDATED, { budget });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await budgetService.remove(actorFrom(req), param(req, 'id'));
      sendSuccess(res, MSG.BUDGET_DELETED);
    } catch (err) {
      next(err);
    }
  },

  async copy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await budgetService.copy(actorFrom(req), req.body);

      // The counts matter here — "copied 8, skipped 3" is the whole outcome.
      sendSuccess(
        res,
        result.copied === 0 && result.overwritten === 0
          ? 'Every budget was already set for that month.'
          : MSG.BUDGET_COPIED,
        { result },
      );
    } catch (err) {
      next(err);
    }
  },
};
