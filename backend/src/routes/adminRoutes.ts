import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import {
  getUsers,
  updateUserStatus,
  updateUserRole,
  adminResetPassword,
  deleteUser,
  getAnalytics,
  getAuditLogs,
  getSystemErrorLogs,
  clearSystemErrorLogs,
  getSecurityLogs,
} from '../controllers/adminController';

const router = Router();

// Protect all admin routes with authentication + admin RBAC check
router.use(authMiddleware as any);
router.use(adminMiddleware as any);

// Gestão de Usuários
router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/users/:id/role', updateUserRole);
router.post('/users/:id/reset-password', adminResetPassword);
router.delete('/users/:id', deleteUser);

// Métricas Globais e Negócio
router.get('/analytics', getAnalytics);

// Monitoramento Técnico, Logs e Auditoria
router.get('/audit-logs', getAuditLogs);
router.get('/error-logs', getSystemErrorLogs);
router.post('/error-logs/clear', clearSystemErrorLogs);
router.get('/security-logs', getSecurityLogs);

export default router;
