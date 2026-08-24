import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenant } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { reportsController } from './reports.controller';
import {
  reportExportSchema,
  reportPeriodSchema,
  reportRangeSchema,
  reportYearSchema,
} from './reports.validator';

/**
 * Reports are read-only, so the whole surface is GET. Reads sit behind
 * REPORTS_VIEW; the two export endpoints sit behind REPORTS_EXPORT because a
 * downloadable file leaves the workspace and deserves its own gate — a viewer
 * who may look at numbers on screen is not necessarily allowed to walk out
 * with a file.
 */
const router = Router();

router.use(authenticate, resolveTenant);

router.get('/export/pdf', requirePermission('REPORTS_EXPORT'), validate(reportExportSchema, 'query'), reportsController.exportPdf);
router.get('/export/excel', requirePermission('REPORTS_EXPORT'), validate(reportExportSchema, 'query'), reportsController.exportExcel);

// Literal paths before `/:id`-shaped patterns is moot here (no :id routes),
// but exports stay first so an accidental future param route cannot shadow them.
router.get('/monthly', requirePermission('REPORTS_VIEW'), validate(reportPeriodSchema, 'query'), reportsController.monthly);
router.get('/yearly', requirePermission('REPORTS_VIEW'), validate(reportYearSchema, 'query'), reportsController.yearly);
router.get('/category-wise', requirePermission('REPORTS_VIEW'), validate(reportRangeSchema, 'query'), reportsController.categoryWise);
router.get('/member-wise', requirePermission('REPORTS_VIEW'), validate(reportRangeSchema, 'query'), reportsController.memberWise);
router.get('/cash-flow', requirePermission('REPORTS_VIEW'), validate(reportYearSchema, 'query'), reportsController.cashFlow);

export { router as reportRoutes };
