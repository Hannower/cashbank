import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getVariableExpenses(req: AuthenticatedRequest, res: Response): Promise<void> {
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

    const expenses = await prisma.variableExpense.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
    });

    const totalAmount = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    res.json({
      month,
      year,
      totalAmount,
      count: expenses.length,
      expenses,
    });
  } catch (error) {
    console.error('getVariableExpenses error:', error);
    res.status(500).json({ message: 'Erro ao buscar despesas variáveis' });
  }
}

export async function createVariableExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { description, amount, date, category } = req.body;

    if (!description || amount === undefined || !date || !category) {
      res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos' });
      return;
    }

    const expense = await prisma.variableExpense.create({
      data: {
        userId,
        description,
        amount: parseFloat(amount),
        date: new Date(date),
        category,
      },
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('createVariableExpense error:', error);
    res.status(500).json({ message: 'Erro ao cadastrar despesa variável' });
  }
}

export async function updateVariableExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { description, amount, date, category } = req.body;

    const existing = await prisma.variableExpense.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Despesa variável não encontrada' });
      return;
    }

    const updated = await prisma.variableExpense.update({
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
    console.error('updateVariableExpense error:', error);
    res.status(500).json({ message: 'Erro ao atualizar despesa variável' });
  }
}

export async function deleteVariableExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = await prisma.variableExpense.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Despesa variável não encontrada' });
      return;
    }

    await prisma.variableExpense.delete({
      where: { id },
    });

    res.json({ message: 'Despesa variável excluída com sucesso' });
  } catch (error) {
    console.error('deleteVariableExpense error:', error);
    res.status(500).json({ message: 'Erro ao excluir despesa variável' });
  }
}
