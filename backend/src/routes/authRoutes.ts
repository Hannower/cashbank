import { Router } from 'express';
import {
  login,
  register,
  me,
  updateSavingsGoal,
  verifyResetEmail,
  resetPassword,
  updateProfile,
  changePassword,
  forgotPassword,
  verifyResetToken,
  resetPasswordWithToken,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/verify-reset-email', verifyResetEmail);
router.post('/reset-password', resetPassword);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-token', verifyResetToken);
router.post('/reset-password-with-token', resetPasswordWithToken);

router.get('/me', authMiddleware, me);
router.patch('/savings-goal', authMiddleware, updateSavingsGoal);
router.put('/profile', authMiddleware, updateProfile);
router.put('/change-password', authMiddleware, changePassword);

export default router;
