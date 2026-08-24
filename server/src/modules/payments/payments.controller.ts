import type { NextFunction, Request, Response } from 'express';
import { paymentsService } from './payments.service';
import { actorFrom, param } from '../../shared/utils/request.util';
import { buildMeta } from '../../shared/utils/pagination.util';
import { sendCreated, sendSuccess } from '../../shared/utils/api-response.util';

type Kind = 'bill' | 'rent' | 'schoolFee';
const controller = (kind: Kind) => ({
  list: async (req: Request, res: Response, next: NextFunction) => { try { const q: any = req.query; const r = await paymentsService.list(kind, actorFrom(req).familyId, q); sendSuccess(res, 'Data fetched successfully.', { items: r.items }, 200, buildMeta(r.total, q.page, q.perPage)); } catch (e) { next(e); } },
  get: async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, 'Data fetched successfully.', { item: await paymentsService.get(kind, actorFrom(req).familyId, param(req, 'id')) }); } catch (e) { next(e); } },
  create: async (req: Request, res: Response, next: NextFunction) => { try { sendCreated(res, 'Created successfully.', { item: await paymentsService.create(kind, actorFrom(req).familyId, req.body) }); } catch (e) { next(e); } },
  update: async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, 'Updated successfully.', { item: await paymentsService.update(kind, actorFrom(req).familyId, param(req, 'id'), req.body) }); } catch (e) { next(e); } },
  remove: async (req: Request, res: Response, next: NextFunction) => { try { await paymentsService.remove(kind, actorFrom(req).familyId, param(req, 'id')); sendSuccess(res, 'Deleted successfully.'); } catch (e) { next(e); } },
  pay: async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, 'Payment recorded.', { item: await paymentsService.recordPayment(kind, actorFrom(req).familyId, param(req, 'id'), req.body) }); } catch (e) { next(e); } },
});
export const billsController = controller('bill');
export const rentController = controller('rent');
export const schoolFeesController = controller('schoolFee');
