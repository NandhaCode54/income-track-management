import type { Request, Response, NextFunction } from 'express';
import { categoryService } from './category.service';
import { sendSuccess, sendCreated } from '../../shared/utils/api-response.util';
import { actorFrom, param } from '../../shared/utils/request.util';
import { MSG } from '../../shared/constants/messages';

export const categoryController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await categoryService.list(actorFrom(req));
      sendSuccess(res, MSG.FETCHED, { categories });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await categoryService.create(actorFrom(req), req.body);
      sendCreated(res, MSG.CATEGORY_CREATED, { category });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await categoryService.update(actorFrom(req), param(req, 'id'), req.body);
      sendSuccess(res, MSG.CATEGORY_UPDATED, { category });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { expenseCount } = await categoryService.remove(actorFrom(req), param(req, 'id'));

      // Deleting a category leaves its expenses in place, uncategorised. Say so,
      // rather than letting the user assume the spending went with it.
      sendSuccess(
        res,
        expenseCount === 0
          ? MSG.CATEGORY_DELETED
          : `${MSG.CATEGORY_DELETED} ${expenseCount} ${
              expenseCount === 1 ? 'expense is' : 'expenses are'
            } now uncategorised.`,
        { uncategorisedCount: expenseCount },
      );
    } catch (err) {
      next(err);
    }
  },
};
