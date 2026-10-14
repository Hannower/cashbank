import { Router } from 'express';
import {
  getCreditCards,
  createCreditCard,
  updateCreditCard,
  deleteCreditCard,
  getInvoicesOverview,
  createCreditCardPurchase,
  updateCreditCardPurchase,
  deleteCreditCardPurchase,
  toggleInvoicePayment,
  updateInvoiceAdjustment,
} from '../controllers/creditCardController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Cards
router.get('/', getCreditCards);
router.post('/', createCreditCard);
router.put('/:id', updateCreditCard);
router.delete('/:id', deleteCreditCard);

// Invoices & Purchases
router.get('/invoices', getInvoicesOverview);
router.post('/purchases', createCreditCardPurchase);
router.put('/purchases/:id', updateCreditCardPurchase);
router.delete('/purchases/:id', deleteCreditCardPurchase);
router.patch('/:id/invoices/toggle-payment', toggleInvoicePayment);
router.patch('/:id/invoices/adjustment', updateInvoiceAdjustment);

export default router;
