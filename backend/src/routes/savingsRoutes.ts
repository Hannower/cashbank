import { Router } from 'express';
import {
  getSavings,
  createSavings,
  updateSavings,
  deleteSavings,
} from '../controllers/savingsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getSavings);
router.post('/', createSavings);
router.put('/:id', updateSavings);
router.delete('/:id', deleteSavings);

export default router;
