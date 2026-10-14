import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Helper to calculate month and year for a given installment offset
 */
export function calculateInstallmentDate(startMonth: number, startYear: number, offsetIndex: number): { month: number; year: number } {
  let m = startMonth + offsetIndex;
  let y = startYear;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return { month: m, year: y };
}

/**
 * 1. List all credit cards for the user with current month summary
 */
export async function getCreditCards(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const cards = await prisma.creditCard.findMany({
      where: { userId },
      include: {
        invoices: {
          where: { month, year },
        },
        installments: {
          where: { month, year },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formattedCards = cards.map((card) => {
      const invoice = card.invoices[0];
      const installmentsSum = card.installments.reduce((acc, curr) => acc + curr.amount, 0);
      const manualAdjustment = invoice?.manualAdjustment ?? 0;
      const totalAmount = Math.max(0, Math.round((installmentsSum + manualAdjustment) * 100) / 100);

      return {
        id: card.id,
        name: card.name,
        limit: card.limit,
        dueDay: card.dueDay,
        closingDay: card.closingDay,
        color: card.color,
        brand: card.brand,
        digits: card.digits,
        currentInvoice: {
          month,
          year,
          installmentsSum,
          manualAdjustment: invoice?.manualAdjustment ?? null,
          totalAmount,
          isPaid: invoice ? invoice.isPaid : false,
          paidAt: invoice?.paidAt || null,
          installmentsCount: card.installments.length,
        },
      };
    });

    res.json(formattedCards);
  } catch (error) {
    console.error('getCreditCards error:', error);
    res.status(500).json({ message: 'Erro ao buscar cartões de crédito' });
  }
}

/**
 * 2. Create a new credit card
 */
export async function createCreditCard(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { name, limit, dueDay, closingDay, color, brand, digits } = req.body;

    if (!name || !dueDay) {
      res.status(400).json({ message: 'Nome e dia de vencimento são obrigatórios' });
      return;
    }

    const parsedDueDay = parseInt(dueDay);
    const parsedClosingDay = closingDay ? parseInt(closingDay) : Math.max(1, (parsedDueDay - 7 + 30) % 30 || 1);

    const card = await prisma.creditCard.create({
      data: {
        userId,
        name: name.trim(),
        limit: limit ? parseFloat(String(limit).replace(',', '.')) : 0,
        dueDay: parsedDueDay,
        closingDay: parsedClosingDay,
        color: color || '#8b5cf6',
        brand: brand || 'Mastercard',
        digits: digits ? String(digits).slice(-4) : null,
      },
    });

    res.status(201).json(card);
  } catch (error) {
    console.error('createCreditCard error:', error);
    res.status(500).json({ message: 'Erro ao cadastrar cartão de crédito' });
  }
}

/**
 * 3. Update an existing credit card
 */
export async function updateCreditCard(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { name, limit, dueDay, closingDay, color, brand, digits } = req.body;

    const existing = await prisma.creditCard.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Cartão não encontrado' });
      return;
    }

    const updated = await prisma.creditCard.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        limit: limit !== undefined ? parseFloat(String(limit).replace(',', '.')) : existing.limit,
        dueDay: dueDay ? parseInt(dueDay) : existing.dueDay,
        closingDay: closingDay ? parseInt(closingDay) : existing.closingDay,
        color: color || existing.color,
        brand: brand || existing.brand,
        digits: digits !== undefined ? (digits ? String(digits).slice(-4) : null) : existing.digits,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('updateCreditCard error:', error);
    res.status(500).json({ message: 'Erro ao atualizar cartão de crédito' });
  }
}

/**
 * 4. Delete a credit card
 */
export async function deleteCreditCard(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = await prisma.creditCard.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Cartão não encontrado' });
      return;
    }

    await prisma.creditCard.delete({
      where: { id },
    });

    res.json({ message: 'Cartão removido com sucesso' });
  } catch (error) {
    console.error('deleteCreditCard error:', error);
    res.status(500).json({ message: 'Erro ao excluir cartão de crédito' });
  }
}

/**
 * 5. Overview of invoices and purchases for a given month/year
 */
export async function getInvoicesOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    // Fetch all user cards
    const cards = await prisma.creditCard.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });

    // Fetch all installments for this month/year
    const installments = await prisma.creditCardInstallment.findMany({
      where: {
        creditCard: { userId },
        month,
        year,
      },
      include: {
        purchase: true,
        creditCard: true,
        receivables: true,
      },
      orderBy: {
        purchase: { purchaseDate: 'desc' },
      },
    });

    // Fetch all invoices status for this month/year
    const invoices = await prisma.creditCardInvoice.findMany({
      where: {
        userId,
        month,
        year,
      },
    });

    const cardDetails = cards.map((card) => {
      const cardInstallments = installments.filter((ins) => ins.creditCardId === card.id);
      const invoice = invoices.find((inv) => inv.creditCardId === card.id);
      const installmentsSum = cardInstallments.reduce((acc, curr) => acc + curr.amount, 0);
      const manualAdjustment = invoice?.manualAdjustment ?? 0;
      const totalAmount = Math.max(0, Math.round((installmentsSum + manualAdjustment) * 100) / 100);
      const isPaid = invoice ? invoice.isPaid : false;

      // Breakdown: titular vs terceiros
      const thirdPartySum = cardInstallments.reduce((acc, curr) => {
        const isThird = curr.isThirdParty || curr.purchase.isThirdParty;
        if (isThird) {
          const val = curr.thirdPartyAmount !== null && curr.thirdPartyAmount !== undefined
            ? curr.thirdPartyAmount
            : curr.amount;
          return acc + val;
        }
        return acc;
      }, 0);
      const roundedThirdParty = Math.round(thirdPartySum * 100) / 100;
      const holderSum = Math.max(0, Math.round((totalAmount - roundedThirdParty) * 100) / 100);

      return {
        card: {
          id: card.id,
          name: card.name,
          limit: card.limit,
          dueDay: card.dueDay,
          closingDay: card.closingDay,
          color: card.color,
          brand: card.brand,
          digits: card.digits,
        },
        installments: cardInstallments.map((ins) => {
          const isThird = ins.isThirdParty || ins.purchase.isThirdParty;
          const tpName = ins.thirdPartyName || ins.purchase.thirdPartyName || null;
          const tpAmount = ins.thirdPartyAmount !== null && ins.thirdPartyAmount !== undefined
            ? ins.thirdPartyAmount
            : (isThird ? ins.amount : null);
          const isReceived = ins.receivables.some((r) => r.isReceived);

          return {
            id: ins.id,
            purchaseId: ins.purchaseId,
            description: ins.purchase.description,
            category: ins.purchase.category,
            purchaseDate: ins.purchase.purchaseDate,
            totalPurchaseAmount: ins.purchase.totalAmount,
            installmentNumber: ins.installmentNumber,
            totalInstallments: ins.totalInstallments,
            amount: ins.amount,
            isThirdParty: isThird,
            thirdPartyName: tpName,
            thirdPartyAmount: tpAmount,
            isReceived,
          };
        }),
        installmentsSum,
        manualAdjustment: invoice?.manualAdjustment ?? null,
        totalAmount,
        holderSum,
        thirdPartySum: roundedThirdParty,
        isPaid,
        paidAt: invoice?.paidAt || null,
      };
    });

    // Totals for all cards in this month
    const totalAllCards = cardDetails.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const holderTotalAllCards = cardDetails.reduce((acc, curr) => acc + curr.holderSum, 0);
    const thirdPartyTotalAllCards = cardDetails.reduce((acc, curr) => acc + curr.thirdPartySum, 0);
    const paidAllCards = cardDetails.filter((c) => c.isPaid).reduce((acc, curr) => acc + curr.totalAmount, 0);
    const pendingAllCards = cardDetails.filter((c) => !c.isPaid).reduce((acc, curr) => acc + curr.totalAmount, 0);
    const purchasesCount = installments.length;

    res.json({
      month,
      year,
      summary: {
        totalAllCards: Math.round(totalAllCards * 100) / 100,
        holderTotalAllCards: Math.round(holderTotalAllCards * 100) / 100,
        thirdPartyTotalAllCards: Math.round(thirdPartyTotalAllCards * 100) / 100,
        paidAllCards: Math.round(paidAllCards * 100) / 100,
        pendingAllCards: Math.round(pendingAllCards * 100) / 100,
        purchasesCount,
        cardsCount: cards.length,
      },
      cards: cardDetails,
    });
  } catch (error) {
    console.error('getInvoicesOverview error:', error);
    res.status(500).json({ message: 'Erro ao buscar visão geral das faturas' });
  }
}

/**
 * 6. Create a new purchase with installment distribution (with optional third-party tagging)
 */
export async function createCreditCardPurchase(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const {
      creditCardId,
      description,
      totalAmount,
      installmentsCount,
      purchaseDate,
      category,
      firstInvoiceMonth,
      firstInvoiceYear,
      isThirdParty,
      thirdPartyName,
      thirdPartyAmount,
    } = req.body;

    if (!creditCardId || !description || totalAmount === undefined) {
      res.status(400).json({ message: 'Cartão, descrição e valor total são obrigatórios' });
      return;
    }

    const card = await prisma.creditCard.findFirst({
      where: { id: creditCardId, userId },
    });

    if (!card) {
      res.status(404).json({ message: 'Cartão não encontrado' });
      return;
    }

    const parsedTotal = parseFloat(String(totalAmount).replace(',', '.'));
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      res.status(400).json({ message: 'Valor da compra deve ser maior que zero' });
      return;
    }

    const safeIsThirdParty = Boolean(isThirdParty);
    const safeThirdPartyName = safeIsThirdParty ? ((thirdPartyName && String(thirdPartyName).trim()) || 'Terceiro') : null;
    const parsedThirdPartyTotal = safeIsThirdParty
      ? (thirdPartyAmount !== undefined && thirdPartyAmount !== null && thirdPartyAmount !== ''
          ? parseFloat(String(thirdPartyAmount).replace(',', '.'))
          : parsedTotal)
      : null;

    const count = parseInt(String(installmentsCount || 1));
    const safeInstallments = isNaN(count) || count < 1 ? 1 : count;

    const pDate = purchaseDate ? new Date(purchaseDate) : new Date();

    // Determine starting month and year for the first invoice:
    let startMonth: number;
    let startYear: number;

    if (firstInvoiceMonth && firstInvoiceYear) {
      startMonth = parseInt(String(firstInvoiceMonth));
      startYear = parseInt(String(firstInvoiceYear));
    } else {
      const pDay = pDate.getUTCDate() || pDate.getDate();
      let pMonth = pDate.getUTCMonth() + 1;
      let pYear = pDate.getUTCFullYear();

      if (pDay > card.closingDay) {
        pMonth += 1;
        if (pMonth > 12) {
          pMonth = 1;
          pYear += 1;
        }
      }
      startMonth = pMonth;
      startYear = pYear;
    }

    // Base installment calculation
    const baseInstallmentAmount = Math.floor((parsedTotal / safeInstallments) * 100) / 100;
    const remainder = Math.round((parsedTotal - baseInstallmentAmount * safeInstallments) * 100) / 100;

    // Third party installment distribution
    const tpTotal = parsedThirdPartyTotal ?? 0;
    const baseTpAmount = safeIsThirdParty ? Math.floor((tpTotal / safeInstallments) * 100) / 100 : 0;
    const tpRemainder = safeIsThirdParty ? Math.round((tpTotal - baseTpAmount * safeInstallments) * 100) / 100 : 0;

    // Create purchase, installments, and linked receivables in transaction
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.creditCardPurchase.create({
        data: {
          creditCardId: card.id,
          userId,
          description: description.trim(),
          totalAmount: parsedTotal,
          installmentsCount: safeInstallments,
          purchaseDate: pDate,
          category: category ? category.trim() : 'Outros',
          isThirdParty: safeIsThirdParty,
          thirdPartyName: safeThirdPartyName,
          thirdPartyAmount: parsedThirdPartyTotal,
        },
      });

      for (let i = 0; i < safeInstallments; i++) {
        const { month: insMonth, year: insYear } = calculateInstallmentDate(startMonth, startYear, i);
        const insAmount = i === 0 ? baseInstallmentAmount + remainder : baseInstallmentAmount;
        const insTpAmount = safeIsThirdParty
          ? (i === 0 ? baseTpAmount + tpRemainder : baseTpAmount)
          : null;

        const installment = await tx.creditCardInstallment.create({
          data: {
            purchaseId: purchase.id,
            creditCardId: card.id,
            installmentNumber: i + 1,
            totalInstallments: safeInstallments,
            amount: Math.round(insAmount * 100) / 100,
            month: insMonth,
            year: insYear,
            isThirdParty: safeIsThirdParty,
            thirdPartyName: safeThirdPartyName,
            thirdPartyAmount: insTpAmount !== null ? Math.round(insTpAmount * 100) / 100 : null,
          },
        });

        // If this purchase was made for a third party, create a corresponding Receivable in Contas a receber!
        if (safeIsThirdParty && insTpAmount && insTpAmount > 0) {
          const dueDayToUse = Math.min(card.dueDay || 10, 28);
          const dueDate = new Date(Date.UTC(insYear, insMonth - 1, dueDayToUse, 12, 0, 0));

          await tx.receivable.create({
            data: {
              userId,
              creditCardPurchaseId: purchase.id,
              creditCardInstallmentId: installment.id,
              description: `${safeThirdPartyName} - ${purchase.description} (${i + 1}/${safeInstallments})`,
              amount: Math.round(insTpAmount * 100) / 100,
              dueDate,
              category: 'Cartão de Terceiros',
              payer: safeThirdPartyName,
              notes: `Fatura ${card.name} (${String(insMonth).padStart(2, '0')}/${insYear})`,
              isReceived: false,
            },
          });
        }
      }

      return purchase;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('createCreditCardPurchase error:', error);
    res.status(500).json({ message: 'Erro ao registrar compra no cartão' });
  }
}

/**
 * 7. Delete a credit card purchase (cascades to all its installments and cleans linked receivables and revenues)
 */
export async function deleteCreditCardPurchase(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const purchase = await prisma.creditCardPurchase.findFirst({
      where: { id, userId },
      include: {
        receivables: true,
      },
    });

    if (!purchase) {
      res.status(404).json({ message: 'Compra não encontrada' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Clean up any revenue created from these receivables
      for (const rec of purchase.receivables) {
        if (rec.revenueId) {
          await tx.revenue.delete({
            where: { id: rec.revenueId },
          }).catch(() => {});
        }
      }

      await tx.creditCardPurchase.delete({
        where: { id },
      });
    });

    res.json({ message: 'Compra e parcelas removidas com sucesso' });
  } catch (error) {
    console.error('deleteCreditCardPurchase error:', error);
    res.status(500).json({ message: 'Erro ao excluir compra no cartão' });
  }
}

/**
 * 8. Toggle invoice paid status
 */
export async function toggleInvoicePayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params; // creditCardId
    const { month, year, isPaid } = req.body;

    if (!month || !year || isPaid === undefined) {
      res.status(400).json({ message: 'Parâmetros month, year e isPaid são obrigatórios' });
      return;
    }

    const card = await prisma.creditCard.findFirst({
      where: { id, userId },
    });

    if (!card) {
      res.status(404).json({ message: 'Cartão não encontrado' });
      return;
    }

    const parsedMonth = parseInt(month);
    const parsedYear = parseInt(year);
    const status = Boolean(isPaid);

    const invoice = await prisma.creditCardInvoice.upsert({
      where: {
        creditCardId_month_year: {
          creditCardId: id,
          month: parsedMonth,
          year: parsedYear,
        },
      },
      update: {
        isPaid: status,
        paidAt: status ? new Date() : null,
      },
      create: {
        creditCardId: id,
        userId,
        month: parsedMonth,
        year: parsedYear,
        isPaid: status,
        paidAt: status ? new Date() : null,
      },
    });

    res.json(invoice);
  } catch (error) {
    console.error('toggleInvoicePayment error:', error);
    res.status(500).json({ message: 'Erro ao alternar status da fatura' });
  }
}

/**
 * 9. Set manual adjustment for invoice amount (charges, refunds, or direct total)
 */
export async function updateInvoiceAdjustment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params; // creditCardId
    const { month, year, manualAdjustment } = req.body;

    if (!month || !year) {
      res.status(400).json({ message: 'Parâmetros month e year são obrigatórios' });
      return;
    }

    const card = await prisma.creditCard.findFirst({
      where: { id, userId },
    });

    if (!card) {
      res.status(404).json({ message: 'Cartão não encontrado' });
      return;
    }

    const parsedMonth = parseInt(month);
    const parsedYear = parseInt(year);
    const parsedAdjustment =
      manualAdjustment !== null && manualAdjustment !== undefined && manualAdjustment !== ''
        ? parseFloat(String(manualAdjustment).replace(',', '.'))
        : null;

    const invoice = await prisma.creditCardInvoice.upsert({
      where: {
        creditCardId_month_year: {
          creditCardId: id,
          month: parsedMonth,
          year: parsedYear,
        },
      },
      update: {
        manualAdjustment: parsedAdjustment,
      },
      create: {
        creditCardId: id,
        userId,
        month: parsedMonth,
        year: parsedYear,
        manualAdjustment: parsedAdjustment,
      },
    });

    res.json(invoice);
  } catch (error) {
    console.error('updateInvoiceAdjustment error:', error);
    res.status(500).json({ message: 'Erro ao ajustar valor da fatura' });
  }
}
