import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendPasswordResetEmail } from '../utils/emailService';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cashbank-super-secret-jwt-key-2025';

// -------------------------------------------------------------
// GESTÃO DE USUÁRIOS (User Management)
// -------------------------------------------------------------

export async function getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 15));
    const search = ((req.query.search as string) || '').trim();
    const status = ((req.query.status as string) || 'all').toLowerCase();
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          lastLogin: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
          // LGPD PRIVACY BY DESIGN:
          // Strictly omit all transactions, amounts, accounts, cards and piggy banks
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Error in getUsers:', error);
    res.status(500).json({ message: 'Erro ao buscar lista de usuários' });
  }
}

export async function updateUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'pending'].includes(status)) {
      res.status(400).json({ message: 'Status inválido. Use "active", "suspended" ou "pending".' });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    if (req.userId === id && status === 'suspended') {
      res.status(400).json({ message: 'Você não pode suspender sua própria conta de administrador.' });
      return;
    }

    if (targetUser.email.toLowerCase() === 'hannowersousa@gmail.com' && status !== 'active') {
      res.status(400).json({ message: 'A conta do administrador principal não pode ser suspensa ou alterada para pendente.' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, email: true, role: true, status: true, lastLogin: true },
    });

    // Record Audit Log
    const currentAdmin = await prisma.user.findUnique({ where: { id: req.userId } });
    await prisma.auditLog.create({
      data: {
        adminId: req.userId || 'system',
        adminEmail: currentAdmin?.email || req.userEmail || 'admin',
        action: status === 'suspended' ? 'SUSPEND_USER' : status === 'active' ? 'ACTIVATE_USER' : 'SET_USER_PENDING',
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        details: `Status do usuário "${targetUser.name}" (${targetUser.email}) alterado de "${targetUser.status}" para "${status}"`,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      },
    }).catch(() => {});

    res.json({
      message: `Status do usuário atualizado com sucesso para "${status}"`,
      user: updated,
    });
  } catch (error) {
    console.error('Error in updateUserStatus:', error);
    res.status(500).json({ message: 'Erro ao atualizar status do usuário' });
  }
}

export async function updateUserRole(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      res.status(400).json({ message: 'Nível de acesso inválido. Use "user" ou "admin".' });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    if (targetUser.email.toLowerCase() === 'hannowersousa@gmail.com' && role === 'user') {
      res.status(400).json({ message: 'O administrador principal (hannowersousa@gmail.com) não pode ser rebaixado para usuário comum.' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    // Record Audit Log
    const currentAdmin = await prisma.user.findUnique({ where: { id: req.userId } });
    await prisma.auditLog.create({
      data: {
        adminId: req.userId || 'system',
        adminEmail: currentAdmin?.email || req.userEmail || 'admin',
        action: 'CHANGE_ROLE',
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        details: `Nível de acesso do usuário "${targetUser.name}" alterado de "${targetUser.role}" para "${role}"`,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      },
    }).catch(() => {});

    res.json({
      message: `Nível de acesso alterado com sucesso para "${role}"`,
      user: updated,
    });
  } catch (error) {
    console.error('Error in updateUserRole:', error);
    res.status(500).json({ message: 'Erro ao atualizar nível de acesso' });
  }
}

export async function adminResetPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const targetUser = await prisma.user.findUnique({ where: { id } });

    if (!targetUser) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    // Secret unique to this user and password state
    const secret = `${JWT_SECRET}:${targetUser.password}`;
    const token = jwt.sign(
      { userId: targetUser.id, email: targetUser.email, type: 'password_reset' },
      secret,
      { expiresIn: '1h' }
    );

    let frontendUrl = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000';
    frontendUrl = (frontendUrl as string).replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/?resetToken=${encodeURIComponent(token)}`;

    let emailSent = false;
    let emailReason = '';
    try {
      const emailResult = await sendPasswordResetEmail({
        to: targetUser.email,
        name: targetUser.name,
        resetUrl,
      });
      emailSent = emailResult.success;
      emailReason = emailResult.reason || '';
    } catch (e: any) {
      emailReason = e.message;
    }

    // Record Audit Log
    const currentAdmin = await prisma.user.findUnique({ where: { id: req.userId } });
    await prisma.auditLog.create({
      data: {
        adminId: req.userId || 'system',
        adminEmail: currentAdmin?.email || req.userEmail || 'admin',
        action: 'SEND_PASSWORD_RESET',
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        details: `Admin solicitou envio de link de redefinição de senha para ${targetUser.email}. Status envio: ${emailSent ? 'Sucesso' : 'Fallback gerado'}`,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      },
    }).catch(() => {});

    res.json({
      message: emailSent
        ? `Link de redefinição de senha enviado com sucesso para ${targetUser.email}`
        : `Link de redefinição gerado (envio de e-mail: ${emailReason || 'registrado em log'})`,
      resetUrl,
      emailSent,
    });
  } catch (error) {
    console.error('Error in adminResetPassword:', error);
    res.status(500).json({ message: 'Erro ao solicitar redefinição de senha' });
  }
}

export async function deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (req.userId === id) {
      res.status(400).json({ message: 'Você não pode excluir sua própria conta de administrador.' });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    if (targetUser.email.toLowerCase() === 'hannowersousa@gmail.com') {
      res.status(400).json({ message: 'A conta do administrador principal não pode ser excluída.' });
      return;
    }

    // LGPD DIREITO AO ESQUECIMENTO:
    // Deletes user and all related records cascaded by foreign keys
    await prisma.user.delete({ where: { id } });

    // Record Audit Log
    const currentAdmin = await prisma.user.findUnique({ where: { id: req.userId } });
    await prisma.auditLog.create({
      data: {
        adminId: req.userId || 'system',
        adminEmail: currentAdmin?.email || req.userEmail || 'admin',
        action: 'DELETE_USER',
        targetUserId: null,
        targetUserEmail: targetUser.email,
        details: `Conta e todos os dados associados de "${targetUser.name}" (${targetUser.email}) foram excluídos permanentemente em atendimento à LGPD (Direito ao Esquecimento).`,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      },
    }).catch(() => {});

    res.json({ message: `Usuário ${targetUser.email} e todos os seus dados foram excluídos com sucesso em conformidade com a LGPD.` });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({ message: 'Erro ao excluir usuário' });
  }
}

// -------------------------------------------------------------
// MÉTRICAS GLOBAIS E NEGÓCIO (Analytics Dashboard)
// -------------------------------------------------------------

export async function getAnalytics(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      pendingUsers,
      newUsersToday,
      newUsersThisMonth,
      dau,
      mau,
      totalPiggyBanks,
      totalCreditCards,
      totalFixedExpenses,
      totalVariableExpenses,
      totalRevenues,
      totalReceivables,
      totalFixedExpensesSum,
      totalVariableExpensesSum,
      totalRevenuesSum,
      totalSavingsSum,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { status: 'suspended' } }),
      prisma.user.count({ where: { status: 'pending' } }),
      prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: firstDayOfMonth } } }),
      prisma.user.count({ where: { lastLogin: { gte: oneDayAgo } } }),
      prisma.user.count({ where: { lastLogin: { gte: thirtyDaysAgo } } }),
      prisma.piggyBank.count(),
      prisma.creditCard.count(),
      prisma.fixedExpense.count(),
      prisma.variableExpense.count(),
      prisma.revenue.count(),
      prisma.receivable.count(),
      prisma.fixedExpense.aggregate({ _sum: { amount: true } }),
      prisma.variableExpense.aggregate({ _sum: { amount: true } }),
      prisma.revenue.aggregate({ _sum: { amount: true } }),
      prisma.savings.aggregate({ _sum: { amount: true } }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, createdAt: true, status: true, role: true },
      }),
    ]);

    // Monthly signups for the last 6 months
    const monthlySignups = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await prisma.user.count({
        where: {
          createdAt: {
            gte: d,
            lt: nextD,
          },
        },
      });
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      monthlySignups.push({
        month: `${monthNames[d.getMonth()]}/${d.getFullYear().toString().slice(-2)}`,
        count,
      });
    }

    // Total transaction records aggregate across platform
    const totalTransactionsCount =
      totalFixedExpenses +
      totalVariableExpenses +
      totalRevenues +
      totalReceivables;

    // Total volume aggregated (anonymized)
    const aggregatedPlatformVolume =
      (totalFixedExpensesSum._sum.amount || 0) +
      (totalVariableExpensesSum._sum.amount || 0) +
      (totalRevenuesSum._sum.amount || 0) +
      (totalSavingsSum._sum.amount || 0);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        pending: pendingUsers,
        newToday: newUsersToday,
        newThisMonth: newUsersThisMonth,
        dau,
        mau,
        recent: recentUsers,
        monthlySignups,
      },
      system: {
        totalTransactionsCount,
        aggregatedPlatformVolume,
        features: {
          piggyBanks: totalPiggyBanks,
          creditCards: totalCreditCards,
          fixedExpenses: totalFixedExpenses,
          variableExpenses: totalVariableExpenses,
          revenues: totalRevenues,
          receivables: totalReceivables,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in getAnalytics:', error);
    res.status(500).json({ message: 'Erro ao calcular métricas de analytics' });
  }
}

// -------------------------------------------------------------
// MONITORAMENTO TÉCNICO, AUDITORIA E SEGURANÇA (System Health)
// -------------------------------------------------------------

export async function getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const action = ((req.query.action as string) || '').trim();
    const search = ((req.query.search as string) || '').trim();

    const where: any = {};
    if (action) {
      where.action = action;
    }
    if (search) {
      where.OR = [
        { adminEmail: { contains: search, mode: 'insensitive' } },
        { targetUserEmail: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Error in getAuditLogs:', error);
    res.status(500).json({ message: 'Erro ao buscar trilha de auditoria' });
  }
}

export async function getSystemErrorLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const search = ((req.query.search as string) || '').trim();
    const statusCode = req.query.statusCode ? parseInt(req.query.statusCode as string, 10) : undefined;

    const where: any = {};
    if (statusCode) {
      where.statusCode = statusCode;
    }
    if (search) {
      where.OR = [
        { endpoint: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.systemErrorLog.count({ where }),
      prisma.systemErrorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Error in getSystemErrorLogs:', error);
    res.status(500).json({ message: 'Erro ao buscar logs de erro do sistema' });
  }
}

export async function clearSystemErrorLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const count = await prisma.systemErrorLog.count();
    await prisma.systemErrorLog.deleteMany();

    const currentAdmin = await prisma.user.findUnique({ where: { id: req.userId } });
    await prisma.auditLog.create({
      data: {
        adminId: req.userId || 'system',
        adminEmail: currentAdmin?.email || req.userEmail || 'admin',
        action: 'CLEAR_ERROR_LOGS',
        details: `Limpeza manual de ${count} registros de logs de erro do sistema`,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      },
    }).catch(() => {});

    res.json({ message: `Todos os ${count} logs de erro foram limpos com sucesso.` });
  } catch (error) {
    console.error('Error in clearSystemErrorLogs:', error);
    res.status(500).json({ message: 'Erro ao limpar logs de erro' });
  }
}

export async function getSecurityLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const status = ((req.query.status as string) || '').trim();
    const search = ((req.query.search as string) || '').trim();

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.securityLog.count({ where }),
      prisma.securityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Fast status summary
    const [successCount, failedCount, suspendedCount] = await Promise.all([
      prisma.securityLog.count({ where: { status: 'SUCCESS' } }),
      prisma.securityLog.count({ where: { status: { in: ['FAILED_PASSWORD', 'USER_NOT_FOUND', '2FA_FAILED'] } } }),
      prisma.securityLog.count({ where: { status: { in: ['SUSPENDED', 'BLOCKED', 'UNAUTHORIZED_ADMIN_ACCESS'] } } }),
    ]);

    res.json({
      logs,
      summary: {
        successCount,
        failedCount,
        suspendedCount,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Error in getSecurityLogs:', error);
    res.status(500).json({ message: 'Erro ao buscar logs de segurança' });
  }
}
