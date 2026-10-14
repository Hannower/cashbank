import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { parseDateWithTime } from '../utils/expenseUtils';

/**
 * 1. List receivables for the user (with optional month/year filtering)
 */
export async function getReceivables(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const status = req.query.status as string | undefined; // 'all' | 'pending' | 'received'

    let whereClause: any = { userId };

    if (month && year) {
      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      whereClause.dueDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (status === 'pending') {
      whereClause.isReceived = false;
    } else if (status === 'received') {
      whereClause.isReceived = true;
    }

    const receivables = await prisma.receivable.findMany({
      where: whereClause,
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
        { isReceived: 'asc' }, // Pending first
        { dueDate: 'asc' },
      ],
    });

    const totalExpected = receivables.reduce((acc, curr) => acc + curr.amount, 0);
    const totalPending = receivables
      .filter((r) => !r.isReceived)
      .reduce((acc, curr) => acc + curr.amount, 0);
    const totalReceived = receivables
      .filter((r) => r.isReceived)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const pendingCount = receivables.filter((r) => !r.isReceived).length;
    const receivedCount = receivables.filter((r) => r.isReceived).length;

    res.json({
      month,
      year,
      summary: {
        totalExpected: Math.round(totalExpected * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        totalReceived: Math.round(totalReceived * 100) / 100,
        pendingCount,
        receivedCount,
        totalCount: receivables.length,
      },
      receivables,
    });
  } catch (error) {
    console.error('getReceivables error:', error);
    res.status(500).json({ message: 'Erro ao buscar contas a receber' });
  }
}

/**
 * 2. Create a new receivable manually
 */
export async function createReceivable(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { description, amount, dueDate, category, payer, notes, time } = req.body;

    if (!description || amount === undefined || !dueDate) {
      res.status(400).json({ message: 'Descrição, valor e data de vencimento são obrigatórios' });
      return;
    }

    const parsedAmount = parseFloat(String(amount).replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ message: 'Valor deve ser maior que zero' });
      return;
    }

    const receivable = await prisma.receivable.create({
      data: {
        userId,
        description: description.trim(),
        amount: parsedAmount,
        dueDate: parseDateWithTime(dueDate, time),
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
    const { description, amount, dueDate, category, payer, notes, time } = req.body;

    const existing = await prisma.receivable.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Conta a receber não encontrada' });
      return;
    }

    const parsedAmount = amount !== undefined ? parseFloat(String(amount).replace(',', '.')) : existing.amount;
    const updatedDate = dueDate !== undefined
      ? parseDateWithTime(dueDate, time)
      : (time ? parseDateWithTime(existing.dueDate, time) : existing.dueDate);

    const updated = await prisma.$transaction(async (tx) => {
      const rec = await tx.receivable.update({
        where: { id },
        data: {
          description: description !== undefined ? description.trim() : existing.description,
          amount: parsedAmount,
          dueDate: updatedDate,
          category: category !== undefined ? (category ? category.trim() : 'Outros') : existing.category,
          payer: payer !== undefined ? (payer ? payer.trim() : null) : existing.payer,
          notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
        },
      });

      // If already marked as received and has a linked revenue, update the revenue too!
      if (rec.revenueId) {
        await tx.revenue.update({
          where: { id: rec.revenueId },
          data: {
            description: rec.payer ? `Recebimento (${rec.payer}): ${rec.description}` : `Recebimento: ${rec.description}`,
            amount: rec.amount,
            category: rec.category || 'Recebimentos',
          },
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
 * 4. Delete a receivable
 */
export async function deleteReceivable(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = await prisma.receivable.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Conta a receber não encontrada' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      if (existing.revenueId) {
        await tx.revenue.delete({
          where: { id: existing.revenueId },
        }).catch(() => {});
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
 * 5. Toggle received status (Register receipt or unmark)
 * Automatically syncs with Revenue so it appears in Receitas section!
 */
export async function toggleReceivableReceived(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { isReceived, receivedAt } = req.body;

    const existing = await prisma.receivable.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Conta a receber não encontrada' });
      return;
    }

    const nextStatus = isReceived !== undefined ? Boolean(isReceived) : !existing.isReceived;
    const effectiveDate = receivedAt ? new Date(receivedAt) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      if (nextStatus) {
        // Marking as received: create or reuse Revenue
        let revId = existing.revenueId;
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
            // If the revenue was deleted manually, create a new one
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

        return await tx.receivable.update({
          where: { id },
          data: {
            isReceived: true,
            receivedAt: effectiveDate,
            revenueId: revId,
          },
          include: {
            revenue: true,
          },
        });
      } else {
        // Unmarking (setting back to pending): remove linked Revenue if exists
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
