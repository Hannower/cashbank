import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { isFixedExpenseActiveInMonth } from '../utils/expenseUtils';

export async function getFixedExpenses(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const allExpenses = await prisma.fixedExpense.findMany({
      where: { userId },
      include: {
        payments: {
          where: { month, year },
        },
      },
      orderBy: { dueDay: 'asc' },
    });

    // Filter expenses active in this specific month/year:
    // If endDate is set, retire the expense starting from the following month.
    // If endDate is not set, keep it active every month after firstDueDate.
    const expenses = allExpenses.filter((exp) =>
      isFixedExpenseActiveInMonth(exp.firstDueDate, exp.endDate, month, year)
    );

    // Format list with payment status and custom monthly amount override
    const formatted = expenses.map((exp) => {
      const payment = exp.payments[0];
      const isPaid = payment ? payment.isPaid : false;
      const hasCustomAmount = payment?.amount !== null && payment?.amount !== undefined;
      const effectiveAmount = hasCustomAmount ? payment!.amount! : exp.amount;

      return {
        id: exp.id,
        description: exp.description,
        amount: effectiveAmount,
        baseAmount: exp.amount,
        hasCustomAmount,
        dueDay: exp.dueDay,
        firstDueDate: exp.firstDueDate,
        endDate: exp.endDate,
        category: exp.category,
        pixKey: exp.pixKey,
        isPaid,
        paidAt: payment?.paidAt || null,
      };
    });

    const totalAmount = formatted.reduce((acc, curr) => acc + curr.amount, 0);
    const pendingAmount = formatted
      .filter((exp) => !exp.isPaid)
      .reduce((acc, curr) => acc + curr.amount, 0);
    const paidCount = formatted.filter((exp) => exp.isPaid).length;
    const totalCount = formatted.length;

    res.json({
      month,
      year,
      summary: {
        totalAmount,
        pendingAmount,
        paidCount,
        totalCount,
      },
      expenses: formatted,
    });
  } catch (error) {
    console.error('getFixedExpenses error:', error);
    res.status(500).json({ message: 'Erro ao buscar despesas fixas' });
  }
}

export async function createFixedExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { description, amount, firstDueDate, endDate, category, pixKey } = req.body;

    if (!description || amount === undefined || !firstDueDate || !category) {
      res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos' });
      return;
    }

    const firstDate = new Date(firstDueDate);
    const dueDay = firstDate.getUTCDate() || firstDate.getDate();

    const expense = await prisma.fixedExpense.create({
      data: {
        userId,
        description,
        amount: parseFloat(amount),
        dueDay,
        firstDueDate: firstDate,
        endDate: endDate ? new Date(endDate) : null,
        category,
        pixKey: pixKey ? String(pixKey).trim() : null,
      },
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('createFixedExpense error:', error);
    res.status(500).json({ message: 'Erro ao criar despesa fixa' });
  }
}

export async function updateFixedExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { description, amount, firstDueDate, endDate, category, pixKey } = req.body;

    const existing = await prisma.fixedExpense.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Despesa fixa não encontrada' });
      return;
    }

    let dueDay = existing.dueDay;
    let firstDate = existing.firstDueDate;

    if (firstDueDate) {
      firstDate = new Date(firstDueDate);
      dueDay = firstDate.getUTCDate() || firstDate.getDate();
    }

    const updated = await prisma.fixedExpense.update({
      where: { id },
      data: {
        description: description ?? existing.description,
        amount: amount !== undefined ? parseFloat(amount) : existing.amount,
        firstDueDate: firstDate,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : existing.endDate,
        category: category ?? existing.category,
        dueDay,
        pixKey: pixKey !== undefined ? (pixKey ? String(pixKey).trim() : null) : existing.pixKey,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('updateFixedExpense error:', error);
    res.status(500).json({ message: 'Erro ao atualizar despesa fixa' });
  }
}

export async function deleteFixedExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = await prisma.fixedExpense.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Despesa fixa não encontrada' });
      return;
    }

    await prisma.fixedExpense.delete({
      where: { id },
    });

    res.json({ message: 'Despesa fixa removida com sucesso' });
  } catch (error) {
    console.error('deleteFixedExpense error:', error);
    res.status(500).json({ message: 'Erro ao excluir despesa fixa' });
  }
}

export async function togglePaymentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { month, year, isPaid } = req.body;

    if (!month || !year || isPaid === undefined) {
      res.status(400).json({ message: 'Parâmetros month, year e isPaid são obrigatórios' });
      return;
    }

    const expense = await prisma.fixedExpense.findFirst({
      where: { id, userId },
    });

    if (!expense) {
      res.status(404).json({ message: 'Despesa fixa não encontrada' });
      return;
    }

    const payment = await prisma.fixedExpensePayment.upsert({
      where: {
        fixedExpenseId_month_year: {
          fixedExpenseId: id,
          month: parseInt(month),
          year: parseInt(year),
        },
      },
      update: {
        isPaid: Boolean(isPaid),
        paidAt: isPaid ? new Date() : null,
      },
      create: {
        fixedExpenseId: id,
        userId,
        month: parseInt(month),
        year: parseInt(year),
        isPaid: Boolean(isPaid),
        paidAt: isPaid ? new Date() : null,
      },
    });

    res.json(payment);
  } catch (error) {
    console.error('togglePaymentStatus error:', error);
    res.status(500).json({ message: 'Erro ao atualizar status de pagamento' });
  }
}

export async function updateFixedExpenseMonthAmount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { month, year, amount } = req.body;

    if (!month || !year) {
      res.status(400).json({ message: 'Parâmetros month e year são obrigatórios' });
      return;
    }

    const expense = await prisma.fixedExpense.findFirst({
      where: { id, userId },
    });

    if (!expense) {
      res.status(404).json({ message: 'Despesa fixa não encontrada' });
      return;
    }

    const parsedAmount =
      amount !== null && amount !== undefined && amount !== '' && !isNaN(parseFloat(String(amount).replace(',', '.')))
        ? parseFloat(String(amount).replace(',', '.'))
        : null;

    const payment = await prisma.fixedExpensePayment.upsert({
      where: {
        fixedExpenseId_month_year: {
          fixedExpenseId: id,
          month: parseInt(month),
          year: parseInt(year),
        },
      },
      update: {
        amount: parsedAmount,
      },
      create: {
        fixedExpenseId: id,
        userId,
        month: parseInt(month),
        year: parseInt(year),
        isPaid: false,
        amount: parsedAmount,
      },
    });

    res.json({
      message: 'Valor do mês atualizado com sucesso',
      payment,
      effectiveAmount: parsedAmount !== null ? parsedAmount : expense.amount,
      hasCustomAmount: parsedAmount !== null,
    });
  } catch (error) {
    console.error('updateFixedExpenseMonthAmount error:', error);
    res.status(500).json({ message: 'Erro ao atualizar valor da despesa fixa no mês' });
  }
}

