import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { isFixedExpenseActiveInMonth, parseDateWithTime } from '../utils/expenseUtils';

/**
 * 1. List receivables for the user (with optional month/year filtering)
 * Supports both one-time receivables and recurring receivables with endDate & monthly adjustments
 */
export async function getReceivables(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const month = req.query.month ? parseInt(req.query.month as string) : (new Date().getMonth() + 1);
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const status = req.query.status as string | undefined; // 'all' | 'pending' | 'received' | 'thirdParty'

    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // A) Fetch non-recurring receivables for this month
    const nonRecurring = await prisma.receivable.findMany({
      where: {
        userId,
        isRecurring: false,
        dueDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        creditCardPurchase: {
          select: {
            id: true,
            description: true,
            creditCard: {
              select: { id: true, name: true, color: true },
            },
          },
        },
        creditCardInstallment: {
          select: {
            installmentNumber: true,
            totalInstallments: true,
          },
        },
        revenue: {
          select: { id: true, date: true, amount: true },
        },
      },
      orderBy: [
        { isReceived: 'asc' },
        { dueDate: 'asc' },
      ],
    });

    const formattedNonRecurring = nonRecurring.map((item) => {
      // Remove redundant payer name prefix if present in description
      let cleanDesc = item.description;
      if (item.payer && cleanDesc.startsWith(`${item.payer} - `)) {
        cleanDesc = cleanDesc.replace(`${item.payer} - `, '');
      }

      return {
        id: item.id,
        description: cleanDesc,
        amount: item.amount,
        baseAmount: item.amount,
        adjustedBaseAmount: item.amount,
        hasCustomAmount: false,
        hasAdjustment: false,
        adjustmentDetails: null,
        adjustments: [],
        dueDate: item.dueDate,
        dueDay: item.dueDay || new Date(item.dueDate).getUTCDate(),
        endDate: item.endDate,
        isRecurring: false,
        isSale: item.isSale,
        category: item.category,
        payer: item.payer,
        notes: item.notes,
        isReceived: item.isReceived,
        receivedAt: item.receivedAt,
        revenueId: item.revenueId,
        creditCardPurchaseId: item.creditCardPurchaseId,
        creditCardPurchase: item.creditCardPurchase,
        creditCardInstallmentId: item.creditCardInstallmentId,
        creditCardInstallment: item.creditCardInstallment,
        revenue: item.revenue,
      };
    });

    // B) Fetch recurring receivables for this user
    const recurringAll = await prisma.receivable.findMany({
      where: {
        userId,
        isRecurring: true,
      },
      include: {
        receipts: {
          where: { month, year },
          include: {
            revenue: {
              select: { id: true, date: true, amount: true },
            },
          },
        },
        adjustments: {
          orderBy: [
            { startYear: 'desc' },
            { startMonth: 'desc' },
          ],
        },
        creditCardPurchase: {
          select: {
            id: true,
            description: true,
            creditCard: {
              select: { id: true, name: true, color: true },
            },
          },
        },
        creditCardInstallment: {
          select: {
            installmentNumber: true,
            totalInstallments: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Filter recurring active in this target month/year
    const activeRecurring = recurringAll.filter((rec) =>
      isFixedExpenseActiveInMonth(rec.dueDate, rec.endDate, month, year)
    );

    const formattedRecurring = activeRecurring.map((rec) => {
      // 1. Check adjustments for this target month
      const activeAdjustment = rec.adjustments.find(
        (adj) =>
          adj.startYear < year ||
          (adj.startYear === year && adj.startMonth <= month)
      );
      const adjustedBaseAmount = activeAdjustment ? activeAdjustment.amount : rec.amount;

      // 2. Check current month receipt override
      const monthReceipt = rec.receipts.find((r) => r.month === month && r.year === year);
      const hasCustomAmount = monthReceipt?.amount !== null && monthReceipt?.amount !== undefined;
      const effectiveAmount = hasCustomAmount ? monthReceipt!.amount! : adjustedBaseAmount;

      const isReceived = monthReceipt ? monthReceipt.isReceived : false;
      const receivedAt = monthReceipt?.receivedAt || null;
      const revenueId = monthReceipt?.revenueId || null;

      // Remove redundant payer prefix if any
      let cleanDesc = rec.description;
      if (rec.payer && cleanDesc.startsWith(`${rec.payer} - `)) {
        cleanDesc = cleanDesc.replace(`${rec.payer} - `, '');
      }

      // Synthesize due date for this specific month/year
      const day = rec.dueDay || new Date(rec.dueDate).getUTCDate();
      const safeDay = Math.min(day, new Date(Date.UTC(year, month, 0)).getUTCDate());
      const synthesizedDueDate = new Date(Date.UTC(year, month - 1, safeDay, 12, 0, 0));

      return {
        id: rec.id,
        description: cleanDesc,
        amount: Math.round(effectiveAmount * 100) / 100,
        baseAmount: rec.amount,
        adjustedBaseAmount,
        hasCustomAmount,
        hasAdjustment: Boolean(activeAdjustment),
        adjustmentDetails: activeAdjustment
          ? {
              startMonth: activeAdjustment.startMonth,
              startYear: activeAdjustment.startYear,
              amount: activeAdjustment.amount,
            }
          : null,
        adjustments: rec.adjustments.map((a) => ({
          id: a.id,
          startMonth: a.startMonth,
          startYear: a.startYear,
          amount: a.amount,
        })),
        dueDate: synthesizedDueDate,
        dueDay: day,
        endDate: rec.endDate,
        isRecurring: true,
        isSale: rec.isSale,
        category: rec.category,
        payer: rec.payer,
        notes: rec.notes,
        isReceived,
        receivedAt,
        revenueId,
        creditCardPurchaseId: rec.creditCardPurchaseId,
        creditCardPurchase: rec.creditCardPurchase,
        creditCardInstallmentId: rec.creditCardInstallmentId,
        creditCardInstallment: rec.creditCardInstallment,
        revenue: monthReceipt?.revenue || null,
      };
    });

    // C) Combine and sort
    let allItems = [...formattedNonRecurring, ...formattedRecurring];

    // Status filter
    if (status === 'pending') {
      allItems = allItems.filter((item) => !item.isReceived);
    } else if (status === 'received') {
      allItems = allItems.filter((item) => item.isReceived);
    } else if (status === 'thirdParty') {
      allItems = allItems.filter((item) => Boolean(item.creditCardPurchaseId) || item.category === 'Cartão de Terceiros');
    }

    // Sort: Pending first, then by dueDate ascending
    allItems.sort((a, b) => {
      if (a.isReceived !== b.isReceived) {
        return a.isReceived ? 1 : -1;
      }
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    const totalExpected = allItems.reduce((acc, curr) => acc + curr.amount, 0);
    const totalPending = allItems
      .filter((r) => !r.isReceived)
      .reduce((acc, curr) => acc + curr.amount, 0);
    const totalReceived = allItems
      .filter((r) => r.isReceived)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const pendingCount = allItems.filter((r) => !r.isReceived).length;
    const receivedCount = allItems.filter((r) => r.isReceived).length;
    const thirdPartyCount = allItems.filter((r) => Boolean(r.creditCardPurchaseId) || r.category === 'Cartão de Terceiros').length;

    res.json({
      month,
      year,
      summary: {
        totalExpected: Math.round(totalExpected * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        totalReceived: Math.round(totalReceived * 100) / 100,
        pendingCount,
        receivedCount,
        thirdPartyCount,
        totalCount: allItems.length,
      },
      receivables: allItems,
    });
  } catch (error) {
    console.error('getReceivables error:', error);
    res.status(500).json({ message: 'Erro ao buscar contas a receber' });
  }
}

/**
 * 2. Create a new receivable manually
 * Supports recurring mode with optional endDate and isSale option
 */
export async function createReceivable(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const {
      description,
      amount,
      dueDate,
      endDate,
      isRecurring,
      isSale,
      category,
      payer,
      notes,
      time,
    } = req.body;

    if (!description || amount === undefined || !dueDate) {
      res.status(400).json({ message: 'Descrição, valor e primeiro vencimento são obrigatórios' });
      return;
    }

    const parsedAmount = parseFloat(String(amount).replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ message: 'Valor deve ser maior que zero' });
      return;
    }

    const parsedDueDate = parseDateWithTime(dueDate, time);
    const parsedDueDay = parsedDueDate.getUTCDate();
    const shouldRecur = Boolean(isRecurring) || Boolean(endDate);
    const parsedEndDate = endDate ? parseDateWithTime(endDate) : null;

    const receivable = await prisma.receivable.create({
      data: {
        userId,
        description: description.trim(),
        amount: parsedAmount,
        dueDate: parsedDueDate,
        dueDay: parsedDueDay,
        endDate: parsedEndDate,
        isRecurring: shouldRecur,
        isSale: Boolean(isSale),
        category: category ? category.trim() : 'Outros',
        payer: payer ? payer.trim() : null,
        notes: notes ? notes.trim() : null,
        isReceived: false,
      },
    });

    res.status(201).json(receivable);
  } catch (error) {
    console.error('createReceivable error:', error);
    res.status(500).json({ message: 'Erro ao cadastrar conta a receber' });
  }
}

/**
 * 3. Update an existing receivable
 */
export async function updateReceivable(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const {
      description,
      amount,
      dueDate,
      endDate,
      isRecurring,
      isSale,
      category,
      payer,
      notes,
      time,
    } = req.body;

    const existing = await prisma.receivable.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Conta a receber não encontrada' });
      return;
    }

    const parsedAmount = amount !== undefined ? parseFloat(String(amount).replace(',', '.')) : existing.amount;
    const updatedDueDate = dueDate !== undefined
      ? parseDateWithTime(dueDate, time)
      : (time ? parseDateWithTime(existing.dueDate, time) : existing.dueDate);
    const updatedDueDay = updatedDueDate.getUTCDate();
    const updatedEndDate = endDate !== undefined
      ? (endDate ? parseDateWithTime(endDate) : null)
      : existing.endDate;

    const updated = await prisma.$transaction(async (tx) => {
      const rec = await tx.receivable.update({
        where: { id },
        data: {
          description: description !== undefined ? description.trim() : existing.description,
          amount: parsedAmount,
          dueDate: updatedDueDate,
          dueDay: updatedDueDay,
          endDate: updatedEndDate,
          isRecurring: isRecurring !== undefined ? Boolean(isRecurring) : existing.isRecurring,
          isSale: isSale !== undefined ? Boolean(isSale) : existing.isSale,
          category: category !== undefined ? (category ? category.trim() : 'Outros') : existing.category,
          payer: payer !== undefined ? (payer ? payer.trim() : null) : existing.payer,
          notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
        },
      });

      // If already has linked revenues and isSale is true, update linked revenues
      if (rec.revenueId && rec.isSale) {
        await tx.revenue.update({
          where: { id: rec.revenueId },
          data: {
            description: rec.payer ? `Recebimento (${rec.payer}): ${rec.description}` : `Recebimento: ${rec.description}`,
            amount: rec.amount,
            category: rec.category || 'Recebimentos',
          },
        }).catch(() => {});
      } else if (rec.revenueId && !rec.isSale) {
        // If user unchecked isSale, remove linked revenue from Minha renda!
        await tx.revenue.delete({
          where: { id: rec.revenueId },
        }).catch(() => {});
        await tx.receivable.update({
          where: { id },
          data: { revenueId: null },
        });
      }

      return rec;
    });

    res.json(updated);
  } catch (error) {
    console.error('updateReceivable error:', error);
    res.status(500).json({ message: 'Erro ao atualizar conta a receber' });
  }
}

/**
 * 4. Adjust monthly amount (Identical model to Contas a pagar)
 * Scopes:
 * - 'onward': Reajustar a partir deste mês em diante (ReceivableAdjustment)
 * - 'month': Apenas neste mês (ReceivableReceipt.amount)
 * - 'all': Alterar valor padrão geral (Receivable.amount)
 */
export async function updateReceivableMonthAmount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { month, year, amount, scope } = req.body;

    if (!month || !year) {
      res.status(400).json({ message: 'Parâmetros month e year são obrigatórios' });
      return;
    }

    const receivable = await prisma.receivable.findFirst({
      where: { id, userId },
    });

    if (!receivable) {
      res.status(404).json({ message: 'Conta a receber não encontrada' });
      return;
    }

    const targetMonth = parseInt(String(month));
    const targetYear = parseInt(String(year));

    const parsedAmount =
      amount !== null && amount !== undefined && amount !== '' && !isNaN(parseFloat(String(amount).replace(',', '.')))
        ? parseFloat(String(amount).replace(',', '.'))
        : null;

    if (!receivable.isRecurring || scope === 'all') {
      // 1. Atualizar valor base original geral
      if (parsedAmount !== null) {
        await prisma.receivable.update({
          where: { id },
          data: { amount: parsedAmount },
        });
      }
      res.json({ message: 'Valor padrão atualizado com sucesso' });
      return;
    }

    if (scope === 'onward') {
      // 2. Reajustar a partir deste mês/ano em diante
      if (parsedAmount !== null) {
        await prisma.receivableAdjustment.upsert({
          where: {
            receivableId_startYear_startMonth: {
              receivableId: id,
              startYear: targetYear,
              startMonth: targetMonth,
            },
          },
          update: { amount: parsedAmount },
          create: {
            receivableId: id,
            startYear: targetYear,
            startMonth: targetMonth,
            amount: parsedAmount,
          },
        });

        // Limpa override pontual deste mês para seguir o reajuste
        await prisma.receivableReceipt.upsert({
          where: {
            receivableId_month_year: {
              receivableId: id,
              month: targetMonth,
              year: targetYear,
            },
          },
          update: {
            amount: null,
          },
          create: {
            receivableId: id,
            userId,
            month: targetMonth,
            year: targetYear,
            isReceived: false,
            amount: null,
          },
        });
      } else {
        await prisma.receivableAdjustment.deleteMany({
          where: {
            receivableId: id,
            startYear: targetYear,
            startMonth: targetMonth,
          },
        });
      }
      res.json({ message: 'Reajuste permanente aplicado com sucesso' });
      return;
    }

    // 3. Default: 'month' - Apenas neste mês
    await prisma.receivableReceipt.upsert({
      where: {
        receivableId_month_year: {
          receivableId: id,
          month: targetMonth,
          year: targetYear,
        },
      },
      update: {
        amount: parsedAmount,
      },
      create: {
        receivableId: id,
        userId,
        month: targetMonth,
        year: targetYear,
        isReceived: false,
        amount: parsedAmount,
      },
    });

    res.json({ message: 'Ajuste pontual aplicado com sucesso' });
  } catch (error) {
    console.error('updateReceivableMonthAmount error:', error);
    res.status(500).json({ message: 'Erro ao ajustar valor da conta a receber' });
  }
}

/**
 * 5. Delete a receivable
 */
export async function deleteReceivable(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = await prisma.receivable.findFirst({
      where: { id, userId },
      include: {
        receipts: true,
      },
    });

    if (!existing) {
      res.status(404).json({ message: 'Conta a receber não encontrada' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Delete single linked revenue if any
      if (existing.revenueId) {
        await tx.revenue.delete({
          where: { id: existing.revenueId },
        }).catch(() => {});
      }

      // Delete recurring month linked revenues if any
      for (const rec of existing.receipts) {
        if (rec.revenueId) {
          await tx.revenue.delete({
            where: { id: rec.revenueId },
          }).catch(() => {});
        }
      }

      await tx.receivable.delete({
        where: { id },
      });
    });

    res.json({ message: 'Conta a receber excluída com sucesso' });
  } catch (error) {
    console.error('deleteReceivable error:', error);
    res.status(500).json({ message: 'Erro ao excluir conta a receber' });
  }
}

/**
 * 6. Toggle received status (Register receipt or unmark)
 * CRITICAL RULE:
 * - Only if isSale === true: Create / update Revenue in Minha renda.
 * - If isSale === false (e.g. third-party card purchase or debt repayment): NEVER create Revenue!
 */
export async function toggleReceivableReceived(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { isReceived, receivedAt, month, year } = req.body;

    const existing = await prisma.receivable.findFirst({
      where: { id, userId },
      include: {
        receipts: month && year ? { where: { month: parseInt(String(month)), year: parseInt(String(year)) } } : true,
      },
    });

    if (!existing) {
      res.status(404).json({ message: 'Conta a receber não encontrada' });
      return;
    }

    const effectiveDate = receivedAt ? new Date(receivedAt) : new Date();

    // CASE A: Recurring receivable
    if (existing.isRecurring) {
      const targetMonth = month ? parseInt(String(month)) : (new Date().getMonth() + 1);
      const targetYear = year ? parseInt(String(year)) : new Date().getFullYear();

      const existingReceipt = existing.receipts.find(
        (r) => r.month === targetMonth && r.year === targetYear
      );

      const nextStatus = isReceived !== undefined ? Boolean(isReceived) : !existingReceipt?.isReceived;

      const result = await prisma.$transaction(async (tx) => {
        if (nextStatus) {
          let revId = existingReceipt?.revenueId;

          // Only create Revenue if it is flagged as a sale (isSale === true)
          if (existing.isSale) {
            const revDesc = existing.payer
              ? `Recebimento (${existing.payer}): ${existing.description}`
              : `Recebimento: ${existing.description}`;

            const revAmount = existingReceipt?.amount ?? existing.amount;

            if (revId) {
              await tx.revenue.update({
                where: { id: revId },
                data: {
                  description: revDesc,
                  amount: revAmount,
                  date: effectiveDate,
                  category: existing.category || 'Recebimentos',
                },
              }).catch(async () => {
                const newRev = await tx.revenue.create({
                  data: {
                    userId,
                    description: revDesc,
                    amount: revAmount,
                    date: effectiveDate,
                    category: existing.category || 'Recebimentos',
                  },
                });
                revId = newRev.id;
              });
            } else {
              const newRev = await tx.revenue.create({
                data: {
                  userId,
                  description: revDesc,
                  amount: revAmount,
                  date: effectiveDate,
                  category: existing.category || 'Recebimentos',
                },
              });
              revId = newRev.id;
            }
          }

          const receipt = await tx.receivableReceipt.upsert({
            where: {
              receivableId_month_year: {
                receivableId: id,
                month: targetMonth,
                year: targetYear,
              },
            },
            update: {
              isReceived: true,
              receivedAt: effectiveDate,
              revenueId: existing.isSale ? revId : null,
            },
            create: {
              receivableId: id,
              userId,
              month: targetMonth,
              year: targetYear,
              isReceived: true,
              receivedAt: effectiveDate,
              revenueId: existing.isSale ? revId : null,
            },
            include: {
              revenue: true,
            },
          });

          return receipt;
        } else {
          // Unmarking: remove linked Revenue if exists
          if (existingReceipt?.revenueId) {
            await tx.revenue.delete({
              where: { id: existingReceipt.revenueId },
            }).catch(() => {});
          }

          const receipt = await tx.receivableReceipt.upsert({
            where: {
              receivableId_month_year: {
                receivableId: id,
                month: targetMonth,
                year: targetYear,
              },
            },
            update: {
              isReceived: false,
              receivedAt: null,
              revenueId: null,
            },
            create: {
              receivableId: id,
              userId,
              month: targetMonth,
              year: targetYear,
              isReceived: false,
              receivedAt: null,
              revenueId: null,
            },
          });

          return receipt;
        }
      });

      res.json(result);
      return;
    }

    // CASE B: Non-recurring receivable (Single or credit card installment)
    const nextStatus = isReceived !== undefined ? Boolean(isReceived) : !existing.isReceived;

    const result = await prisma.$transaction(async (tx) => {
      if (nextStatus) {
        let revId = existing.revenueId;

        // Only create Revenue if it is a sale (isSale === true)!
        // Third-party credit card purchases have isSale = false and will NEVER create a Revenue!
        if (existing.isSale) {
          const revDesc = existing.payer
            ? `Recebimento (${existing.payer}): ${existing.description}`
            : `Recebimento: ${existing.description}`;

          if (revId) {
            await tx.revenue.update({
              where: { id: revId },
              data: {
                description: revDesc,
                amount: existing.amount,
                date: effectiveDate,
                category: existing.category || 'Recebimentos',
              },
            }).catch(async () => {
              const newRev = await tx.revenue.create({
                data: {
                  userId,
                  description: revDesc,
                  amount: existing.amount,
                  date: effectiveDate,
                  category: existing.category || 'Recebimentos',
                },
              });
              revId = newRev.id;
            });
          } else {
            const newRev = await tx.revenue.create({
              data: {
                userId,
                description: revDesc,
                amount: existing.amount,
                date: effectiveDate,
                category: existing.category || 'Recebimentos',
              },
            });
            revId = newRev.id;
          }
        }

        return await tx.receivable.update({
          where: { id },
          data: {
            isReceived: true,
            receivedAt: effectiveDate,
            revenueId: existing.isSale ? revId : null,
          },
          include: {
            revenue: true,
          },
        });
      } else {
        // Unmarking
        if (existing.revenueId) {
          await tx.revenue.delete({
            where: { id: existing.revenueId },
          }).catch(() => {});
        }

        return await tx.receivable.update({
          where: { id },
          data: {
            isReceived: false,
            receivedAt: null,
            revenueId: null,
          },
        });
      }
    });

    res.json(result);
  } catch (error) {
    console.error('toggleReceivableReceived error:', error);
    res.status(500).json({ message: 'Erro ao alternar status de recebimento' });
  }
}
