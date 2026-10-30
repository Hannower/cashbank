import { prisma } from '../prisma/client';
import { isFixedExpenseActiveInMonth, calculateEffectiveFixedExpense } from '../utils/expenseUtils';

export interface UserFinancialContext {
  userName: string;
  currentMonth: number;
  currentYear: number;
  monthName: string;
  currentAccountBalance: number;
  projectedMonthEndBalance: number;
  totalRevenuesMonth: number;
  totalExpensesMonth: number;
  totalPaidExpensesMonth: number;
  totalPendingExpensesMonth: number;
  totalSavingsInPiggyBanks: number;
  savingsGoal: number;
  fixedExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    dueDay: number;
    category: string;
    isPaid: boolean;
  }>;
  recentVariableExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    category: string;
  }>;
  piggyBanks: Array<{
    id: string;
    name: string;
    currentAmount: number;
    targetAmount: number;
    targetDate: string | null;
    category: string;
  }>;
  creditCardInvoices: Array<{
    cardName: string;
    dueDay: number;
    totalAmount: number;
    isPaid: boolean;
  }>;
  futureCreditCardInvoices: Array<{
    month: number;
    year: number;
    monthName: string;
    cards: Array<{
      cardName: string;
      totalAmount: number;
      installmentsCount: number;
      items: string[];
    }>;
  }>;
  receivables: Array<{
    id: string;
    description: string;
    amount: number;
    payer: string;
    dueDate: string;
    status: string;
  }>;
}

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

export async function getUserFinancialContext(userId: string): Promise<UserFinancialContext> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // 1. User Profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, savingsGoal: true },
  });

  const userName = user?.name || 'Usuário';
  const savingsGoal = user?.savingsGoal || 0;

  // 2. Fixed Expenses for current month
  const allFixed = await prisma.fixedExpense.findMany({
    where: { userId },
    include: {
      payments: { where: { month: currentMonth, year: currentYear } },
      adjustments: { orderBy: [{ startYear: 'desc' }, { startMonth: 'desc' }] },
    },
    orderBy: { dueDay: 'asc' },
  });

  const activeFixed = allFixed.filter((exp) =>
    isFixedExpenseActiveInMonth(exp.firstDueDate, exp.endDate, currentMonth, currentYear)
  );

  const fixedList = activeFixed.map((exp) => {
    const payment = exp.payments[0];
    const isPaid = payment ? payment.isPaid : false;
    const calc = calculateEffectiveFixedExpense(
      exp.amount,
      exp.isVariable,
      exp.adjustments,
      exp.payments,
      currentMonth,
      currentYear
    );
    return {
      id: exp.id,
      description: exp.description,
      amount: calc.effectiveAmount,
      dueDay: exp.dueDay,
      category: exp.category,
      isPaid,
    };
  });

  // 3. Variable Expenses for current month
  const startDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));

  const variableExpenses = await prisma.variableExpense.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'desc' },
    take: 30,
  });

  const recentVarList = variableExpenses.map((exp) => ({
    id: exp.id,
    description: exp.description,
    amount: exp.amount,
    date: exp.date.toISOString().split('T')[0],
    category: exp.category,
  }));

  const totalVariableMonth = variableExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  // 4. Revenues for current month
  const revenues = await prisma.revenue.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
  });
  const totalRevenuesMonth = revenues.reduce((acc, curr) => acc + curr.amount, 0);

  // 5. Credit Cards for current month AND future 6 months
  const allUserCards = await prisma.creditCard.findMany({
    where: { userId },
    include: {
      invoices: true,
      installments: {
        include: { purchase: true },
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
      },
    },
  });

  // Current month invoices
  const cardInvoicesList = allUserCards.map((card) => {
    const invoice = card.invoices.find((i) => i.month === currentMonth && i.year === currentYear);
    const monthInst = card.installments.filter((i) => i.month === currentMonth && i.year === currentYear);
    const totalInst = monthInst.reduce((acc, curr) => acc + curr.amount, 0);
    const manualAdj = invoice?.manualAdjustment ?? 0;
    const totalAmount = Math.max(0, Math.round((totalInst + manualAdj) * 100) / 100);
    const isPaid = invoice ? invoice.isPaid : false;

    return {
      cardName: card.name,
      dueDay: card.dueDay,
      totalAmount,
      isPaid,
    };
  });

  // Future 6 months projections
  const futureCreditCardInvoices: UserFinancialContext['futureCreditCardInvoices'] = [];
  for (let offset = 1; offset <= 6; offset++) {
    let fMonth = currentMonth + offset;
    let fYear = currentYear;
    while (fMonth > 12) {
      fMonth -= 12;
      fYear += 1;
    }

    const cardsForFutureMonth = allUserCards.map((card) => {
      const invoice = card.invoices.find((i) => i.month === fMonth && i.year === fYear);
      const monthInst = card.installments.filter((i) => i.month === fMonth && i.year === fYear);
      const totalInst = monthInst.reduce((acc, curr) => acc + curr.amount, 0);
      const manualAdj = invoice?.manualAdjustment ?? 0;
      const totalAmount = Math.max(0, Math.round((totalInst + manualAdj) * 100) / 100);

      const items = monthInst.map(
        (i) => `${i.purchase?.description || 'Compra'}: R$ ${i.amount.toFixed(2)} (${i.installmentNumber}/${i.totalInstallments})`
      );

      return {
        cardName: card.name,
        totalAmount,
        installmentsCount: monthInst.length,
        items,
      };
    }).filter((c) => c.totalAmount > 0 || c.installmentsCount > 0);

    if (cardsForFutureMonth.length > 0) {
      futureCreditCardInvoices.push({
        month: fMonth,
        year: fYear,
        monthName: MONTH_NAMES[fMonth - 1],
        cards: cardsForFutureMonth,
      });
    }
  }

  // 6. Piggy Banks / Poupança
  const piggyBanks = await prisma.piggyBank.findMany({
    where: { userId },
    include: { savings: true },
    orderBy: { name: 'asc' },
  });

  const piggyList = piggyBanks.map((p) => {
    const currentAmount = p.savings.reduce((acc, s) => acc + s.amount, 0);
    return {
      id: p.id,
      name: p.name,
      currentAmount,
      targetAmount: p.targetAmount,
      targetDate: p.targetDate ? p.targetDate.toISOString().split('T')[0] : null,
      category: p.category,
    };
  });

  const totalSavingsInPiggyBanks = piggyList.reduce((acc, curr) => acc + curr.currentAmount, 0);

  // 7. Receivables
  const receivables = await prisma.receivable.findMany({
    where: { userId },
    orderBy: { dueDate: 'asc' },
    take: 15,
  });

  const receivablesList = receivables.map((r) => ({
    id: r.id,
    description: r.description,
    amount: r.amount,
    payer: r.payer || 'Não informado',
    dueDate: r.dueDate.toISOString().split('T')[0],
    status: r.isReceived ? 'RECEBIDO' : 'PENDENTE',
  }));

  // 8. Financial aggregates
  const paidFixedTotal = fixedList.filter((f) => f.isPaid).reduce((acc, curr) => acc + curr.amount, 0);
  const pendingFixedTotal = fixedList.filter((f) => !f.isPaid).reduce((acc, curr) => acc + curr.amount, 0);

  const paidCardsTotal = cardInvoicesList.filter((c) => c.isPaid).reduce((acc, curr) => acc + curr.totalAmount, 0);
  const pendingCardsTotal = cardInvoicesList.filter((c) => !c.isPaid).reduce((acc, curr) => acc + curr.totalAmount, 0);

  const totalExpensesMonth = (paidFixedTotal + pendingFixedTotal) + (paidCardsTotal + pendingCardsTotal) + totalVariableMonth;
  const totalPaidExpensesMonth = paidFixedTotal + paidCardsTotal + totalVariableMonth;
  const totalPendingExpensesMonth = pendingFixedTotal + pendingCardsTotal;

  const currentAccountBalance = totalRevenuesMonth - totalPaidExpensesMonth;
  const projectedMonthEndBalance = currentAccountBalance - totalPendingExpensesMonth;

  return {
    userName,
    currentMonth,
    currentYear,
    monthName: MONTH_NAMES[currentMonth - 1],
    currentAccountBalance,
    projectedMonthEndBalance,
    totalRevenuesMonth,
    totalExpensesMonth,
    totalPaidExpensesMonth,
    totalPendingExpensesMonth,
    totalSavingsInPiggyBanks,
    savingsGoal,
    fixedExpenses: fixedList,
    recentVariableExpenses: recentVarList,
    piggyBanks: piggyList,
    creditCardInvoices: cardInvoicesList,
    futureCreditCardInvoices,
    receivables: receivablesList,
  };
}

export function formatFinancialContextAsRAGText(ctx: UserFinancialContext): string {
  const formatBRL = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return `
[DADOS FINANCEIROS REAIS DO USUÁRIO - CASHBANK]
Mês Corrente de Referência: ${ctx.monthName} de ${ctx.currentYear}
Nome do Usuário: ${ctx.userName}

=== SALDOS E FLUXO DE CAIXA DESTE MÊS ATUAL (${ctx.monthName.toUpperCase()}/${ctx.currentYear}) ===
- Saldo Atual Realizado em Conta: ${formatBRL(ctx.currentAccountBalance)}
- Saldo Projetado (após pagar todas as contas pendentes do mês): ${formatBRL(ctx.projectedMonthEndBalance)}
- Renda / Receitas Totais no Mês: ${formatBRL(ctx.totalRevenuesMonth)}
- Despesas Totais do Mês: ${formatBRL(ctx.totalExpensesMonth)}
  * Despesas Já Pagas / Realizadas: ${formatBRL(ctx.totalPaidExpensesMonth)}
  * Despesas Pendentes a Pagar: ${formatBRL(ctx.totalPendingExpensesMonth)}
- Saldo Total Guardado em Cofrinhos / Poupança: ${formatBRL(ctx.totalSavingsInPiggyBanks)}
- Meta Global de Poupança: ${ctx.savingsGoal > 0 ? formatBRL(ctx.savingsGoal) : 'Não definida'}

=== FATURAS DE CARTÃO DE CRÉDITO DO MÊS ATUAL (${ctx.monthName.toUpperCase()}/${ctx.currentYear}) ===
${
  ctx.creditCardInvoices.length === 0
    ? 'Nenhum cartão cadastrado.'
    : ctx.creditCardInvoices
        .map(
          (c) =>
            `- Fatura ${c.cardName}: ${formatBRL(c.totalAmount)} (Vence dia ${c.dueDay}, Status: ${c.isPaid ? 'PAGO' : 'PENDENTE'})`
        )
        .join('\n')
}

=== PROJEÇÕES DE FATURAS DE CARTÃO PARA MESES FUTUROS (PARCELAS JÁ CONTRATADAS) ===
${
  ctx.futureCreditCardInvoices.length === 0
    ? 'Nenhuma fatura com parcelas futuras agendadas.'
    : ctx.futureCreditCardInvoices
        .map((fMonth) => {
          const cardsStr = fMonth.cards
            .map(
              (c) =>
                `  * Fatura ${c.cardName}: ${formatBRL(c.totalAmount)} (${c.installmentsCount} parcelas/itens)\n    Itens:\n${c.items.map((it) => `      - ${it}`).join('\n')}`
            )
            .join('\n');
          return `Mês: ${fMonth.monthName} de ${fMonth.year} (${fMonth.month}/${fMonth.year}):\n${cardsStr}`;
        })
        .join('\n\n')
}

=== CONTAS A PAGAR (DESPESAS FIXAS RECORRENTES) ===
${
  ctx.fixedExpenses.length === 0
    ? 'Nenhuma despesa fixa ativa neste mês.'
    : ctx.fixedExpenses
        .map(
          (f) =>
            `- [${f.isPaid ? 'PAGO' : 'PENDENTE'}] ${f.description}: ${formatBRL(f.amount)} (Vence dia ${f.dueDay}, Categoria: ${f.category}, ID: ${f.id})`
        )
        .join('\n')
}

=== ÚLTIMOS GASTOS DO DIA A DIA (DESPESAS VARIÁVEIS) ===
${
  ctx.recentVariableExpenses.length === 0
    ? 'Nenhum gasto variável registrado recentemente neste mês.'
    : ctx.recentVariableExpenses
        .map((v) => `- ${v.date}: ${v.description} - ${formatBRL(v.amount)} (${v.category})`)
        .join('\n')
}

=== COFRINHOS E METAS FINANCEIRAS (POUPANÇA) ===
${
  ctx.piggyBanks.length === 0
    ? 'Nenhum cofrinho criado.'
    : ctx.piggyBanks
        .map((p) => {
          const pct = p.targetAmount > 0 ? Math.round((p.currentAmount / p.targetAmount) * 100) : 100;
          return `- Cofrinho "${p.name}": Saldo ${formatBRL(p.currentAmount)} de ${p.targetAmount > 0 ? formatBRL(p.targetAmount) : 'Meta livre'} (${pct}% atingido)${p.targetDate ? `, Prazo: ${p.targetDate}` : ''}`;
        })
        .join('\n')
}

=== CONTAS A RECEBER (RECEIVABLES) ===
${
  ctx.receivables.length === 0
    ? 'Nenhuma conta a receber cadastrada.'
    : ctx.receivables
        .map((r) => `- [${r.status}] ${r.description}: ${formatBRL(r.amount)} de ${r.payer} (Previsão: ${r.dueDate})`)
        .join('\n')
}
`;
}
