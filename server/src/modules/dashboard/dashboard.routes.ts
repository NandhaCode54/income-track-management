import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenant } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import {
  dashboardPeriodSchema,
  topExpensesSchema,
  upcomingSchema,
} from './dashboard.validator';

const router = Router();

// Every dashboard route is family-scoped: authenticate, then pin to the active workspace.
router.use(authenticate, resolveTenant);

/**
 * The whole module is read-only, so every route sits on `FINANCE_VIEW` — a viewer
 * exists precisely to look at this page. There is no `audit()` anywhere here
 * either: the audit trail records changes, and nothing on the dashboard changes
 * anything. Logging reads would drown the real writes in noise.
 */
router.use(requirePermission('FINANCE_VIEW'));

router.get('/summary', validate(dashboardPeriodSchema, 'query'), dashboardController.summary);

router.get('/upcoming', validate(upcomingSchema, 'query'), dashboardController.upcoming);

router.get('/charts', validate(dashboardPeriodSchema, 'query'), dashboardController.charts);

router.get('/top-expenses', validate(topExpensesSchema, 'query'), dashboardController.topExpenses);

router.get(
  '/family-contribution',
  validate(dashboardPeriodSchema, 'query'),
  dashboardController.familyContribution,
);

export const dashboardRoutes = router;
