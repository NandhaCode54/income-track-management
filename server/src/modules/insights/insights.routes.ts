import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenant } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { insightsController } from './insights.controller';
import { insightsPeriodSchema } from './insights.validator';

/**
 * Insights are derived, read-only analytics over the same ledgers the
 * dashboard shows — FINANCE_VIEW is the matching gate. There is exactly one
 * endpoint on purpose: the client renders the three insight families as one
 * card stack, so a composite response saves three round trips and keeps the
 * numbers mutually consistent (they all come from the same window read).
 */
const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', requirePermission('FINANCE_VIEW'), validate(insightsPeriodSchema, 'query'), insightsController.get);

export { router as insightRoutes };
