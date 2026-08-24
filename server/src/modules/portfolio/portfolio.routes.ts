import { Router } from 'express';
import type { Request, RequestHandler, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { AuditAction } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenant } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { audit } from '../../middlewares/audit.middleware';
import {
  assetsController,
  investmentsController,
  liabilitiesController,
  netWorthController,
} from './portfolio.controller';
import {
  createAssetSchema,
  createInvestmentSchema,
  createLiabilitySchema,
  idParamSchema,
  updateAssetSchema,
  updateInvestmentSchema,
  updateLiabilitySchema,
} from './portfolio.validator';

type CrudController = Record<
  'list' | 'get' | 'create' | 'update' | 'remove',
  (req: Request, res: Response, next: NextFunction) => void
>;

/**
 * The three portfolio ledgers share one shape of surface: list, get, create,
 * update, delete. A builder keeps the middleware chain identical — permission,
 * validation and audit included — so a fix to one applies to all three. This is
 * the payments factory, retyped.
 */
const crudRoutes = (
  controller: CrudController,
  createSchema: ZodSchema,
  updateSchema: ZodSchema,
  entity: string,
): Router => {
  const router = Router();
  router.use(authenticate, resolveTenant);

  router.get('/', requirePermission('FINANCE_VIEW'), controller.list as RequestHandler);
  router.post(
    '/',
    requirePermission('FINANCE_WRITE'),
    validate(createSchema),
    audit({ action: AuditAction.CREATE, entity }),
    controller.create as RequestHandler,
  );
  router.get(
    '/:id',
    requirePermission('FINANCE_VIEW'),
    validate(idParamSchema, 'params'),
    controller.get as RequestHandler,
  );
  router.patch(
    '/:id',
    requirePermission('FINANCE_WRITE'),
    validate(idParamSchema, 'params'),
    validate(updateSchema),
    audit({ action: AuditAction.UPDATE, entity }),
    controller.update as RequestHandler,
  );
  router.delete(
    '/:id',
    requirePermission('FINANCE_DELETE'),
    validate(idParamSchema, 'params'),
    audit({ action: AuditAction.DELETE, entity }),
    controller.remove as RequestHandler,
  );

  return router;
};

export const investmentRoutes = crudRoutes(
  investmentsController,
  createInvestmentSchema,
  updateInvestmentSchema,
  'Investment',
);

export const assetRoutes = crudRoutes(
  assetsController,
  createAssetSchema,
  updateAssetSchema,
  'Asset',
);

export const liabilityRoutes = crudRoutes(
  liabilitiesController,
  createLiabilitySchema,
  updateLiabilitySchema,
  'Liability',
);

/**
 * Net worth spans all three ledgers, so it gets its own namespace instead of
 * living under any one of them (the plan's `/assets/net-worth` would suggest
 * the figure ignores liabilities — it does not).
 */
const portfolioRoutes = Router();
portfolioRoutes.use(authenticate, resolveTenant);
portfolioRoutes.get('/net-worth', requirePermission('FINANCE_VIEW'), netWorthController.get);

export { portfolioRoutes };
