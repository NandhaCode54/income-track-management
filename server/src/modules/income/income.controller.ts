import type { Request, Response, NextFunction } from 'express';
import { incomeService } from './income.service';
import type { ListIncomeQuery, IncomeSummaryQuery } from './income.types';
import { sendSuccess, sendCreated } from '../../shared/utils/api-response.util';
import { actorFrom, param } from '../../shared/utils/request.util';
import { buildMeta } from '../../shared/utils/pagination.util';
import { MSG } from '../../shared/constants/messages';

export const incomeController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ListIncomeQuery;
      const { items, total, filteredTotal } = await incomeService.list(actorFrom(req), query);

      sendSuccess(
        res,
        MSG.FETCHED,
        { income: items, filteredTotal },
        200,
        buildMeta(total, query.page, query.perPage),
      );
    } catch (err) {
      next(err);
    }
  },

  async summary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as IncomeSummaryQuery;
      const summary = await incomeService.summary(actorFrom(req), query);
      sendSuccess(res, MSG.FETCHED, { summary });
    } catch (err) {
      next(err);
    }
  },

  async listRecurring(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const income = await incomeService.listRecurring(actorFrom(req));
      sendSuccess(res, MSG.FETCHED, { income });
    } catch (err) {
      next(err);
    }
  },

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const income = await incomeService.getById(actorFrom(req), param(req, 'id'));
      sendSuccess(res, MSG.FETCHED, { income });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const income = await incomeService.create(actorFrom(req), req.body);
      sendCreated(res, MSG.INCOME_CREATED, { income });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const income = await incomeService.update(actorFrom(req), param(req, 'id'), req.body);
      sendSuccess(res, MSG.INCOME_UPDATED, { income });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await incomeService.remove(actorFrom(req), param(req, 'id'));
      sendSuccess(res, MSG.INCOME_DELETED);
    } catch (err) {
      next(err);
    }
  },
};
