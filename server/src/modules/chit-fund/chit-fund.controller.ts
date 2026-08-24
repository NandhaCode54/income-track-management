import type { NextFunction, Request, Response } from 'express';
import { chitFundService } from './chit-fund.service';
import { actorFrom, param } from '../../shared/utils/request.util';
import { sendCreated, sendSuccess } from '../../shared/utils/api-response.util';
import { MSG } from '../../shared/constants/messages';
import type { CreateChitFundInput, RecordChitPaymentInput } from './chit-fund.types';

export const chitFundController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await chitFundService.list(actorFrom(req).familyId);
      sendSuccess(res, MSG.FETCHED, result);
    } catch (e) {
      next(e);
    }
  },

  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await chitFundService.getById(
        actorFrom(req).familyId,
        param(req, 'id'),
      );
      sendSuccess(res, MSG.FETCHED, result);
    } catch (e) {
      next(e);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await chitFundService.create(
        actorFrom(req).familyId,
        req.body as CreateChitFundInput,
      );
      sendCreated(res, MSG.CHIT_FUND_CREATED, result);
    } catch (e) {
      next(e);
    }
  },

  recordPayment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await chitFundService.recordPayment(
        actorFrom(req).familyId,
        param(req, 'id'),
        req.body as RecordChitPaymentInput,
      );
      sendSuccess(res, MSG.CHIT_PAYMENT_RECORDED, result);
    } catch (e) {
      next(e);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await chitFundService.remove(actorFrom(req).familyId, param(req, 'id'));
      sendSuccess(res, MSG.CHIT_FUND_DELETED);
    } catch (e) {
      next(e);
    }
  },
};
