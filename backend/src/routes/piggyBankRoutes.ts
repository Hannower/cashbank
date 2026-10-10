import { Router } from 'express';
import {
  getPiggyBanks,
  createPiggyBank,
  updatePiggyBank,
  deletePiggyBank,
  depositPiggyBank,
  withdrawPiggyBank,
} from '../controllers/piggyBankController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getPiggyBanks);
router.post('/', createPiggyBank);
router.put('/:id', updatePiggyBank);
router.delete('/:id', deletePiggyBank);
router.post('/:id/deposit', depositPiggyBank);
router.post('/:id/withdraw', withdrawPiggyBank);

export default router;
