import { prisma } from '../prisma/client';
import { parseDateWithTime } from '../utils/expenseUtils';

export const AI_TOOL_DECLARATIONS = [
  {
    name: 'create_variable_expense',
    description: 'Cadastra um novo gasto do dia a dia ou despesa variável (ex: alimentação, combustível, supermercado, farmácia, transporte, lazer).',
    parameters: {
      type: 'OBJECT',
      properties: {
        description: {
          type: 'STRING',
          description: 'Descrição clara da despesa (ex: Almoço restaurante, Gasolina posto, Compra no Carrefour)',
        },
        amount: {
          type: 'NUMBER',
          description: 'Valor numérico em reais (deve ser maior que zero, ex: 45.50)',
        },
        category: {
          type: 'STRING',
          description: 'Categoria da despesa (ex: Alimentação, Mercado, Transporte, Lazer, Saúde, Moradia, Outros)',
        },
        date: {
          type: 'STRING',
          description: 'Data do gasto no formato YYYY-MM-DD. Se o usuário falar "hoje", use a data atual. Se não informada, use a data atual.',
        },
        pixKey: {
          type: 'STRING',
          description: 'Chave Pix opcional associada ao pagamento',
        },
      },
      required: ['description', 'amount', 'category'],
    },
  },
  {
    name: 'create_revenue',
    description: 'Cadastra uma nova receita, entrada ou faturamento no sistema (ex: salário recebido, freelance, dividendos, comissão).',
    parameters: {
      type: 'OBJECT',
      properties: {
        description: {
          type: 'STRING',
          description: 'Descrição da receita (ex: Salário mensal, Projeto Freelance Web, Rendimento CDB)',
        },
        amount: {
          type: 'NUMBER',
          description: 'Valor em reais (maior que zero)',
        },
        category: {
          type: 'STRING',
          description: 'Categoria da renda (ex: Salário, Serviços, Investimentos, Vendas, Benefícios, Outros)',
        },
        date: {
          type: 'STRING',
          description: 'Data no formato YYYY-MM-DD',
        },
      },
      required: ['description', 'amount', 'category'],
    },
  },
  {
    name: 'mark_fixed_expense_paid',
    description: 'Marca uma conta a pagar / despesa fixa como paga ou pendente no mês especificado.',
    parameters: {
      type: 'OBJECT',
      properties: {
        expenseNameOrId: {
          type: 'STRING',
          description: 'Nome aproximado da conta (ex: "Internet", "Aluguel", "Condomínio") ou seu ID',
        },
        isPaid: {
          type: 'BOOLEAN',
          description: 'true para marcar a conta como PAGA, ou false para marcar como PENDENTE',
        },
        month: {
          type: 'INTEGER',
          description: 'Número do mês (1 a 12). Padrão é o mês atual se não informado.',
        },
        year: {
          type: 'INTEGER',
          description: 'Ano de referência (ex: 2026). Padrão é o ano atual.',
        },
      },
      required: ['expenseNameOrId', 'isPaid'],
    },
  },
  {
    name: 'add_savings_deposit',
    description: 'Registra um novo depósito (aporte) ou retirada (resgate) em um cofrinho da poupança.',
    parameters: {
      type: 'OBJECT',
      properties: {
        piggyBankNameOrId: {
          type: 'STRING',
          description: 'Nome aproximado do cofrinho (ex: "Reserva de Emergência", "Viagem", "Carro Novo") ou ID',
        },
        amount: {
          type: 'NUMBER',
          description: 'Valor numérico em reais a ser depositado ou resgatado',
        },
        type: {
          type: 'STRING',
          description: '"deposit" para guardar/aportar dinheiro, ou "withdrawal" para resgatar/retirar dinheiro do cofrinho',
        },
        description: {
          type: 'STRING',
          description: 'Descrição opcional do aporte ou retirada',
        },
      },
      required: ['piggyBankNameOrId', 'amount', 'type'],
    },
  },
  {
    name: 'create_receivable',
    description: 'Cadastra uma nova conta a receber (empréstimo para alguém, valor a cobrar de terceiro ou venda parcelada).',
    parameters: {
      type: 'OBJECT',
      properties: {
        description: {
          type: 'STRING',
          description: 'Descrição do que é devido (ex: Empréstimo almoço, Venda de notebook)',
        },
        amount: {
          type: 'NUMBER',
          description: 'Valor em reais a receber',
        },
        payer: {
          type: 'STRING',
          description: 'Nome de quem deve pagar (ex: João, Maria, Empresa X)',
        },
        dueDate: {
          type: 'STRING',
          description: 'Data prevista para recebimento no formato YYYY-MM-DD',
        },
      },
      required: ['description', 'amount', 'payer'],
    },
  },
  {
    name: 'get_credit_card_invoice_details',
    description: 'Consulta o valor total e o detalhamento das compras/parcelas da fatura de um cartão de crédito para qualquer mês e ano (incluindo meses futuros como novembro/2026, dezembro/2026 ou passados).',
    parameters: {
      type: 'OBJECT',
      properties: {
        cardName: {
          type: 'STRING',
          description: 'Nome do cartão (ex: "Nubank", "Mercado Pago", "Hipercard", "Banco Inter")',
        },
        month: {
          type: 'INTEGER',
          description: 'Número do mês (1 a 12)',
        },
        year: {
          type: 'INTEGER',
          description: 'Ano de referência (ex: 2026, 2027)',
        },
      },
      required: ['cardName', 'month', 'year'],
    },
  },
];

export interface ToolExecutionResult {
  success: boolean;
  toolName: string;
  summary: string;
  data?: any;
  error?: string;
}

export async function executeAiTool(
  userId: string,
  toolName: string,
  args: any
): Promise<ToolExecutionResult> {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  try {
    switch (toolName) {
      case 'create_variable_expense': {
        const { description, amount, category, date, pixKey } = args;
        const parsedAmount = Math.abs(parseFloat(amount));
        const targetDate = date ? String(date).trim() : todayStr;

        const expense = await prisma.variableExpense.create({
          data: {
            userId,
            description: String(description).trim(),
            amount: parsedAmount,
            category: String(category).trim(),
            date: parseDateWithTime(targetDate, undefined),
            pixKey: pixKey ? String(pixKey).trim() : null,
          },
        });

        const formattedVal = `R$ ${parsedAmount.toFixed(2).replace('.', ',')}`;
        return {
          success: true,
          toolName,
          summary: `Despesa de ${formattedVal} ("${expense.description}") cadastrada com sucesso em ${expense.category}.`,
          data: expense,
        };
      }

      case 'create_revenue': {
        const { description, amount, category, date } = args;
        const parsedAmount = Math.abs(parseFloat(amount));
        const targetDate = date ? String(date).trim() : todayStr;

        const revenue = await prisma.revenue.create({
          data: {
            userId,
            description: String(description).trim(),
            amount: parsedAmount,
            category: String(category).trim(),
            date: parseDateWithTime(targetDate, undefined),
          },
        });

        const formattedVal = `R$ ${parsedAmount.toFixed(2).replace('.', ',')}`;
        return {
          success: true,
          toolName,
          summary: `Receita de ${formattedVal} ("${revenue.description}") adicionada com sucesso em ${revenue.category}.`,
          data: revenue,
        };
      }

      case 'mark_fixed_expense_paid': {
        const { expenseNameOrId, isPaid, month, year } = args;
        const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
        const targetYear = year ? parseInt(year) : now.getFullYear();

        const userExpenses = await prisma.fixedExpense.findMany({
          where: { userId },
          include: { payments: true },
        });

        const cleanTerm = String(expenseNameOrId).toLowerCase().trim();
        const found = userExpenses.find(
          (e) =>
            e.id === expenseNameOrId ||
            e.description.toLowerCase().includes(cleanTerm) ||
            cleanTerm.includes(e.description.toLowerCase())
        );

        if (!found) {
          return {
            success: false,
            toolName,
            summary: `Não encontrei nenhuma despesa fixa correspondente a "${expenseNameOrId}".`,
            error: 'Conta não encontrada',
          };
        }

        const existingPayment = found.payments.find(
          (p) => p.month === targetMonth && p.year === targetYear
        );

        if (existingPayment) {
          await prisma.fixedExpensePayment.update({
            where: { id: existingPayment.id },
            data: {
              isPaid: Boolean(isPaid),
              paidAt: isPaid ? new Date() : null,
            },
          });
        } else {
          await prisma.fixedExpensePayment.create({
            data: {
              fixedExpenseId: found.id,
              userId,
              month: targetMonth,
              year: targetYear,
              isPaid: Boolean(isPaid),
              paidAt: isPaid ? new Date() : null,
            },
          });
        }

        const statusLabel = isPaid ? 'PAGA' : 'PENDENTE';
        return {
          success: true,
          toolName,
          summary: `Conta "${found.description}" marcada como ${statusLabel} no mês ${targetMonth}/${targetYear}.`,
          data: { expenseId: found.id, description: found.description, isPaid },
        };
      }

      case 'add_savings_deposit': {
        const { piggyBankNameOrId, amount, type, description } = args;
        const parsedAmount = Math.abs(parseFloat(amount));
        const cleanType = type === 'withdrawal' ? 'withdrawal' : 'deposit';

        const piggyBanks = await prisma.piggyBank.findMany({
          where: { userId },
          include: { savings: true },
        });
        const cleanTerm = String(piggyBankNameOrId).toLowerCase().trim();
        const found = piggyBanks.find(
          (p) =>
            p.id === piggyBankNameOrId ||
            p.name.toLowerCase().includes(cleanTerm) ||
            cleanTerm.includes(p.name.toLowerCase())
        );

        if (!found) {
          return {
            success: false,
            toolName,
            summary: `Não encontrei nenhum cofrinho com o nome "${piggyBankNameOrId}".`,
            error: 'Cofrinho não encontrado',
          };
        }

        const currentPiggyBalance = found.savings.reduce((acc, s) => acc + s.amount, 0);

        if (cleanType === 'withdrawal' && currentPiggyBalance < parsedAmount) {
          return {
            success: false,
            toolName,
            summary: `Saldo insuficiente no cofrinho "${found.name}". Saldo atual: R$ ${currentPiggyBalance.toFixed(2)}, tentativa de resgate: R$ ${parsedAmount.toFixed(2)}.`,
            error: 'Saldo insuficiente no cofrinho',
          };
        }

        const deltaAmount = cleanType === 'deposit' ? parsedAmount : -parsedAmount;
        const newBalance = currentPiggyBalance + deltaAmount;

        await prisma.savings.create({
          data: {
            userId,
            piggyBankId: found.id,
            amount: deltaAmount,
            description: description ? String(description).trim() : `Operação via Assistente IA`,
            objective: found.name,
            date: new Date(),
          },
        });

        const formattedVal = `R$ ${parsedAmount.toFixed(2).replace('.', ',')}`;
        const newBalFormatted = `R$ ${newBalance.toFixed(2).replace('.', ',')}`;
        const actionWord = cleanType === 'deposit' ? 'depositado no' : 'resgatado do';

        return {
          success: true,
          toolName,
          summary: `Valor de ${formattedVal} ${actionWord} cofrinho "${found.name}". Novo saldo do cofrinho: ${newBalFormatted}.`,
          data: { piggyBankId: found.id, name: found.name, newBalance },
        };
      }

      case 'create_receivable': {
        const { description, amount, payer, dueDate } = args;
        const parsedAmount = Math.abs(parseFloat(amount));
        const targetDate = dueDate ? String(dueDate).trim() : todayStr;

        const receivable = await prisma.receivable.create({
          data: {
            userId,
            description: String(description).trim(),
            amount: parsedAmount,
            payer: String(payer).trim(),
            dueDate: parseDateWithTime(targetDate, undefined),
            isReceived: false,
          },
        });

        const formattedVal = `R$ ${parsedAmount.toFixed(2).replace('.', ',')}`;
        return {
          success: true,
          toolName,
          summary: `Conta a receber de ${formattedVal} ("${receivable.description}") devida por ${receivable.payer} registrada com sucesso.`,
          data: receivable,
        };
      }

      case 'get_credit_card_invoice_details': {
        const { cardName, month, year } = args;
        const targetMonth = parseInt(month);
        const targetYear = parseInt(year);

        const cards = await prisma.creditCard.findMany({
          where: { userId },
          include: {
            invoices: { where: { month: targetMonth, year: targetYear } },
            installments: {
              where: { month: targetMonth, year: targetYear },
              include: { purchase: true },
            },
          },
        });

        const cleanCard = String(cardName).toLowerCase().trim();
        const found = cards.find(
          (c) =>
            c.name.toLowerCase().includes(cleanCard) ||
            cleanCard.includes(c.name.toLowerCase())
        );

        if (!found) {
          return {
            success: false,
            toolName,
            summary: `Não encontrei nenhum cartão de crédito com o nome "${cardName}".`,
            error: 'Cartão não encontrado',
          };
        }

        const invoice = found.invoices[0];
        const installmentsSum = found.installments.reduce((acc, curr) => acc + curr.amount, 0);
        const manualAdj = invoice?.manualAdjustment ?? 0;
        const totalAmount = Math.max(0, Math.round((installmentsSum + manualAdj) * 100) / 100);

        const items = found.installments.map((i) => ({
          description: i.purchase?.description || 'Compra',
          amount: i.amount,
          installment: `${i.installmentNumber}/${i.totalInstallments}`,
          isThirdParty: i.isThirdParty,
        }));

        const formattedVal = `R$ ${totalAmount.toFixed(2).replace('.', ',')}`;
        return {
          success: true,
          toolName,
          summary: `Fatura ${found.name} em ${targetMonth}/${targetYear}: Total de ${formattedVal} (${items.length} parcelas/itens).`,
          data: {
            cardName: found.name,
            month: targetMonth,
            year: targetYear,
            totalAmount,
            manualAdjustment: manualAdj,
            isPaid: invoice ? invoice.isPaid : false,
            items,
          },
        };
      }

      default:
        return {
          success: false,
          toolName,
          summary: `Ação desconhecida: ${toolName}`,
          error: 'Tool não implementada',
        };
    }
  } catch (error: any) {
    console.error(`[AI Tools] Error executing ${toolName}:`, error);
    return {
      success: false,
      toolName,
      summary: `Ocorreu um erro ao processar a ação: ${error.message || 'Erro interno'}`,
      error: error.message,
    };
  }
}
