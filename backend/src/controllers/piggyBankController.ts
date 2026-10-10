import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getPiggyBanks(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const piggyBanks = await prisma.piggyBank.findMany({
      where: { userId },
      include: {
        savings: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formatted = piggyBanks.map((pb) => {
      const currentAmount = pb.savings.reduce((acc, curr) => acc + curr.amount, 0);
      const target = pb.targetAmount || 0;
      const progressPercentage = target > 0 ? Math.min(Math.round((currentAmount / target) * 100), 100) : 0;
      const remainingAmount = Math.max(0, target - currentAmount);

      return {
        id: pb.id,
        name: pb.name,
        targetAmount: pb.targetAmount,
        targetDate: pb.targetDate,
        category: pb.category,
        color: pb.color,
        icon: pb.icon,
        description: pb.description,
        createdAt: pb.createdAt,
        updatedAt: pb.updatedAt,
        currentAmount,
        progressPercentage,
        remainingAmount,
        transactionsCount: pb.savings.length,
        recentTransactions: pb.savings.slice(0, 5),
      };
    });

    const totalSaved = formatted.reduce((acc, curr) => acc + curr.currentAmount, 0);
    const totalGoal = formatted.reduce((acc, curr) => acc + (curr.targetAmount || 0), 0);
    const overallProgress = totalGoal > 0 ? Math.min(Math.round((totalSaved / totalGoal) * 100), 100) : 0;

    res.json({
      piggyBanks: formatted,
      totalSaved,
      totalGoal,
      overallProgress,
      count: formatted.length,
    });
  } catch (error) {
    console.error('getPiggyBanks error:', error);
    res.status(500).json({ message: 'Erro ao buscar cofrinhos' });
  }
}

export async function createPiggyBank(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const {
      name,
      targetAmount,
      targetDate,
      category,
      color,
      icon,
      description,
      initialDeposit,
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'O nome do cofrinho é obrigatório' });
      return;
    }

    const targetVal = targetAmount !== undefined ? Math.abs(parseFloat(String(targetAmount).replace(',', '.'))) : 0;
    const initialVal = initialDeposit !== undefined ? Math.abs(parseFloat(String(initialDeposit).replace(',', '.'))) : 0;

    const piggyBank = await prisma.piggyBank.create({
      data: {
        userId,
        name: name.trim(),
        targetAmount: isNaN(targetVal) ? 0 : targetVal,
        targetDate: targetDate ? new Date(targetDate) : null,
        category: category || 'general',
        color: color || '#15803d',
        icon: icon || 'piggy',
        description: description?.trim() || null,
      },
    });

    // If an initial deposit was requested, create the transaction automatically
    if (!isNaN(initialVal) && initialVal > 0) {
      await prisma.savings.create({
        data: {
          userId,
          piggyBankId: piggyBank.id,
          description: 'Depósito inicial',
          amount: initialVal,
          date: new Date(),
          objective: piggyBank.name,
        },
      });
    }

    // Return the newly created piggy bank with calculated amounts
    res.status(201).json({
      ...piggyBank,
      currentAmount: initialVal,
      progressPercentage: targetVal > 0 ? Math.min(Math.round((initialVal / targetVal) * 100), 100) : 0,
      remainingAmount: Math.max(0, targetVal - initialVal),
      transactionsCount: initialVal > 0 ? 1 : 0,
    });
  } catch (error) {
    console.error('createPiggyBank error:', error);
    res.status(500).json({ message: 'Erro ao criar cofrinho' });
  }
}

export async function updatePiggyBank(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const {
      name,
      targetAmount,
      targetDate,
      category,
      color,
      icon,
      description,
    } = req.body;

    const existing = await prisma.piggyBank.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Cofrinho não encontrado' });
      return;
    }

    const targetVal = targetAmount !== undefined ? Math.abs(parseFloat(String(targetAmount).replace(',', '.'))) : existing.targetAmount;

    const updated = await prisma.piggyBank.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        targetAmount: isNaN(targetVal) ? existing.targetAmount : targetVal,
        targetDate: targetDate !== undefined ? (targetDate ? new Date(targetDate) : null) : existing.targetDate,
        category: category ?? existing.category,
        color: color ?? existing.color,
        icon: icon ?? existing.icon,
        description: description !== undefined ? (description?.trim() || null) : existing.description,
      },
      include: {
        savings: true,
      },
    });

    const currentAmount = updated.savings.reduce((acc, curr) => acc + curr.amount, 0);
    const progressPercentage = updated.targetAmount > 0 ? Math.min(Math.round((currentAmount / updated.targetAmount) * 100), 100) : 0;

    res.json({
      ...updated,
      currentAmount,
      progressPercentage,
      remainingAmount: Math.max(0, updated.targetAmount - currentAmount),
      transactionsCount: updated.savings.length,
    });
  } catch (error) {
    console.error('updatePiggyBank error:', error);
    res.status(500).json({ message: 'Erro ao atualizar cofrinho' });
  }
}

export async function deletePiggyBank(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = await prisma.piggyBank.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Cofrinho não encontrado' });
      return;
    }

    await prisma.piggyBank.delete({
      where: { id },
    });

    res.json({ message: 'Cofrinho excluído com sucesso' });
  } catch (error) {
    console.error('deletePiggyBank error:', error);
    res.status(500).json({ message: 'Erro ao excluir cofrinho' });
  }
}

export async function depositPiggyBank(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { amount, date, description } = req.body;

    const piggyBank = await prisma.piggyBank.findFirst({
      where: { id, userId },
    });

    if (!piggyBank) {
      res.status(404).json({ message: 'Cofrinho não encontrado' });
      return;
    }

    const parsedVal = Math.abs(parseFloat(String(amount).replace(',', '.')));
    if (isNaN(parsedVal) || parsedVal <= 0) {
      res.status(400).json({ message: 'Informe um valor válido para depósito' });
      return;
    }

    const txDate = date ? new Date(date) : new Date();
    const txDesc = description?.trim() || `Depósito: ${piggyBank.name}`;

    const item = await prisma.savings.create({
      data: {
        userId,
        piggyBankId: piggyBank.id,
        description: txDesc,
        amount: parsedVal,
        date: txDate,
        objective: piggyBank.name,
      },
      include: {
        piggyBank: true,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('depositPiggyBank error:', error);
    res.status(500).json({ message: 'Erro ao depositar no cofrinho' });
  }
}

export async function withdrawPiggyBank(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { amount, date, description } = req.body;

    const piggyBank = await prisma.piggyBank.findFirst({
      where: { id, userId },
      include: {
        savings: true,
      },
    });

    if (!piggyBank) {
      res.status(404).json({ message: 'Cofrinho não encontrado' });
      return;
    }

    const parsedVal = Math.abs(parseFloat(String(amount).replace(',', '.')));
    if (isNaN(parsedVal) || parsedVal <= 0) {
      res.status(400).json({ message: 'Informe um valor válido para retirada' });
      return;
    }

    const currentBalance = piggyBank.savings.reduce((acc, curr) => acc + curr.amount, 0);
    if (parsedVal > currentBalance) {
      res.status(400).json({
        message: `Saldo insuficiente neste cofrinho. Saldo disponível: R$ ${currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      });
      return;
    }

    const txDate = date ? new Date(date) : new Date();
    const txDesc = description?.trim() || `Retirada: ${piggyBank.name}`;

    const item = await prisma.savings.create({
      data: {
        userId,
        piggyBankId: piggyBank.id,
        description: txDesc,
        amount: -parsedVal,
        date: txDate,
        objective: piggyBank.name,
      },
      include: {
        piggyBank: true,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('withdrawPiggyBank error:', error);
    res.status(500).json({ message: 'Erro ao retirar do cofrinho' });
  }
}
