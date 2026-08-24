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

export const apiRoutes = router;
