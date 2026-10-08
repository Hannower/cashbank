import { Router } from 'express';
import {
  getVariableExpenses,
  createVariableExpense,
  updateVariableExpense,
  deleteVariableExpense,
} from '../controllers/variableExpenseController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getVariableExpenses);
router.post('/', createVariableExpense);
router.put('/:id', updateVariableExpense);
router.delete('/:id', deleteVariableExpense);

export default router;
