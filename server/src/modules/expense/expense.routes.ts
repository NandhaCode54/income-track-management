import { Router } from 'express';
import { AuditAction } from '@prisma/client';
import { expenseController } from './expense.controller';
import { categoryController } from './category.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenant } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { audit } from '../../middlewares/audit.middleware';
import { uploadCsv, uploadReceipt } from '../../middlewares/upload.middleware';
import { idParamSchema } from '../../shared/validators/field.validator';
import {
  createCategorySchema,
  createExpenseSchema,
  expenseSummarySchema,
  exportExpenseSchema,
  importExpenseSchema,
  listExpenseSchema,
  receiptParamsSchema,
  updateCategorySchema,
  updateExpenseSchema,
} from './expense.validator';

const router = Router();

// Every expense route is family-scoped: authenticate, then pin to the active workspace.
router.use(authenticate, resolveTenant);

// ── Categories. Declared before `/:id` so "categories" is not read as an expense id.
router.get('/categories', requirePermission('FINANCE_VIEW'), categoryController.list);

router.post(
  '/categories',
  requirePermission('FINANCE_WRITE'),
  validate(createCategorySchema),
  audit({ action: AuditAction.CREATE, entity: 'ExpenseCategory' }),
  categoryController.create,
);

router.patch(
  '/categories/:id',
  requirePermission('FINANCE_WRITE'),
  validate(idParamSchema, 'params'),
  validate(updateCategorySchema),
  audit({ action: AuditAction.UPDATE, entity: 'ExpenseCategory' }),
  categoryController.update,
);

/**
 * Removing a category rewrites how every past expense is reported, so unlike an
 * individual expense this is a `FINANCE_DELETE` action — heads and owners only.
 */
router.delete(
  '/categories/:id',
  requirePermission('FINANCE_DELETE'),
  validate(idParamSchema, 'params'),
  audit({ action: AuditAction.DELETE, entity: 'ExpenseCategory' }),
  categoryController.remove,
);

// ── Bulk transfer.
router.get(
  '/export',
  requirePermission('FINANCE_VIEW'),
  validate(exportExpenseSchema, 'query'),
  expenseController.exportCsv,
);

/**
 * `uploadCsv` must run before `validate`: the multipart body does not exist as
 * `req.body` until multer has parsed it.
 */
router.post(
  '/import',
  requirePermission('FINANCE_WRITE'),
  uploadCsv,
  validate(importExpenseSchema),
  audit({ action: AuditAction.CREATE, entity: 'Expense' }),
  expenseController.importCsv,
);

// ── Collection reads. Static paths must precede `/:id` or they'd be swallowed by it.
router.get(
  '/summary',
  requirePermission('FINANCE_VIEW'),
  validate(expenseSummarySchema, 'query'),
  expenseController.summary,
);

router.get('/recurring', requirePermission('FINANCE_VIEW'), expenseController.listRecurring);

router.get(
  '/',
  requirePermission('FINANCE_VIEW'),
  validate(listExpenseSchema, 'query'),
  expenseController.list,
);

router.get(
  '/:id',
  requirePermission('FINANCE_VIEW'),
  validate(idParamSchema, 'params'),
  expenseController.getOne,
);

// ── Writes.
router.post(
  '/',
  requirePermission('FINANCE_WRITE'),
  validate(createExpenseSchema),
  audit({ action: AuditAction.CREATE, entity: 'Expense' }),
  expenseController.create,
);

router.patch(
  '/:id',
  requirePermission('FINANCE_WRITE'),
  validate(idParamSchema, 'params'),
  validate(updateExpenseSchema),
  audit({ action: AuditAction.UPDATE, entity: 'Expense' }),
  expenseController.update,
);

/**
 * Guarded by FINANCE_WRITE rather than FINANCE_DELETE so a member can remove an
 * expense they added by mistake. Deleting *someone else's* row still requires a
 * family head — the service enforces that ownership rule.
 */
router.delete(
  '/:id',
  requirePermission('FINANCE_WRITE'),
  validate(idParamSchema, 'params'),
  audit({ action: AuditAction.DELETE, entity: 'Expense' }),
  expenseController.remove,
);

// ── Receipts.
router.post(
  '/:id/receipt',
  requirePermission('FINANCE_WRITE'),
  validate(idParamSchema, 'params'),
  uploadReceipt,
  audit({ action: AuditAction.CREATE, entity: 'Receipt' }),
  expenseController.uploadReceipt,
);

router.delete(
  '/:id/receipts/:receiptId',
  requirePermission('FINANCE_WRITE'),
  validate(receiptParamsSchema, 'params'),
  audit({ action: AuditAction.DELETE, entity: 'Receipt' }),
  expenseController.removeReceipt,
);

export const expenseRoutes = router;
