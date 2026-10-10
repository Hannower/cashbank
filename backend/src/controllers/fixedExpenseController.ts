import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  isFixedExpenseActiveInMonth,
  calculateEffectiveFixedExpense,
} from '../utils/expenseUtils';

export async function getFixedExpenses(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    // 1. Fetch all fixed expenses with payments and adjustments
    const allExpenses = await prisma.fixedExpense.findMany({
      where: { userId },
      include: {
        payments: true,
        adjustments: {
          orderBy: [
            { startYear: 'desc' },
            { startMonth: 'desc' },
          ],
        },
      },
      orderBy: { dueDay: 'asc' },
    });

    // 2. Fetch variable expenses for this user in the specified month
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const variableExpenses = await prisma.variableExpense.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { amount: true },
    });
    const monthVariableExpensesSum = variableExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    // 3. Filter expenses active in this specific month/year
    const expenses = allExpenses.filter((exp) =>
      isFixedExpenseActiveInMonth(exp.firstDueDate, exp.endDate, month, year)
    );

    // 4. Format list with calculated effective amount, adjustments, and variable status
    const formatted = expenses.map((exp) => {
      const payment = exp.payments.find((p) => p.month === month && p.year === year);
      const isPaid = payment ? payment.isPaid : false;

      const calc = calculateEffectiveFixedExpense(
        exp.amount,
        exp.isVariable,
        exp.adjustments,
        exp.payments,
        month,
        year
      );

      return {
        id: exp.id,
        description: exp.description,
        amount: calc.effectiveAmount,
        baseAmount: exp.amount,
        adjustedBaseAmount: calc.adjustedBaseAmount,
        hasCustomAmount: calc.hasCustomAmount,
        isEstimated: calc.isEstimated,
        hasAdjustment: calc.hasAdjustment,
        adjustmentDetails: calc.adjustmentDetails,
        adjustments: exp.adjustments.map((a) => ({
          id: a.id,
          startMonth: a.startMonth,
          startYear: a.startYear,
          amount: a.amount,
        })),
        dueDay: exp.dueDay,
        firstDueDate: exp.firstDueDate,
        endDate: exp.endDate,
        category: exp.category,
        pixKey: exp.pixKey,
        isVariable: exp.isVariable,
        variableType: exp.variableType,
        isPaid,
        paidAt: payment?.paidAt || null,
      };
    });

    // 5. Fetch Credit Card invoices for this month to include in Fixed Expenses
    const creditCards = await prisma.creditCard.findMany({
      where: { userId },
      include: {
        invoices: {
          where: { month, year },
        },
        installments: {
          where: { month, year },
        },
      },
      orderBy: { dueDay: 'asc' },
    });

    const creditCardExpenses = creditCards
      .filter((card) => card.installments.length > 0 || (card.invoices[0] && card.invoices[0].manualAdjustment !== null))
      .map((card) => {
        const invoice = card.invoices[0];
        const installmentsSum = card.installments.reduce((acc, curr) => acc + curr.amount, 0);
        const manualAdj = invoice?.manualAdjustment ?? 0;
        const totalAmount = Math.max(0, Math.round((installmentsSum + manualAdj) * 100) / 100);
        const isPaid = invoice ? invoice.isPaid : false;

        return {
          id: `card-invoice-${card.id}`,
          creditCardId: card.id,
          isCreditCard: true,
          description: `Fatura ${card.name}`,
          amount: totalAmount,
          baseAmount: totalAmount,
          adjustedBaseAmount: totalAmount,
          hasCustomAmount: invoice?.manualAdjustment !== null && invoice?.manualAdjustment !== undefined,
          isEstimated: false,
          hasAdjustment: false,
          adjustmentDetails: null,
          adjustments: [],
          dueDay: card.dueDay,
          firstDueDate: new Date(Date.UTC(year, month - 1, card.dueDay)),
          endDate: null,
          category: 'Cartão de Crédito',
          pixKey: null,
          isVariable: true,
          variableType: 'credit_card',
          isPaid,
          paidAt: invoice?.paidAt || null,
        };
      });

    const allFormattedExpenses = [...formatted, ...creditCardExpenses].sort((a, b) => a.dueDay - b.dueDay);

    const totalAmount = allFormattedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const pendingAmount = allFormattedExpenses
      .filter((exp) => !exp.isPaid)
      .reduce((acc, curr) => acc + curr.amount, 0);
    const paidCount = allFormattedExpenses.filter((exp) => exp.isPaid).length;
    const totalCount = allFormattedExpenses.length;

    res.json({
      month,
      year,
      monthVariableExpensesSum,
      summary: {
        totalAmount,
        pendingAmount,
        paidCount,
        totalCount,
      },
      expenses: allFormattedExpenses,
    });
  } catch (error) {
    console.error('getFixedExpenses error:', error);
    res.status(500).json({ message: 'Erro ao buscar despesas fixas' });
  }
}

export async function createFixedExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const {
      description,
      amount,
      firstDueDate,
      endDate,
      category,
      pixKey,
      isVariable,
      variableType,
    } = req.body;

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
        isVariable: Boolean(isVariable),
        variableType: variableType ? String(variableType) : null,
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
    const {
      description,
      amount,
      firstDueDate,
      endDate,
      category,
      pixKey,
      isVariable,
      variableType,
    } = req.body;

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
        isVariable: isVariable !== undefined ? Boolean(isVariable) : existing.isVariable,
        variableType: variableType !== undefined ? (variableType ? String(variableType) : null) : existing.variableType,
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

    if (id.startsWith('card-invoice-')) {
      res.status(400).json({ message: 'Faturas de cartão devem ser gerenciadas na tela de Cartões de Crédito.' });
      return;
    }

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

    if (id.startsWith('card-invoice-')) {
      const cardId = id.replace('card-invoice-', '');
      const parsedMonth = parseInt(month);
      const parsedYear = parseInt(year);
      const status = Boolean(isPaid);
      const invoice = await prisma.creditCardInvoice.upsert({
        where: {
          creditCardId_month_year: {
            creditCardId: cardId,
            month: parsedMonth,
            year: parsedYear,
          },
        },
        update: {
          isPaid: status,
          paidAt: status ? new Date() : null,
        },
        create: {
          creditCardId: cardId,
          userId,
          month: parsedMonth,
          year: parsedYear,
          isPaid: status,
          paidAt: status ? new Date() : null,
        },
      });
      res.json(invoice);
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
    const { month, year, amount, scope } = req.body;
    // scope: 'month' (default: este mês) | 'onward' (a partir deste mês em diante) | 'all' (valor padrão geral)

    if (!month || !year) {
      res.status(400).json({ message: 'Parâmetros month e year são obrigatórios' });
      return;
    }

    const parsedAmount =
      amount !== null && amount !== undefined && amount !== '' && !isNaN(parseFloat(String(amount).replace(',', '.')))
        ? parseFloat(String(amount).replace(',', '.'))
        : null;

    if (id.startsWith('card-invoice-')) {
      const cardId = id.replace('card-invoice-', '');
      const parsedMonth = parseInt(month);
      const parsedYear = parseInt(year);
      const invoice = await prisma.creditCardInvoice.upsert({
        where: {
          creditCardId_month_year: {
            creditCardId: cardId,
            month: parsedMonth,
            year: parsedYear,
          },
        },
        update: {
          manualAdjustment: parsedAmount,
        },
        create: {
          creditCardId: cardId,
          userId,
          month: parsedMonth,
          year: parsedYear,
          manualAdjustment: parsedAmount,
        },
      });
      res.json({ message: 'Fatura ajustada com sucesso', invoice });
      return;
    }

    const expense = await prisma.fixedExpense.findFirst({
      where: { id, userId },
    });

    if (!expense) {
      res.status(404).json({ message: 'Despesa fixa não encontrada' });
      return;
    }

    const targetMonth = parseInt(month);
    const targetYear = parseInt(year);

    if (scope === 'all') {
      // 1. Atualizar valor base original de todos os meses
      if (parsedAmount !== null) {
        await prisma.fixedExpense.update({
          where: { id },
          data: { amount: parsedAmount },
        });
      }
    } else if (scope === 'onward') {
      // 2. Reajuste permanente a partir deste mês/ano em diante (Netflix, Aluguel, etc.)
      if (parsedAmount !== null) {
        await prisma.fixedExpenseAdjustment.upsert({
          where: {
            fixedExpenseId_startYear_startMonth: {
              fixedExpenseId: id,
              startYear: targetYear,
              startMonth: targetMonth,
            },
          },
          update: { amount: parsedAmount },
          create: {
            fixedExpenseId: id,
            startYear: targetYear,
            startMonth: targetMonth,
            amount: parsedAmount,
          },
        });

        // Limpa o override pontual deste mês para seguir suavemente o reajuste
        await prisma.fixedExpensePayment.upsert({
          where: {
            fixedExpenseId_month_year: {
              fixedExpenseId: id,
              month: targetMonth,
              year: targetYear,
            },
          },
          update: { amount: null },
          create: {
            fixedExpenseId: id,
            userId,
            month: targetMonth,
            year: targetYear,
            isPaid: false,
            amount: null,
          },
        });
      } else {
        // Se resetar reajuste:
        await prisma.fixedExpenseAdjustment.deleteMany({
          where: {
            fixedExpenseId: id,
            startYear: targetYear,
            startMonth: targetMonth,
          },
        });
      }
    } else {
      // 3. Default: 'month' - Ajuste específico pontual para este mês
      await prisma.fixedExpensePayment.upsert({
        where: {
          fixedExpenseId_month_year: {
            fixedExpenseId: id,
            month: targetMonth,
            year: targetYear,
          },
        },
        update: {
          amount: parsedAmount,
        },
        create: {
          fixedExpenseId: id,
          userId,
          month: targetMonth,
          year: targetYear,
          isPaid: false,
          amount: parsedAmount,
        },
      });
    }

    res.json({
      message: 'Valor atualizado com sucesso',
      scope: scope || 'month',
      effectiveAmount: parsedAmount !== null ? parsedAmount : expense.amount,
      hasCustomAmount: parsedAmount !== null && scope === 'month',
    });
  } catch (error) {
    console.error('updateFixedExpenseMonthAmount error:', error);
    res.status(500).json({ message: 'Erro ao atualizar valor da despesa fixa' });
  }
}

export async function createFixedExpenseAdjustment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { startMonth, startYear, amount } = req.body;

    if (!startMonth || !startYear || amount === undefined) {
      res.status(400).json({ message: 'Parâmetros startMonth, startYear e amount são obrigatórios' });
      return;
    }

    const expense = await prisma.fixedExpense.findFirst({
      where: { id, userId },
    });

    if (!expense) {
      res.status(404).json({ message: 'Despesa fixa não encontrada' });
      return;
    }

    const parsedAmount = parseFloat(String(amount).replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      res.status(400).json({ message: 'Valor inválido' });
      return;
    }

    const adjustment = await prisma.fixedExpenseAdjustment.upsert({
      where: {
        fixedExpenseId_startYear_startMonth: {
          fixedExpenseId: id,
          startYear: parseInt(startYear),
          startMonth: parseInt(startMonth),
        },
      },
      update: { amount: parsedAmount },
      create: {
        fixedExpenseId: id,
        startYear: parseInt(startYear),
        startMonth: parseInt(startMonth),
        amount: parsedAmount,
      },
    });

    res.status(201).json(adjustment);
  } catch (error) {
    console.error('createFixedExpenseAdjustment error:', error);
    res.status(500).json({ message: 'Erro ao criar reajuste' });
  }
}

export async function deleteFixedExpenseAdjustment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id, adjustmentId } = req.params;

    const expense = await prisma.fixedExpense.findFirst({
      where: { id, userId },
    });

    if (!expense) {
      res.status(404).json({ message: 'Despesa fixa não encontrada' });
      return;
    }

    await prisma.fixedExpenseAdjustment.delete({
      where: { id: adjustmentId },
    });

    res.json({ message: 'Reajuste excluído com sucesso' });
  } catch (error) {
    console.error('deleteFixedExpenseAdjustment error:', error);
    res.status(500).json({ message: 'Erro ao excluir reajuste' });
  }
}
