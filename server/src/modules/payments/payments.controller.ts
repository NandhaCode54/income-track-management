import type { NextFunction, Request, Response } from 'express';
import { paymentsService } from './payments.service';
import { actorFrom, param } from '../../shared/utils/request.util';
import { buildMeta } from '../../shared/utils/pagination.util';
import { sendCreated, sendSuccess } from '../../shared/utils/api-response.util';
import { MSG } from '../../shared/constants/messages';
import type {
  BillCreate,
  ListQuery,
  PaymentKind,
  RecordPaymentInput,
  RentCreate,
  SchoolFeeCreate,
} from './payments.types';

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const section = (kind: PaymentKind) => ({
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as ListQuery;
      const result = await paymentsService.list(kind, actorFrom(req).familyId, query);
      sendSuccess(res, MSG.FETCHED, { items: result.items }, 200, buildMeta(result.total, query.page, query.perPage));
    } catch (e) {
      next(e);
    }
  },

  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await paymentsService.getById(kind, actorFrom(req).familyId, param(req, 'id'));
      sendSuccess(res, MSG.FETCHED, { item });
    } catch (e) {
      next(e);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await paymentsService.create(
        kind,
        actorFrom(req).familyId,
        req.body as BillCreate | RentCreate | SchoolFeeCreate,
      );
      sendCreated(res, MSG.CREATED, { item });
    } catch (e) {
      next(e);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await paymentsService.update(
        kind,
        actorFrom(req).familyId,
        param(req, 'id'),
        req.body as Partial<BillCreate | RentCreate | SchoolFeeCreate>,
      );
      sendSuccess(res, MSG.UPDATED, { item });
    } catch (e) {
      next(e);
    }
  },

  pay: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await paymentsService.recordPayment(
        kind,
        actorFrom(req).familyId,
        param(req, 'id'),
        req.body as RecordPaymentInput,
      );
      sendSuccess(res, 'Payment recorded.', { item });
    } catch (e) {
      next(e);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await paymentsService.remove(kind, actorFrom(req).familyId, param(req, 'id'));
      sendSuccess(res, MSG.DELETED);
    } catch (e) {
      next(e);
    }
  },
});

export const billsController = section('bill');
export const rentController = section('rent');
export const schoolFeesController = section('schoolFee');
