import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendPasswordResetEmail } from '../utils/emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'cashbank-super-secret-jwt-key-2025';

function generateToken(userId: string, email: string) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'E-mail e senha são obrigatórios' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      res.status(401).json({ message: 'E-mail ou senha inválidos' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'E-mail ou senha inválidos' });
      return;
    }

    const token = generateToken(user.id, user.email);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        savingsGoal: user.savingsGoal,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Erro interno ao realizar login' });
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

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        savingsGoal: 0.0,
      },
    });

    const token = generateToken(user.id, user.email);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        savingsGoal: user.savingsGoal,
        createdAt: user.createdAt,
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
        savingsGoal: true,
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

    const origin = req.headers.origin || 'http://localhost:3000';
    const resetUrl = `${origin}/?resetToken=${encodeURIComponent(token)}`;

    // Send email to user's registered inbox
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });

    res.json({
      message: 'Link de recuperação de senha enviado para o seu e-mail com sucesso!',
      email: user.email,
      expiresIn: '1 hora',
    });
  } catch (error) {
    console.error('forgotPassword error:', error);
    res.status(500).json({ message: 'Erro ao enviar link de recuperação de senha' });
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
