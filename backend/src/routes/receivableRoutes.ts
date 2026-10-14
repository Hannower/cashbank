import { Router } from 'express';
import {
  getReceivables,
  createReceivable,
  updateReceivable,
  deleteReceivable,
  toggleReceivableReceived,
  updateReceivableMonthAmount,
} from '../controllers/receivableController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getReceivables);
router.post('/', createReceivable);
router.put('/:id', updateReceivable);
router.delete('/:id', deleteReceivable);
router.patch('/:id/toggle-received', toggleReceivableReceived);
router.patch('/:id/adjustment', updateReceivableMonthAmount);

export default router;
