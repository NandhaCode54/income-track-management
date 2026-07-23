import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes';
import { familyRoutes } from '../modules/family/family.routes';
import { incomeRoutes } from '../modules/income/income.routes';
import { expenseRoutes } from '../modules/expense/expense.routes';
import { budgetRoutes } from '../modules/budget/budget.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/families', familyRoutes);
router.use('/income', incomeRoutes);
router.use('/expenses', expenseRoutes);
router.use('/budgets', budgetRoutes);

export const apiRoutes = router;
