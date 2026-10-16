import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { prisma } from '../prisma/client';

export async function adminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ message: 'Token de autenticação não fornecido ou inválido' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      res.status(401).json({ message: 'Usuário não encontrado' });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({ message: 'Esta conta está suspensa. Entre em contato com o suporte.' });
      return;
    }

    if (user.role !== 'admin') {
      // Record security log for unauthorized attempt
      await prisma.securityLog.create({
        data: {
          email: user.email,
          ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || null,
          userAgent: req.headers['user-agent'] || null,
          status: 'UNAUTHORIZED_ADMIN_ACCESS',
          reason: `Tentativa de acesso ao endpoint restrito: ${req.method} ${req.originalUrl || req.url}`,
        },
      }).catch(() => {});

      res.status(403).json({ message: 'Acesso negado: privilégios de administrador necessários.' });
      return;
    }

    req.userRole = user.role;
    next();
  } catch (error) {
    console.error('Error in adminMiddleware:', error);
    res.status(500).json({ message: 'Erro ao validar privilégios de administrador' });
  }
}
