import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import {
  getBankAccountsStatus,
  getBankAccountsOverview,
  createConnectToken,
  syncBankAccounts,
  addLinkedItem,
  removeLinkedItem,
} from '../controllers/bankAccountController';

const router = Router();

// Protect all Open Finance routes: Authentication required + Admin role RBAC check
router.use(authMiddleware as any);
router.use(adminMiddleware as any);

// Check configuration status of Pluggy / bank credentials in .env
router.get('/status', getBankAccountsStatus);

// Get balances, institutions and transactions
router.get('/overview', getBankAccountsOverview);

// Link and unlink Item IDs
router.post('/items', addLinkedItem);
router.delete('/items/:id', removeLinkedItem);

// Generate connect token for Pluggy Connect widget
router.post('/connect-token', createConnectToken);

// Trigger sync
router.post('/sync', syncBankAccounts);

export default router;
