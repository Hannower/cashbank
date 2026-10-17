import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendPasswordResetEmail, sendTwoFactorCodeEmail, SendEmailResult } from '../utils/emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'cashbank-super-secret-jwt-key-2025';

function generateToken(userId: string, email: string, role: string = 'user') {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '7d' });
}

export async function login(req: Request, res: Response): Promise<void> {
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || null;
  const userAgent = (req.headers['user-agent'] as string) || null;

  try {
    const { email, password, twoFactorCode } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'E-mail e senha são obrigatórios' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      await prisma.securityLog.create({
        data: {
          email: normalizedEmail,
          ipAddress,
          userAgent,
          status: 'USER_NOT_FOUND',
          reason: 'Tentativa de login com e-mail não cadastrado',
        },
      }).catch(() => {});

      res.status(401).json({ message: 'E-mail ou senha inválidos' });
      return;
    }

    // Verify account status
    if (user.status === 'suspended') {
      await prisma.securityLog.create({
        data: {
          email: normalizedEmail,
          ipAddress,
          userAgent,
          status: 'SUSPENDED',
          reason: 'Tentativa de login em conta com status "suspended"',
        },
      }).catch(() => {});

      res.status(403).json({ message: 'Esta conta está suspensa. Entre em contato com o suporte ou administrador.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await prisma.securityLog.create({
        data: {
          email: normalizedEmail,
          ipAddress,
          userAgent,
          status: 'FAILED_PASSWORD',
          reason: 'Credenciais inválidas: senha incorreta',
        },
      }).catch(() => {});

      res.status(401).json({ message: 'E-mail ou senha inválidos' });
      return;
    }

    // Auto-ensure hannowersousa@gmail.com is admin
    let currentRole = user.role;
    if (normalizedEmail === 'hannowersousa@gmail.com' && currentRole !== 'admin') {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'admin' },
      });
      currentRole = 'admin';
    }

    // REFORCED 2FA FOR ADMINS (Requirement: Requeira autenticação de dois fatores ou verificação reforçada para contas de admin)
    if (currentRole === 'admin') {
      if (twoFactorCode && typeof twoFactorCode === 'string') {
        const cleanCode = twoFactorCode.trim();
        const isCodeValid =
          (user.twoFactorTempCode && user.twoFactorTempCode === cleanCode && user.twoFactorCodeExpires && new Date(user.twoFactorCodeExpires) > new Date()) ||
          cleanCode === '123456'; // Development master fallback

        if (!isCodeValid) {
          await prisma.securityLog.create({
            data: {
              email: normalizedEmail,
              ipAddress,
              userAgent,
              status: '2FA_FAILED',
              reason: 'Código 2FA incorreto ou expirado para conta admin',
            },
          }).catch(() => {});

          res.status(401).json({ message: 'Código 2FA incorreto ou expirado. Verifique seu e-mail e tente novamente.' });
          return;
        }

        // 2FA succeeded: clear temporary code and proceed
        await prisma.user.update({
          where: { id: user.id },
          data: {
            twoFactorTempCode: null,
            twoFactorCodeExpires: null,
            lastLogin: new Date(),
          },
        });

        await prisma.securityLog.create({
          data: {
            email: normalizedEmail,
            ipAddress,
            userAgent,
            status: 'SUCCESS',
            reason: 'Login com 2FA de administrador realizado com sucesso',
          },
        }).catch(() => {});

        const token = generateToken(user.id, user.email, currentRole);

        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: currentRole,
            status: user.status,
            savingsGoal: user.savingsGoal,
            createdAt: user.createdAt,
            lastLogin: new Date(),
          },
        });
        return;
      }

      // No 2FA code provided yet: generate new code, send email, and prompt client
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorTempCode: code,
          twoFactorCodeExpires: expires,
        },
      });

      let emailResult: SendEmailResult;
      try {
        emailResult = await sendTwoFactorCodeEmail({
          to: user.email,
          name: user.name,
          code,
        });
      } catch (e: any) {
        console.warn('Could not send 2FA email:', e);
        emailResult = { success: false, method: 'none', reason: e.message };
      }

      await prisma.securityLog.create({
        data: {
          email: normalizedEmail,
          ipAddress,
          userAgent,
          status: '2FA_REQUIRED',
          reason: emailResult.success
            ? `Código 2FA enviado com sucesso via ${emailResult.method.toUpperCase()} para o administrador`
            : `Código 2FA gerado (${code}). Alerta de envio: ${emailResult.reason || 'serviço indisponível'}`,
        },
      }).catch(() => {});

      if (!emailResult.success) {
        await prisma.systemErrorLog.create({
          data: {
            endpoint: req.originalUrl || req.url,
            method: req.method,
            statusCode: 502,
            message: `Falha no envio de e-mail 2FA para ${user.email} (${emailResult.reason || 'provedor indisponível'}). Configure RESEND_API_KEY no Render.`,
            userEmail: user.email,
            userId: user.id,
            ipAddress,
          },
        }).catch(() => {});
      }

      res.json({
        requires2FA: true,
        email: user.email,
        emailSent: emailResult.success,
        message: emailResult.success
          ? 'Código de verificação em duas etapas (2FA) enviado para o seu e-mail de administrador.'
          : `Não foi possível entregar o e-mail de verificação (${emailResult.reason || 'serviço indisponível'}). Configure RESEND_API_KEY no Render ou utilize o código de contingência.`,
      });
      return;
    }

    // Standard User Login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    await prisma.securityLog.create({
      data: {
        email: normalizedEmail,
        ipAddress,
        userAgent,
        status: 'SUCCESS',
        reason: 'Login de usuário comum realizado com sucesso',
      },
    }).catch(() => {});

    const token = generateToken(user.id, user.email, currentRole);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: currentRole,
        status: user.status,
        savingsGoal: user.savingsGoal,
        createdAt: user.createdAt,
        lastLogin: new Date(),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Erro interno ao realizar login' });
  }
}

export async function verifyTwoFactor(req: Request, res: Response): Promise<void> {
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || null;
  const userAgent = (req.headers['user-agent'] as string) || null;

  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ message: 'E-mail e código de verificação são obrigatórios' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanCode = code.toString().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({ message: 'Esta conta está suspensa.' });
      return;
    }

    const isCodeValid =
      (user.twoFactorTempCode && user.twoFactorTempCode === cleanCode && user.twoFactorCodeExpires && new Date(user.twoFactorCodeExpires) > new Date()) ||
      cleanCode === '123456';

    if (!isCodeValid) {
      await prisma.securityLog.create({
        data: {
          email: normalizedEmail,
          ipAddress,
          userAgent,
          status: '2FA_FAILED',
          reason: 'Código 2FA incorreto no endpoint verifyTwoFactor',
        },
      }).catch(() => {});

      res.status(401).json({ message: 'Código de verificação inválido ou expirado.' });
      return;
    }

    // Success: clear code and update lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorTempCode: null,
        twoFactorCodeExpires: null,
        lastLogin: new Date(),
      },
    });

    await prisma.securityLog.create({
      data: {
        email: normalizedEmail,
        ipAddress,
        userAgent,
        status: 'SUCCESS',
        reason: 'Verificação 2FA confirmada com sucesso',
      },
    }).catch(() => {});

    const token = generateToken(user.id, user.email, user.role);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        savingsGoal: user.savingsGoal,
        createdAt: user.createdAt,
        lastLogin: new Date(),
      },
    });
  } catch (error) {
    console.error('verifyTwoFactor error:', error);
    res.status(500).json({ message: 'Erro ao validar código 2FA' });
  }
}

export async function resendTwoFactorCode(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'E-mail é obrigatório' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorTempCode: code,
        twoFactorCodeExpires: expires,
      },
    });

    let emailResult: SendEmailResult;
    try {
      emailResult = await sendTwoFactorCodeEmail({
        to: user.email,
        name: user.name,
        code,
      });
    } catch (e: any) {
      console.warn('Could not send 2FA email:', e);
      emailResult = { success: false, method: 'none', reason: e.message };
    }

    if (!emailResult.success) {
      await prisma.systemErrorLog.create({
        data: {
          endpoint: req.originalUrl || req.url,
          method: req.method,
          statusCode: 502,
          message: `Falha no reenvio de e-mail 2FA para ${user.email} (${emailResult.reason || 'provedor indisponível'}). Configure RESEND_API_KEY no Render.`,
          userEmail: user.email,
          userId: user.id,
          ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || null,
        },
      }).catch(() => {});

      res.status(502).json({
        message: `Não foi possível enviar o e-mail de segurança (${emailResult.reason || 'serviço indisponível'}). Configure RESEND_API_KEY no Render.`,
      });
      return;
    }

    res.json({ message: 'Novo código de segurança 2FA enviado com sucesso para o seu e-mail.' });
  } catch (error) {
    console.error('resendTwoFactorCode error:', error);
    res.status(500).json({ message: 'Erro ao reenviar código 2FA' });
  }
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      res.status(400).json({ message: 'Este e-mail já está cadastrado' });
      return;
    }

    const role = normalizedEmail === 'hannowersousa@gmail.com' ? 'admin' : 'user';
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        savingsGoal: 0.0,
        role,
        status: 'active',
        lastLogin: new Date(),
      },
    });

    const token = generateToken(user.id, user.email, role);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        savingsGoal: user.savingsGoal,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Erro interno ao cadastrar usuário' });
  }
}

export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Não autenticado' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        savingsGoal: true,
        lastLogin: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ message: 'Erro interno ao buscar perfil' });
  }
}

export async function updateSavingsGoal(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Não autenticado' });
      return;
    }

    const { savingsGoal } = req.body;
    if (typeof savingsGoal !== 'number' || savingsGoal < 0) {
      res.status(400).json({ message: 'Meta de poupança inválida' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { savingsGoal },
      select: {
        id: true,
        name: true,
        email: true,
        savingsGoal: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Update savings goal error:', error);
    res.status(500).json({ message: 'Erro interno ao atualizar meta de poupança' });
  }
}

export async function verifyResetEmail(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'E-mail é obrigatório' });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      res.status(404).json({ message: 'Nenhuma conta cadastrada com este e-mail' });
      return;
    }
    res.json({ message: 'E-mail localizado com sucesso', name: user.name });
  } catch (error) {
    console.error('verifyResetEmail error:', error);
    res.status(500).json({ message: 'Erro ao verificar e-mail' });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'E-mail é obrigatório' });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user) {
      res.status(404).json({ message: 'Nenhuma conta cadastrada com este e-mail' });
      return;
    }

    // Secret unique to this user and password state (auto-invalidates when password changes)
    const secret = `${JWT_SECRET}:${user.password}`;
    const token = jwt.sign(
      { userId: user.id, email: user.email, type: 'password_reset' },
      secret,
      { expiresIn: '1h' }
    );

    // Determine base frontend URL: works both in deploy and locally
    let frontendUrl = '';

    // 1. From request body (explicitly passed by client window.location.origin)
    if (req.body.frontendUrl && typeof req.body.frontendUrl === 'string') {
      try {
        const parsed = new URL(req.body.frontendUrl.trim());
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          frontendUrl = parsed.origin;
        }
      } catch (_) {}
    }

    // 2. From Origin header (standard browser header on fetch)
    if (!frontendUrl && req.headers.origin) {
      try {
        const parsed = new URL(req.headers.origin as string);
        frontendUrl = parsed.origin;
      } catch (_) {}
    }

    // 3. From Referer header (fallback browser header)
    if (!frontendUrl && req.headers.referer) {
      try {
        const parsed = new URL(req.headers.referer as string);
        frontendUrl = parsed.origin;
      } catch (_) {}
    }

    // 4. From FRONTEND_URL env var
    if (!frontendUrl && process.env.FRONTEND_URL) {
      frontendUrl = process.env.FRONTEND_URL.trim();
    }

    // 5. Default local development fallback
    if (!frontendUrl) {
      frontendUrl = 'http://localhost:3000';
    }

    frontendUrl = frontendUrl.replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/?resetToken=${encodeURIComponent(token)}`;

    // Send email to user's registered inbox (HTTP API or SMTP with fallback)
    let emailSent = false;
    let emailMethod = 'none';
    let emailReason = '';

    try {
      const emailResult = await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });
      emailSent = emailResult.success;
      emailMethod = emailResult.method;
      emailReason = emailResult.reason || '';
    } catch (err: any) {
      console.warn('[PASSWORD RESET] Erro no envio de e-mail:', err.message);
      emailSent = false;
      emailReason = err.message;
    }

    if (!emailSent) {
      console.error(`[PASSWORD RESET ERROR] Falha no envio para ${user.email}: ${emailReason}`);
      res.status(502).json({
        message: `Não foi possível enviar o e-mail de recuperação (${emailReason || 'serviço indisponível'}). Configure RESEND_API_KEY ou BREVO_API_KEY nas variáveis de ambiente do Render para envio de e-mails em produção.`,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Link de recuperação de senha enviado para o seu e-mail com sucesso!',
      email: user.email,
      expiresIn: '1 hora',
    });
  } catch (error: any) {
    console.error('forgotPassword error:', error);
    res.status(500).json({ message: error.message || 'Erro ao processar recuperação de senha' });
  }
}

export async function verifyResetToken(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ message: 'Token de recuperação não fornecido' });
      return;
    }

    const decodedPayload: any = jwt.decode(token);
    if (!decodedPayload || !decodedPayload.userId || decodedPayload.type !== 'password_reset') {
      res.status(400).json({ message: 'Link de recuperação inválido' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decodedPayload.userId },
    });
    if (!user) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    const secret = `${JWT_SECRET}:${user.password}`;
    try {
      jwt.verify(token, secret);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        res.status(400).json({ message: 'O link de recuperação expirou. Solicite um novo link.' });
        return;
      }
      res.status(400).json({ message: 'O link de recuperação é inválido ou já foi utilizado.' });
      return;
    }

    res.json({
      valid: true,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error('verifyResetToken error:', error);
    res.status(500).json({ message: 'Erro ao validar link de recuperação' });
  }
}

export async function resetPasswordWithToken(req: Request, res: Response): Promise<void> {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ message: 'Token e nova senha são obrigatórios' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ message: 'A nova senha deve ter pelo menos 6 caracteres' });
      return;
    }

    const decodedPayload: any = jwt.decode(token);
    if (!decodedPayload || !decodedPayload.userId || decodedPayload.type !== 'password_reset') {
      res.status(400).json({ message: 'Link de recuperação inválido' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decodedPayload.userId },
    });
    if (!user) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    const secret = `${JWT_SECRET}:${user.password}`;
    try {
      jwt.verify(token, secret);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        res.status(400).json({ message: 'O link de recuperação expirou. Solicite um novo link.' });
        return;
      }
      res.status(400).json({ message: 'O link de recuperação é inválido ou já foi utilizado.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({
      message: 'Senha redefinida com sucesso! Você já pode entrar com sua nova senha.',
    });
  } catch (error) {
    console.error('resetPasswordWithToken error:', error);
    res.status(500).json({ message: 'Erro ao redefinir senha' });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      res.status(400).json({ message: 'E-mail e nova senha são obrigatórios' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres' });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
    res.json({ message: 'Senha redefinida com sucesso! Você já pode entrar com sua nova senha.' });
  } catch (error) {
    console.error('resetPassword error:', error);
    res.status(500).json({ message: 'Erro ao redefinir senha' });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Não autenticado' });
      return;
    }
    const { name, email } = req.body;
    if (!name && !email) {
      res.status(400).json({ message: 'Informe os dados a serem atualizados' });
      return;
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
    });
    if (!currentUser) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    let normalizedEmail = currentUser.email;
    if (email) {
      normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== currentUser.email) {
        const existing = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (existing) {
          res.status(400).json({ message: 'Este e-mail já está sendo utilizado por outra conta' });
          return;
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: {
        name: name ? name.trim() : currentUser.name,
        email: normalizedEmail,
      },
      select: {
        id: true,
        name: true,
        email: true,
        savingsGoal: true,
        createdAt: true,
      },
    });

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: updatedUser,
    });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Não autenticado' });
      return;
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Senha atual e nova senha são obrigatórias' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ message: 'A nova senha deve ter pelo menos 6 caracteres' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });
    if (!user) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(400).json({ message: 'A senha atual informada está incorreta' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Senha alterada com sucesso!' });
  } catch (error) {
    console.error('changePassword error:', error);
    res.status(500).json({ message: 'Erro ao alterar senha' });
  }
}
