import type { Request, Response, NextFunction } from 'express';
import { expenseService } from './expense.service';
import type { ExpenseSummaryQuery, ListExpenseQuery } from './expense.types';
import { sendSuccess, sendCreated } from '../../shared/utils/api-response.util';
import { actorFrom, param } from '../../shared/utils/request.util';
import { buildMeta } from '../../shared/utils/pagination.util';
import { requireFile } from '../../middlewares/upload.middleware';
import { MSG } from '../../shared/constants/messages';

/** Excel only reads a UTF-8 CSV correctly when it starts with a byte-order mark. */
const UTF8_BOM = String.fromCharCode(0xfeff);

export const expenseController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ListExpenseQuery;
      const { items, total, filteredTotal } = await expenseService.list(actorFrom(req), query);

      sendSuccess(
        res,
        MSG.FETCHED,
        { expenses: items, filteredTotal },
        200,
        buildMeta(total, query.page, query.perPage),
      );
    } catch (err) {
      next(err);
    }
  },

  async summary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ExpenseSummaryQuery;
      const summary = await expenseService.summary(actorFrom(req), query);
      sendSuccess(res, MSG.FETCHED, { summary });
    } catch (err) {
      next(err);
    }
  },

  async listRecurring(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expenses = await expenseService.listRecurring(actorFrom(req));
      sendSuccess(res, MSG.FETCHED, { expenses });
    } catch (err) {
      next(err);
    }
  },

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await expenseService.getById(actorFrom(req), param(req, 'id'));
      sendSuccess(res, MSG.FETCHED, { expense });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await expenseService.create(actorFrom(req), req.body);
      sendCreated(res, MSG.EXPENSE_CREATED, { expense });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await expenseService.update(actorFrom(req), param(req, 'id'), req.body);
      sendSuccess(res, MSG.EXPENSE_UPDATED, { expense });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await expenseService.remove(actorFrom(req), param(req, 'id'));
      sendSuccess(res, MSG.EXPENSE_DELETED);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Streams a file rather than the usual JSON envelope — the browser saves this
   * response straight to disk, so there is nothing for the client to unwrap.
   */
  async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as Omit<ListExpenseQuery, 'page' | 'perPage'>;
      const { csv, rowCount, totalMatching } = await expenseService.exportCsv(
        actorFrom(req),
        query,
      );

      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="expenses-${stamp}.csv"`);
      // Tells the client when the hard export cap truncated the result, which is
      // invisible in a file download otherwise.
      res.setHeader('X-Exported-Rows', String(rowCount));
      res.setHeader('X-Matching-Rows', String(totalMatching));

      res.send(`${UTF8_BOM}${csv}`);
    } catch (err) {
      next(err);
    }
  },

  async importCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = requireFile(req, 'file');
      const result = await expenseService.importCsv(actorFrom(req), file.buffer.toString('utf8'), {
        createMissingCategories: req.body.createMissingCategories,
      });

      sendSuccess(res, MSG.EXPENSE_IMPORTED, { result });
    } catch (err) {
      next(err);
    }
  },

  async uploadReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = requireFile(req, 'receipt');
      const receipt = await expenseService.addReceipt(actorFrom(req), param(req, 'id'), file);
      sendCreated(res, MSG.RECEIPT_UPLOADED, { receipt });
    } catch (err) {
      next(err);
    }
  },

  async removeReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await expenseService.removeReceipt(
        actorFrom(req),
        param(req, 'id'),
        param(req, 'receiptId'),
      );
      sendSuccess(res, MSG.RECEIPT_DELETED);
    } catch (err) {
      next(err);
    }
  },
};
