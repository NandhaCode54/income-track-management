import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes';
import { familyRoutes } from '../modules/family/family.routes';
import { incomeRoutes } from '../modules/income/income.routes';
import { expenseRoutes } from '../modules/expense/expense.routes';
import { budgetRoutes } from '../modules/budget/budget.routes';
import { dashboardRoutes } from '../modules/dashboard/dashboard.routes';
import { emiRoutes } from '../modules/emi/emi.routes';
import { billRoutes, rentRoutes, schoolFeeRoutes } from '../modules/payments/payments.routes';
import { goalsRoutes } from '../modules/goals/goals.routes';
import {
  assetRoutes,
  investmentRoutes,
  liabilityRoutes,
  portfolioRoutes,
} from '../modules/portfolio/portfolio.routes';
import { chitFundRoutes } from '../modules/chit-fund/chit-fund.routes';
import { notificationRoutes } from '../modules/notifications/notification.routes';
import { reportRoutes } from '../modules/reports/reports.routes';
import { insightRoutes } from '../modules/insights/insights.routes';
import { adminRoutes } from '../modules/admin/admin.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/families', familyRoutes);
router.use('/income', incomeRoutes);
router.use('/expenses', expenseRoutes);
router.use('/budgets', budgetRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/emi', emiRoutes);
router.use('/bills', billRoutes);
router.use('/rent', rentRoutes);
router.use('/school-fees', schoolFeeRoutes);
router.use('/goals', goalsRoutes);
router.use('/chit-funds', chitFundRoutes);

// The portfolio ledgers mount at their own resources (the plan's API surface);
// only the cross-ledger net-worth figure gets a namespace of its own.
router.use('/investments', investmentRoutes);
router.use('/assets', assetRoutes);
router.use('/liabilities', liabilityRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/insights', insightRoutes);
router.use('/admin', adminRoutes);

export const apiRoutes = router;
