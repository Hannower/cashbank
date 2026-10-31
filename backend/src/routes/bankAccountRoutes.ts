import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import {
  handlePluggyWebhook,
  getBankAccountsStatus,
  getBankAccountsOverview,
  createConnectToken,
  syncBankAccounts,
  addLinkedItem,
  removeLinkedItem,
  registerPluggyWebhook,
  getPluggyWebhooks,
} from '../controllers/bankAccountController';

const router = Router();

// Public Webhook route for Pluggy Open Finance events (No auth required)
router.post('/webhook', handlePluggyWebhook);

// Protect all remaining Open Finance routes: Authentication required + Admin role RBAC check
router.use(authMiddleware as any);
router.use(adminMiddleware as any);

// Check configuration status of Pluggy / bank credentials in .env
router.get('/status', getBankAccountsStatus);

// Webhook management (Admin)
router.get('/webhooks', getPluggyWebhooks);
router.post('/webhooks/register', registerPluggyWebhook);

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
