import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getSavings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { savingsGoal: true },
    });

    const [savings, piggyBanks] = await Promise.all([
      prisma.savings.findMany({
        where: { userId },
        include: {
          piggyBank: true,
        },
        orderBy: { date: 'desc' },
      }),
      prisma.piggyBank.findMany({
        where: { userId },
        include: {
          savings: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const formattedPiggyBanks = piggyBanks.map((pb) => {
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
      };
    });

    const totalSaved = savings.reduce((acc, curr) => acc + curr.amount, 0);
    // Goal can be sum of all piggy banks targetAmount, or fallback to user.savingsGoal
    const totalGoalsFromPiggy = formattedPiggyBanks.reduce((acc, curr) => acc + curr.targetAmount, 0);
    const savingsGoal = totalGoalsFromPiggy > 0 ? totalGoalsFromPiggy : (user?.savingsGoal || 2720.59);
    const progressPercentage = savingsGoal > 0 ? Math.min(Math.round((totalSaved / savingsGoal) * 100), 100) : 0;

    res.json({
      totalSaved,
      savingsGoal,
      progressPercentage,
      count: savings.length,
      savings,
      piggyBanks: formattedPiggyBanks,
    });
  } catch (error) {
    console.error('getSavings error:', error);
    res.status(500).json({ message: 'Erro ao buscar dados da poupança' });
  }
}

export async function createSavings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { description, amount, date, objective, piggyBankId } = req.body;

    if (!description || amount === undefined || !date) {
      res.status(400).json({ message: 'Descrição, valor e data são obrigatórios' });
      return;
    }

    let finalObjective = objective || 'Poupança';
    let validatedPiggyBankId: string | null = null;

    if (piggyBankId) {
      const piggyBank = await prisma.piggyBank.findFirst({
        where: { id: piggyBankId, userId },
        include: { savings: true },
      });

      if (piggyBank) {
        validatedPiggyBankId = piggyBank.id;
        finalObjective = piggyBank.name;

        // If withdrawing, check balance
        const parsedAmount = parseFloat(amount);
        if (parsedAmount < 0) {
          const currentBalance = piggyBank.savings.reduce((acc, curr) => acc + curr.amount, 0);
          if (Math.abs(parsedAmount) > currentBalance) {
            res.status(400).json({
              message: `Saldo insuficiente no cofrinho "${piggyBank.name}". Saldo disponível: R$ ${currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            });
            return;
          }
        }
      }
    }

    const item = await prisma.savings.create({
      data: {
        userId,
        piggyBankId: validatedPiggyBankId,
        description,
        amount: parseFloat(amount),
        date: new Date(date),
        objective: finalObjective,
      },
      include: {
        piggyBank: true,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('createSavings error:', error);
    res.status(500).json({ message: 'Erro ao adicionar valor à poupança' });
  }
}

export async function updateSavings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { description, amount, date, objective, piggyBankId } = req.body;

    const existing = await prisma.savings.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Registro de poupança não encontrado' });
      return;
    }

    let validatedPiggyBankId = existing.piggyBankId;
    let finalObjective = objective ?? existing.objective;

    if (piggyBankId !== undefined) {
      if (piggyBankId === null || piggyBankId === '') {
        validatedPiggyBankId = null;
      } else {
        const pb = await prisma.piggyBank.findFirst({
          where: { id: piggyBankId, userId },
        });
        if (pb) {
          validatedPiggyBankId = pb.id;
          finalObjective = pb.name;
        }
      }
    }

    const updated = await prisma.savings.update({
      where: { id },
      data: {
        piggyBankId: validatedPiggyBankId,
        description: description ?? existing.description,
        amount: amount !== undefined ? parseFloat(amount) : existing.amount,
        date: date ? new Date(date) : existing.date,
        objective: finalObjective,
      },
      include: {
        piggyBank: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('updateSavings error:', error);
    res.status(500).json({ message: 'Erro ao atualizar registro da poupança' });
  }
}

export async function deleteSavings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = await prisma.savings.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Registro de poupança não encontrado' });
      return;
    }

    await prisma.savings.delete({
      where: { id },
    });

    res.json({ message: 'Registro de poupança excluído com sucesso' });
  } catch (error) {
    console.error('deleteSavings error:', error);
    res.status(500).json({ message: 'Erro ao excluir registro de poupança' });
  }
}
