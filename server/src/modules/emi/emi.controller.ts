import type { Request, Response, NextFunction } from 'express';
import { emiService } from './emi.service';
import type { CalculatorQuery, ListEmiQuery, UpcomingQuery } from './emi.types';
import { sendSuccess, sendCreated } from '../../shared/utils/api-response.util';
import { actorFrom, param } from '../../shared/utils/request.util';
import { buildMeta } from '../../shared/utils/pagination.util';
import { MSG } from '../../shared/constants/messages';

export const emiController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ListEmiQuery;
      const { items, total, totals } = await emiService.list(actorFrom(req), query);

      sendSuccess(
        res,
        MSG.FETCHED,
        { emis: items, totals },
        200,
        buildMeta(total, query.page, query.perPage),
      );
    } catch (err) {
      next(err);
    }
  },

  /** Pure maths — no actor is needed, so none is built. */
  async calculator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = emiService.calculator(req.query as unknown as CalculatorQuery);
      sendSuccess(res, MSG.FETCHED, { calculation: result });
    } catch (err) {
      next(err);
    }
  },

  async upcoming(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as UpcomingQuery;
      const upcoming = await emiService.upcoming(actorFrom(req), query);
      sendSuccess(res, MSG.FETCHED, { upcoming });
    } catch (err) {
      next(err);
    }
  },

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const emi = await emiService.getById(actorFrom(req), param(req, 'id'));
      sendSuccess(res, MSG.FETCHED, { emi });
    } catch (err) {
      next(err);
    }
  },

  async listPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payments = await emiService.listPayments(actorFrom(req), param(req, 'id'));
      sendSuccess(res, MSG.FETCHED, { payments });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const emi = await emiService.create(actorFrom(req), req.body);
      sendCreated(res, MSG.EMI_CREATED, { emi });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const emi = await emiService.update(actorFrom(req), param(req, 'id'), req.body);
      sendSuccess(res, MSG.EMI_UPDATED, { emi });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await emiService.remove(actorFrom(req), param(req, 'id'));
      sendSuccess(res, MSG.EMI_DELETED);
    } catch (err) {
      next(err);
    }
  },

  async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const emi = await emiService.recordPayment(actorFrom(req), param(req, 'id'), req.body);
      sendSuccess(res, MSG.EMI_PAYMENT_RECORDED, { emi });
    } catch (err) {
      next(err);
    }
  },
};
