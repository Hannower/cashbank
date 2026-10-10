import { Router } from 'express';
import {
  getFixedExpenses,
  createFixedExpense,
  updateFixedExpense,
  deleteFixedExpense,
  togglePaymentStatus,
  updateFixedExpenseMonthAmount,
  createFixedExpenseAdjustment,
  deleteFixedExpenseAdjustment,
} from '../controllers/fixedExpenseController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getFixedExpenses);
router.post('/', createFixedExpense);
router.put('/:id', updateFixedExpense);
router.delete('/:id', deleteFixedExpense);
router.patch('/:id/toggle-payment', togglePaymentStatus);
router.patch('/:id/month-amount', updateFixedExpenseMonthAmount);
router.post('/:id/adjustments', createFixedExpenseAdjustment);
router.delete('/:id/adjustments/:adjustmentId', deleteFixedExpenseAdjustment);

export default router;
