import { Router } from 'express';
import { getDashboardOverview, getDashboardAnnual } from '../controllers/dashboardController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/overview', getDashboardOverview);
router.get('/annual', getDashboardAnnual);

export default router;

