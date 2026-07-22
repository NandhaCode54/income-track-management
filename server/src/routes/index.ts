import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes';
import { familyRoutes } from '../modules/family/family.routes';
import { incomeRoutes } from '../modules/income/income.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/families', familyRoutes);
router.use('/income', incomeRoutes);

export const apiRoutes = router;
