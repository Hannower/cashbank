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

    const savings = await prisma.savings.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    const totalSaved = savings.reduce((acc, curr) => acc + curr.amount, 0);
    const savingsGoal = user?.savingsGoal || 2720.59;
    const progressPercentage = savingsGoal > 0 ? Math.min(Math.round((totalSaved / savingsGoal) * 100), 100) : 0;

    res.json({
      totalSaved,
      savingsGoal,
      progressPercentage,
      count: savings.length,
      savings,
    });
  } catch (error) {
    console.error('getSavings error:', error);
    res.status(500).json({ message: 'Erro ao buscar dados da poupança' });
  }
}

export async function createSavings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { description, amount, date, objective } = req.body;

    if (!description || amount === undefined || !date) {
      res.status(400).json({ message: 'Descrição, valor e data são obrigatórios' });
      return;
    }

    const item = await prisma.savings.create({
      data: {
        userId,
        description,
        amount: parseFloat(amount),
        date: new Date(date),
        objective: objective || 'Poupança',
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
    const { description, amount, date, objective } = req.body;

    const existing = await prisma.savings.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Registro de poupança não encontrado' });
      return;
    }

    const updated = await prisma.savings.update({
      where: { id },
      data: {
        description: description ?? existing.description,
        amount: amount !== undefined ? parseFloat(amount) : existing.amount,
        date: date ? new Date(date) : existing.date,
        objective: objective ?? existing.objective,
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
