import { Router } from 'express';
import {
  getRevenues,
  createRevenue,
  updateRevenue,
  deleteRevenue,
} from '../controllers/revenueController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getRevenues);
router.post('/', createRevenue);
router.put('/:id', updateRevenue);
router.delete('/:id', deleteRevenue);

export default router;
