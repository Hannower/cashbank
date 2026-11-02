import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getBankAccounts,
  getBankTransactions,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  importOfxToAccount,
  deleteBankTransaction,
} from '../controllers/bankAccountController';

const router = Router();

// Authentication required for all bank account operations (accessible to all authenticated users)
router.use(authMiddleware as any);

// List accounts and consolidated summary
router.get('/', getBankAccounts);

// List transactions (extrato) with filters
router.get('/transactions', getBankTransactions);

// Delete single transaction
router.delete('/transactions/:id', deleteBankTransaction);

// Create account (OFX, CSV or PDF statement)
router.post('/', createBankAccount);

// Update account
router.put('/:id', updateBankAccount);

// Delete account
router.delete('/:id', deleteBankAccount);

// Import statement (OFX, CSV or PDF) to account
router.post('/:id/import-ofx', importOfxToAccount);

export default router;
