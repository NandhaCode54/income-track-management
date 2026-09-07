import { Router } from 'express';
import { AuditAction } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';
import { resolveTenant } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { requirePlan } from '../../middlewares/plan.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { audit } from '../../middlewares/audit.middleware';
import { billsController, rentController, schoolFeesController } from './payments.controller';
import { billSchema, billUpdateSchema, idParamSchema, listSchema, paymentSchema, rentSchema, rentUpdateSchema, schoolFeeSchema, schoolFeeUpdateSchema } from './payments.validator';
import type { PlanFeatureKey } from '../subscription/subscription.types';

const routes = (
  controller: any,
  createSchema: any,
  updateSchema: any,
  entity: string,
  gates: PlanFeatureKey[] = [],
) => {
  const router = Router();
  router.use(authenticate, resolveTenant);
  if (gates.length > 0) router.use(requirePlan(...gates));
  router.get('/', requirePermission('FINANCE_VIEW'), validate(listSchema, 'query'), controller.list);
  router.get('/:id', requirePermission('FINANCE_VIEW'), validate(idParamSchema, 'params'), controller.get);
  router.post('/', requirePermission('FINANCE_WRITE'), validate(createSchema), audit({ action: AuditAction.CREATE, entity }), controller.create);
  router.patch('/:id', requirePermission('FINANCE_WRITE'), validate(idParamSchema, 'params'), validate(updateSchema), audit({ action: AuditAction.UPDATE, entity }), controller.update);
  router.post('/:id/payment', requirePermission('FINANCE_WRITE'), validate(idParamSchema, 'params'), validate(paymentSchema), audit({ action: AuditAction.UPDATE, entity }), controller.pay);
  router.delete('/:id', requirePermission('FINANCE_DELETE'), validate(idParamSchema, 'params'), audit({ action: AuditAction.DELETE, entity }), controller.remove);
  return router;
};
export const billRoutes = routes(billsController, billSchema, billUpdateSchema, 'Bill');
export const rentRoutes = routes(rentController, rentSchema, rentUpdateSchema, 'Rent');
export const schoolFeeRoutes = routes(schoolFeesController, schoolFeeSchema, schoolFeeUpdateSchema, 'SchoolFee', ['SCHOOL_FEES']);
