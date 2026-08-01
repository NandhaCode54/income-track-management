import type { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';
import type {
  ChartsQuery,
  DashboardPeriodQuery,
  TopExpensesQuery,
  UpcomingQuery,
} from './dashboard.types';
import { sendSuccess } from '../../shared/utils/api-response.util';
import { actorFrom } from '../../shared/utils/request.util';
import { MSG } from '../../shared/constants/messages';

export const dashboardController = {
  async summary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as DashboardPeriodQuery;
      const summary = await dashboardService.summary(actorFrom(req), query);
      sendSuccess(res, MSG.FETCHED, { summary });
    } catch (err) {
      next(err);
    }
  },

  async upcoming(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as UpcomingQuery;
      const upcoming = await dashboardService.upcoming(actorFrom(req), query);
      sendSuccess(res, MSG.FETCHED, { upcoming });
    } catch (err) {
      next(err);
    }
  },

  async charts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ChartsQuery;
      const charts = await dashboardService.charts(actorFrom(req), query);
      sendSuccess(res, MSG.FETCHED, { charts });
    } catch (err) {
      next(err);
    }
  },

  async topExpenses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as TopExpensesQuery;
      const top = await dashboardService.topExpenses(actorFrom(req), query);
      sendSuccess(res, MSG.FETCHED, { top });
    } catch (err) {
      next(err);
    }
  },

  async familyContribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as DashboardPeriodQuery;
      const contribution = await dashboardService.familyContribution(actorFrom(req), query);
      sendSuccess(res, MSG.FETCHED, { contribution });
    } catch (err) {
      next(err);
    }
  },
};
