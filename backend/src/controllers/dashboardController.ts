import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { isFixedExpenseActiveInMonth } from '../utils/expenseUtils';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const FULL_MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

export async function getDashboardOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const now = new Date();
    const currentMonth = req.query.month ? parseInt(req.query.month as string) : (now.getMonth() + 1);
    const currentYear = req.query.year ? parseInt(req.query.year as string) : now.getFullYear();

    // 1. User Profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, savingsGoal: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    // 2. Fixed Expenses for the specified month/year (filtered by active status)
    const allFixedExpenses = await prisma.fixedExpense.findMany({
      where: { userId },
      include: {
        payments: {
          where: { month: currentMonth, year: currentYear },
        },
      },
      orderBy: { dueDay: 'asc' },
    });

    const fixedExpenses = allFixedExpenses.filter((exp) =>
      isFixedExpenseActiveInMonth(exp.firstDueDate, exp.endDate, currentMonth, currentYear)
    );

    const fixedFormatted = fixedExpenses.map((exp) => {
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

    const fixedTotal = fixedFormatted.reduce((acc, curr) => acc + curr.amount, 0);
    const fixedPaidCount = fixedFormatted.filter((e) => e.isPaid).length;
    const fixedTotalCount = fixedFormatted.length;
    const fixedOrganizedPct = fixedTotalCount > 0 ? Math.round((fixedPaidCount / fixedTotalCount) * 100) : 0;

    // 3. Variable Expenses for the specified month/year
    const startOfMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));

    const variableExpenses = await prisma.variableExpense.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      orderBy: { date: 'desc' },
    });

    const variableTotal = variableExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpenses = fixedTotal + variableTotal;

    // 4. Revenues for the specified month/year
    const revenues = await prisma.revenue.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      orderBy: { date: 'desc' },
    });

    const totalRevenues = revenues.reduce((acc, curr) => acc + curr.amount, 0);

    // 5. Savings & Cofrinhos
    const [savingsItems, allPiggyBanks] = await Promise.all([
      prisma.savings.findMany({
        where: { userId },
        include: { piggyBank: true },
        orderBy: { date: 'desc' },
      }),
      prisma.piggyBank.findMany({
        where: { userId },
        select: { targetAmount: true },
      }),
    ]);

    const totalSavings = savingsItems.reduce((acc, curr) => acc + curr.amount, 0);
    const sumPiggyGoals = allPiggyBanks.reduce((acc, curr) => acc + (curr.targetAmount || 0), 0);
    const savingsGoal = sumPiggyGoals > 0 ? sumPiggyGoals : (user.savingsGoal || 0);
    const savingsPct = savingsGoal > 0 ? Math.min(Math.round((totalSavings / savingsGoal) * 100), 100) : 0;

    const monthSavings = savingsItems.filter((s) => {
      const d = new Date(s.date);
      return d >= startOfMonth && d <= endOfMonth;
    });

    // 6. Current Month Net Balance
    const saldoDisponivel = totalRevenues - totalExpenses;

    // 7. Previous month metrics for real growth calculation
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const startOfPrevMonth = new Date(Date.UTC(prevYear, prevMonth - 1, 1, 0, 0, 0, 0));
    const endOfPrevMonth = new Date(Date.UTC(prevYear, prevMonth, 0, 23, 59, 59, 999));

    const [prevRevenues, prevVariable] = await Promise.all([
      prisma.revenue.findMany({
        where: { userId, date: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
      }),
      prisma.variableExpense.findMany({
        where: { userId, date: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
      }),
    ]);

    const prevTotalRevenues = prevRevenues.reduce((acc, curr) => acc + curr.amount, 0);
    const prevTotalExpenses = fixedTotal + prevVariable.reduce((acc, curr) => acc + curr.amount, 0);
    const prevSaldo = prevTotalRevenues - prevTotalExpenses;

    const receitasGrowthPct =
      prevTotalRevenues > 0
        ? Math.round(((totalRevenues - prevTotalRevenues) / prevTotalRevenues) * 1000) / 10
        : 0;

    const saldoGrowthPct =
      prevSaldo > 0
        ? Math.round(((saldoDisponivel - prevSaldo) / prevSaldo) * 1000) / 10
        : 0;

    // 8. Upcoming Bills (pending fixed expenses with effective amounts)
    const upcomingBills = fixedFormatted
      .filter((e) => !e.isPaid)
      .map((e) => {
        const monthLabel = FULL_MONTH_NAMES[currentMonth - 1]?.slice(0, 3) || 'mês';
        return {
          id: e.id,
          description: e.description,
          category: e.category,
          amount: e.amount,
          hasCustomAmount: e.hasCustomAmount,
          dueDay: e.dueDay,
          dueDateFormatted: `Vence em ${e.dueDay} de ${monthLabel}.`,
          pixKey: e.pixKey,
          type: 'fixed',
        };
      });

    // 9. Unified Transactions (Histórico de transações: todas as entradas e saídas do mês)
    const transactions = [
      ...revenues.map((r) => {
        const d = new Date(r.date);
        const day = String(d.getUTCDate()).padStart(2, '0');
        const mLabel = FULL_MONTH_NAMES[d.getUTCMonth()]?.slice(0, 3) || '';
        return {
          id: `rev-${r.id}`,
          originalId: r.id,
          type: 'revenue' as const, // Entrada
          description: r.description,
          category: r.category,
          amount: r.amount,
          date: r.date,
          dateFormatted: `${day} de ${mLabel}.`,
          isPaid: true,
          status: 'received' as const,
          statusLabel: 'Recebido',
        };
      }),
      ...variableExpenses.map((v) => {
        const d = new Date(v.date);
        const day = String(d.getUTCDate()).padStart(2, '0');
        const mLabel = FULL_MONTH_NAMES[d.getUTCMonth()]?.slice(0, 3) || '';
        return {
          id: `var-${v.id}`,
          originalId: v.id,
          type: 'variable_expense' as const, // Saída variável
          description: v.description,
          category: v.category,
          amount: v.amount,
          pixKey: (v as any).pixKey || null,
          date: v.date,
          dateFormatted: `${day} de ${mLabel}.`,
          isPaid: true,
          status: 'paid' as const,
          statusLabel: 'Pago',
        };
      }),
      ...fixedFormatted
        .filter((f) => f.isPaid)
        .map((f) => {
          const dueDate = new Date(Date.UTC(currentYear, currentMonth - 1, Math.min(f.dueDay, 28), 12, 0, 0));
          const mLabel = FULL_MONTH_NAMES[currentMonth - 1]?.slice(0, 3) || '';
          const txDate = f.paidAt ? new Date(f.paidAt) : dueDate;
          const day = String(txDate.getUTCDate()).padStart(2, '0');
          return {
            id: `fix-${f.id}`,
            originalId: f.id,
            type: 'fixed_expense' as const, // Saída fixa efetuada
            description: f.description,
            category: f.category,
            amount: f.amount,
            hasCustomAmount: f.hasCustomAmount,
            dueDay: f.dueDay,
            pixKey: f.pixKey || null,
            date: txDate,
            dateFormatted: `${day} de ${mLabel}.`,
            isPaid: true,
            status: 'paid' as const,
            statusLabel: 'Pago',
          };
        }),
      ...monthSavings.map((s) => {
        const d = new Date(s.date);
        const day = String(d.getUTCDate()).padStart(2, '0');
        const mLabel = FULL_MONTH_NAMES[d.getUTCMonth()]?.slice(0, 3) || '';
        const isDeposit = s.amount >= 0;
        const piggyName = s.piggyBank?.name || s.objective || 'Cofrinho';
        return {
          id: `sav-${s.id}`,
          originalId: s.id,
          type: isDeposit ? ('savings_deposit' as const) : ('savings_withdraw' as const),
          description: s.description || (isDeposit ? `Depósito: ${piggyName}` : `Retirada: ${piggyName}`),
          category: piggyName,
          amount: Math.abs(s.amount),
          rawAmount: s.amount,
          date: s.date,
          dateFormatted: `${day} de ${mLabel}.`,
          isPaid: true,
          status: isDeposit ? ('saved' as const) : ('withdrawn' as const),
          statusLabel: isDeposit ? 'Guardado' : 'Retirado',
          piggyBank: s.piggyBank
            ? {
                id: s.piggyBank.id,
                name: s.piggyBank.name,
                color: s.piggyBank.color,
                icon: s.piggyBank.icon,
              }
            : null,
        };
      }),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 10. Recent Revenues (for backwards compatibility)
    const recentRevenues = revenues.slice(0, 5).map((r) => {
      const d = new Date(r.date);
      const day = String(d.getUTCDate()).padStart(2, '0');
      const mLabel = FULL_MONTH_NAMES[d.getUTCMonth()]?.slice(0, 3) || '';
      return {
        id: r.id,
        description: r.description,
        category: r.category,
        amount: r.amount,
        dateFormatted: `${r.category} • ${day} de ${mLabel}.`,
      };
    });

    // 11. 6-Month Chart Calculation (kept for optional analytics)
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      let targetMonth = currentMonth - i;
      let targetYear = currentYear;
      while (targetMonth <= 0) {
        targetMonth += 12;
        targetYear -= 1;
      }

      const mStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
      const mEnd = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

      const [mRevs, mVars] = await Promise.all([
        prisma.revenue.findMany({
          where: { userId, date: { gte: mStart, lte: mEnd } },
          select: { amount: true },
        }),
        prisma.variableExpense.findMany({
          where: { userId, date: { gte: mStart, lte: mEnd } },
          select: { amount: true },
        }),
      ]);

      const mTotalRev = mRevs.reduce((acc, c) => acc + c.amount, 0);
      const mTotalVar = mVars.reduce((acc, c) => acc + c.amount, 0);

      chartData.push({
        name: MONTH_NAMES[targetMonth - 1],
        month: targetMonth,
        year: targetYear,
        receitas: mTotalRev,
        despesas: (fixedTotal > 0 ? fixedTotal : 0) + mTotalVar,
      });
    }

    // 12. Monthly Expense Categories breakdown
    const categoryTotals: Record<string, number> = {};
    for (const exp of fixedFormatted) {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    }
    for (const v of variableExpenses) {
      categoryTotals[v.category] = (categoryTotals[v.category] || 0) + v.amount;
    }
    const categoriesList = Object.entries(categoryTotals)
      .map(([name, total]) => ({
        name,
        total,
        percentage: totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    res.json({
      user: {
        name: user.name,
        email: user.email,
        savingsGoal: user.savingsGoal,
        createdAt: user.createdAt,
      },
      currentMonth,
      currentYear,
      kpis: {
        saldoDisponivel,
        saldoGrowthPct,
        receitasTotais: totalRevenues,
        receitasGrowthPct,
        despesasTotais: totalExpenses,
        despesasSubtitle: 'Fixas e variáveis',
        naPoupanca: totalSavings,
        totalPoupancaAcumulada: totalSavings,
        poupancaGoalPct: savingsPct,
      },
      sidebarStatus: {
        organizedPercentage: fixedOrganizedPct,
        text:
          fixedTotalCount > 0
            ? `Você já organizou ${fixedOrganizedPct}% das despesas fixas.`
            : 'Cadastre suas despesas fixas para acompanhar a organização do mês.',
      },
      chartData,
      categories: categoriesList,
      upcomingBills,
      recentRevenues,
      transactions,
    });
  } catch (error) {
    console.error('getDashboardOverview error:', error);
    res.status(500).json({ message: 'Erro ao carregar dados da visão geral' });
  }
}

export async function getDashboardAnnual(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const startOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const [user, revenues, variableExpenses, fixedExpenses, savings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, createdAt: true },
      }),
      prisma.revenue.findMany({
        where: { userId, date: { gte: startOfYear, lte: endOfYear } },
        orderBy: { date: 'asc' },
      }),
      prisma.variableExpense.findMany({
        where: { userId, date: { gte: startOfYear, lte: endOfYear } },
        orderBy: { date: 'asc' },
      }),
      prisma.fixedExpense.findMany({
        where: { userId },
        include: {
          payments: {
            where: { year },
          },
        },
        orderBy: { dueDay: 'asc' },
      }),
      prisma.savings.findMany({
        where: { userId, date: { gte: startOfYear, lte: endOfYear } },
        orderBy: { date: 'asc' },
      }),
    ]);

    const MONTH_LABELS = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const SHORT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const categoryTotals: Record<string, number> = {};
    const monthsData = [];
    let totalAnnualRevenues = 0;
    let totalAnnualExpenses = 0;
    const totalAnnualSavings = savings.reduce((acc, curr) => acc + curr.amount, 0);

    for (let m = 1; m <= 12; m++) {
      // Month revenues
      const mRevs = revenues.filter((r) => {
        const d = new Date(r.date);
        return d.getUTCMonth() + 1 === m;
      });
      const monthRevTotal = mRevs.reduce((acc, curr) => acc + curr.amount, 0);

      // Month variable expenses
      const mVars = variableExpenses.filter((v) => {
        const d = new Date(v.date);
        return d.getUTCMonth() + 1 === m;
      });
      const monthVarTotal = mVars.reduce((acc, curr) => {
        categoryTotals[curr.category] = (categoryTotals[curr.category] || 0) + curr.amount;
        return acc + curr.amount;
      }, 0);

      // Month fixed expenses (only those active in month m of year)
      const mFixed = fixedExpenses.filter((f) =>
        isFixedExpenseActiveInMonth(f.firstDueDate, f.endDate, m, year)
      );
      const monthFixedTotal = mFixed.reduce((acc, curr) => {
        const payment = curr.payments.find((p) => p.month === m);
        const effectiveAmount =
          payment?.amount !== null && payment?.amount !== undefined ? payment.amount : curr.amount;
        categoryTotals[curr.category] = (categoryTotals[curr.category] || 0) + effectiveAmount;
        return acc + effectiveAmount;
      }, 0);

      const monthExpensesTotal = monthVarTotal + monthFixedTotal;
      const monthSaldo = monthRevTotal - monthExpensesTotal;

      totalAnnualRevenues += monthRevTotal;
      totalAnnualExpenses += monthExpensesTotal;

      monthsData.push({
        month: m,
        name: SHORT_MONTHS[m - 1],
        fullName: MONTH_LABELS[m - 1],
        receitas: monthRevTotal,
        despesas: monthExpensesTotal,
        saldo: monthSaldo,
        fixedCount: mFixed.length,
        varCount: mVars.length,
        revCount: mRevs.length,
      });
    }

    const saldoAnual = totalAnnualRevenues - totalAnnualExpenses;

    const categoriesList = Object.entries(categoryTotals)
      .map(([name, total]) => ({
        name,
        total,
        percentage: totalAnnualExpenses > 0 ? Math.round((total / totalAnnualExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    res.json({
      year,
      user: {
        name: user?.name,
        createdAt: user?.createdAt,
      },
      kpis: {
        totalAnnualRevenues,
        totalAnnualExpenses,
        saldoAnual,
        totalAnnualSavings,
      },
      months: monthsData,
      categories: categoriesList,
    });
  } catch (error) {
    console.error('getDashboardAnnual error:', error);
    res.status(500).json({ message: 'Erro ao carregar dados anuais' });
  }
}

