import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getRevenues(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    let whereClause: any = { userId };

    if (month && year) {
      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      whereClause.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const revenues = await prisma.revenue.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
    });

    const totalAmount = revenues.reduce((acc, curr) => acc + curr.amount, 0);

    res.json({
      month,
      year,
      totalAmount,
      count: revenues.length,
      revenues,
    });
  } catch (error) {
    console.error('getRevenues error:', error);
    res.status(500).json({ message: 'Erro ao buscar receitas' });
  }
}

export async function createRevenue(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { description, amount, date, category } = req.body;

    if (!description || amount === undefined || !date || !category) {
      res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos' });
      return;
    }

    const revenue = await prisma.revenue.create({
      data: {
        userId,
        description,
        amount: parseFloat(amount),
        date: new Date(date),
        category,
      },
    });

    res.status(201).json(revenue);
  } catch (error) {
    console.error('createRevenue error:', error);
    res.status(500).json({ message: 'Erro ao registrar receita' });
  }
}

export async function updateRevenue(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { description, amount, date, category } = req.body;

    const existing = await prisma.revenue.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Receita não encontrada' });
      return;
    }

    const updated = await prisma.revenue.update({
      where: { id },
      data: {
        description: description ?? existing.description,
        amount: amount !== undefined ? parseFloat(amount) : existing.amount,
        date: date ? new Date(date) : existing.date,
        category: category ?? existing.category,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('updateRevenue error:', error);
    res.status(500).json({ message: 'Erro ao atualizar receita' });
  }
}

export async function deleteRevenue(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = await prisma.revenue.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Receita não encontrada' });
      return;
    }

    await prisma.revenue.delete({
      where: { id },
    });

    res.json({ message: 'Receita excluída com sucesso' });
  } catch (error) {
    console.error('deleteRevenue error:', error);
    res.status(500).json({ message: 'Erro ao excluir receita' });
  }
}
