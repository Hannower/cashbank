import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../prisma/client';
import { parseStatementFile } from '../utils/statementParser';

/**
 * Controller for Bank Accounts & Transactions
 * Supports OFX, CSV and PDF statement imports (Nubank, Inter, PicPay, Mercado Pago, Itaú, etc.)
 * Available to all authenticated users (isolated per userId)
 */

function getDefaultColorForBank(bankKey: string): string {
  switch (bankKey.toLowerCase()) {
    case 'nubank':
      return '#820AD1';
    case 'inter':
      return '#FF7A00';
    case 'mercadopago':
      return '#009EE3';
    case 'picpay':
      return '#11C76F';
    case 'itau':
      return '#EC7000';
    case 'bradesco':
      return '#CC092F';
    case 'santander':
      return '#CC0000';
    case 'caixa':
      return '#005CA9';
    case 'c6':
      return '#242424';
    default:
      return '#15803d';
  }
}

/**
 * 1. Get all bank accounts with consolidated summary
 */
export async function getBankAccounts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const accounts = await prisma.bankAccount.findMany({
      where: { userId },
      include: {
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthTransactions = await prisma.bankTransaction.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalIncomeMonth = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenseMonth = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Mask sensitive API credentials before returning
    const sanitizedAccounts = accounts.map((acc) => ({
      ...acc,
      apiToken: acc.apiToken ? '••••••••' + acc.apiToken.slice(-4) : null,
      apiClientSecret: acc.apiClientSecret ? '••••••••' : null,
      apiCert: acc.apiCert ? '[Certificado Instalado]' : null,
      apiCertKey: acc.apiCertKey ? '[Chave Privada Instalada]' : null,
    }));

    res.json({
      summary: {
        totalBalance: Math.round(totalBalance * 100) / 100,
        totalIncomeMonth: Math.round(totalIncomeMonth * 100) / 100,
        totalExpenseMonth: Math.round(totalExpenseMonth * 100) / 100,
        accountsCount: accounts.length,
      },
      accounts: sanitizedAccounts,
    });
  } catch (error: any) {
    console.error('Error in getBankAccounts:', error);
    res.status(500).json({ message: 'Erro ao carregar contas bancárias', error: error.message });
  }
}

/**
 * 2. Get transactions (Extrato) with filters
 */
export async function getBankTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { bankAccountId, type, limit } = req.query;

    const whereClause: any = { userId };
    if (bankAccountId && typeof bankAccountId === 'string') {
      whereClause.bankAccountId = bankAccountId;
    }
    if (type && type !== 'all') {
      whereClause.type = type;
    }

    const maxLimit = limit ? parseInt(limit as string, 10) : 100;

    const transactions = await prisma.bankTransaction.findMany({
      where: whereClause,
      include: {
        bankAccount: {
          select: { id: true, name: true, bankKey: true, color: true },
        },
      },
      orderBy: { date: 'desc' },
      take: maxLimit,
    });

    res.json(transactions);
  } catch (error: any) {
    console.error('Error in getBankTransactions:', error);
    res.status(500).json({ message: 'Erro ao carregar extrato de transações', error: error.message });
  }
}

/**
 * 3. Create a new bank account (API or OFX)
 */
export async function createBankAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const {
      bankKey,
      name,
      accountType = 'Conta Corrente',
      agency,
      accountNumber,
      color,
      initialBalance = 0,
      ofxContent,
      statementContent,
      fileType = 'ofx',
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'O nome da conta bancária é obrigatório.' });
      return;
    }

    const defaultColor = color || getDefaultColorForBank(bankKey || 'other');
    let balance = parseFloat(initialBalance) || 0;
    let initialTransactions: any[] = [];

    // If initial statement (OFX, CSV, PDF) was provided during creation, parse it
    const rawStatement = statementContent || ofxContent;
    if (rawStatement && typeof rawStatement === 'string') {
      try {
        let detectedType: 'ofx' | 'csv' | 'pdf' = 'ofx';
        if (fileType && ['ofx', 'csv', 'pdf'].includes(fileType.toLowerCase())) {
          detectedType = fileType.toLowerCase() as any;
        } else if (rawStatement.includes('<OFX') || rawStatement.includes('OFXHEADER')) {
          detectedType = 'ofx';
        } else if (rawStatement.startsWith('data:application/pdf') || (rawStatement.length > 50 && rawStatement.slice(0, 50).includes('JVBERi0'))) {
          detectedType = 'pdf';
        } else {
          detectedType = 'csv';
        }

        const parsed = await parseStatementFile(rawStatement, detectedType);
        if (typeof parsed.ledgerBalance === 'number') {
          balance = parsed.ledgerBalance;
        } else if (parsed.transactions.length > 0) {
          const net = parsed.transactions.reduce(
            (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
            0
          );
          balance += net;
        }
        initialTransactions = parsed.transactions;
      } catch (e: any) {
        console.error('Initial statement parse failed during bank creation:', e);
        res.status(400).json({
          message: `Erro ao processar o extrato (${fileType || 'arquivo'}): ${e.message || 'Verifique o formato do arquivo'}`
        });
        return;
      }
    }

    const newAccount = await prisma.bankAccount.create({
      data: {
        userId,
        bankKey: bankKey || 'other',
        name: name.trim(),
        accountType: accountType.trim(),
        agency: agency ? agency.trim() : null,
        accountNumber: accountNumber ? accountNumber.trim() : null,
        color: defaultColor,
        connectionType: 'OFX',
        balance: Math.round(balance * 100) / 100,
        initialBalance: parseFloat(initialBalance) || 0,
        lastSyncAt: new Date(),
      },
    });

    // Save initial transactions if any
    if (initialTransactions.length > 0) {
      await prisma.bankTransaction.createMany({
        data: initialTransactions.map((t) => ({
          bankAccountId: newAccount.id,
          userId,
          externalId: t.externalId,
          type: t.type,
          amount: t.amount,
          description: t.description,
          category: t.category || 'Geral',
          date: t.date,
          paymentMethod: t.paymentMethod || 'OUTROS',
        })),
        skipDuplicates: true,
      });
    }

    res.status(201).json({
      success: true,
      message: initialTransactions.length > 0
        ? `Conta cadastrada com sucesso! ${initialTransactions.length} movimentações importadas.`
        : 'Conta bancária cadastrada com sucesso!',
      account: newAccount,
      importedCount: initialTransactions.length,
    });
  } catch (error: any) {
    console.error('Error in createBankAccount:', error);
    res.status(500).json({ message: 'Erro ao cadastrar conta bancária', error: error.message });
  }
}

/**
 * 4. Update bank account details
 */
export async function updateBankAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const {
      name,
      accountType,
      agency,
      accountNumber,
      color,
      initialBalance,
      balance,
    } = req.body;

    const existing = await prisma.bankAccount.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Conta bancária não encontrada.' });
      return;
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (accountType) updateData.accountType = accountType.trim();
    if (agency !== undefined) updateData.agency = agency ? agency.trim() : null;
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber ? accountNumber.trim() : null;
    if (color) updateData.color = color;
    if (initialBalance !== undefined) updateData.initialBalance = parseFloat(initialBalance) || 0;
    if (balance !== undefined) updateData.balance = parseFloat(balance) || 0;

    const updated = await prisma.bankAccount.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, message: 'Conta atualizada com sucesso!', account: updated });
  } catch (error: any) {
    console.error('Error in updateBankAccount:', error);
    res.status(500).json({ message: 'Erro ao atualizar conta bancária', error: error.message });
  }
}

/**
 * 5. Delete a bank account
 */
export async function deleteBankAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = await prisma.bankAccount.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      res.status(404).json({ message: 'Conta bancária não encontrada.' });
      return;
    }

    await prisma.bankAccount.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Conta bancária removida com sucesso.' });
  } catch (error: any) {
    console.error('Error in deleteBankAccount:', error);
    res.status(500).json({ message: 'Erro ao excluir conta bancária', error: error.message });
  }
}

/**
 * 6. Import OFX file to an account
 */
export async function importOfxToAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { statementContent, ofxContent, fileType = 'ofx' } = req.body;
    const raw = statementContent || ofxContent;

    if (!raw || typeof raw !== 'string') {
      res.status(400).json({ message: 'O arquivo de extrato (OFX, CSV ou PDF) é obrigatório.' });
      return;
    }

    const account = await prisma.bankAccount.findFirst({
      where: { id, userId },
    });

    if (!account) {
      res.status(404).json({ message: 'Conta bancária não encontrada.' });
      return;
    }

    let detectedType: 'ofx' | 'csv' | 'pdf' = 'ofx';
    if (fileType && ['ofx', 'csv', 'pdf'].includes(fileType.toLowerCase())) {
      detectedType = fileType.toLowerCase() as any;
    } else if (raw.includes('<OFX') || raw.includes('OFXHEADER')) {
      detectedType = 'ofx';
    } else if (raw.startsWith('data:application/pdf') || (raw.length > 50 && raw.slice(0, 50).includes('JVBERi0'))) {
      detectedType = 'pdf';
    } else {
      detectedType = 'csv';
    }

    const parsed = await parseStatementFile(raw, detectedType);

    // Save transactions with deduplication (skipDuplicates: true)
    let importedCount = 0;
    if (parsed.transactions.length > 0) {
      const result = await prisma.bankTransaction.createMany({
        data: parsed.transactions.map((t) => ({
          bankAccountId: account.id,
          userId,
          externalId: t.externalId,
          type: t.type,
          amount: t.amount,
          description: t.description,
          category: t.category,
          date: t.date,
          paymentMethod: t.paymentMethod,
        })),
        skipDuplicates: true,
      });
      importedCount = result.count;
    }

    // Determine new balance
    let newBalance = account.balance;
    if (typeof parsed.ledgerBalance === 'number') {
      newBalance = parsed.ledgerBalance;
    } else {
      // Recalculate balance from all transactions
      const allTx = await prisma.bankTransaction.findMany({
        where: { bankAccountId: account.id },
      });
      const net = allTx.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
      newBalance = (account.initialBalance || 0) + net;
    }

    await prisma.bankAccount.update({
      where: { id },
      data: {
        balance: Math.round(newBalance * 100) / 100,
        lastSyncAt: new Date(),
        status: 'active',
      },
    });

    res.json({
      success: true,
      message: `${importedCount} novas transações importadas com sucesso!`,
      importedCount,
      totalParsed: parsed.transactions.length,
      newBalance: Math.round(newBalance * 100) / 100,
    });
  } catch (error: any) {
    console.error('Error in importOfxToAccount:', error);
    res.status(500).json({ message: `Erro ao importar arquivo OFX: ${error.message}` });
  }
}

/**
 * 7. Delete a specific transaction
 */
export async function deleteBankTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const tx = await prisma.bankTransaction.findFirst({
      where: { id, userId },
    });

    if (!tx) {
      res.status(404).json({ message: 'Transação não encontrada.' });
      return;
    }

    await prisma.bankTransaction.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Transação excluída com sucesso.' });
  } catch (error: any) {
    console.error('Error in deleteBankTransaction:', error);
    res.status(500).json({ message: 'Erro ao excluir transação', error: error.message });
  }
}
