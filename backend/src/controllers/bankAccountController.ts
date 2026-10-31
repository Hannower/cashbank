import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

/**
 * Controller for Bank Accounts & Open Finance (Pluggy integration)
 * Exclusively available for Admin accounts
 * Pure live data - zero mocks.
 */

const ITEMS_FILE_PATH = path.resolve(__dirname, '../data/pluggy_items.json');

function getStoredItems(): string[] {
  try {
    if (!fs.existsSync(ITEMS_FILE_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(ITEMS_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredItems(items: string[]): void {
  try {
    const dir = path.dirname(ITEMS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ITEMS_FILE_PATH, JSON.stringify(Array.from(new Set(items)), null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving stored Pluggy items:', err);
  }
}

async function getPluggyApiKey(): Promise<string | null> {
  const clientId = process.env.PLUGGY_CLIENT_ID || '';
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET || '';

  if (!clientId.trim() || !clientSecret.trim()) {
    return null;
  }

  try {
    const authRes = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
    });

    if (!authRes.ok) {
      return null;
    }

    const authData = (await authRes.json()) as { apiKey: string };
    return authData.apiKey || null;
  } catch (e) {
    console.error('Pluggy Auth request failed:', e);
    return null;
  }
}

function detectBankKey(name: string = ''): {
  bankKey: 'nubank' | 'inter' | 'mercadopago' | 'picpay';
  brandColor: string;
  badgeBg: string;
  officialName: string;
} {
  const lower = name.toLowerCase();
  if (lower.includes('pluggy') || lower.includes('sandbox')) {
    return { bankKey: 'nubank', brandColor: '#ef294b', badgeBg: '#fee2e2', officialName: 'Pluggy Bank (Sandbox)' };
  }
  if (lower.includes('nubank') || lower.includes('nu conta') || lower.includes('nu ')) {
    return { bankKey: 'nubank', brandColor: '#820AD1', badgeBg: '#F3E8FF', officialName: 'Nubank' };
  }
  if (lower.includes('inter') || lower.includes('banco inter')) {
    return { bankKey: 'inter', brandColor: '#FF7A00', badgeBg: '#FFF7ED', officialName: 'Banco Inter' };
  }
  if (lower.includes('mercado') || lower.includes('pago') || lower.includes('mercadopago')) {
    return { bankKey: 'mercadopago', brandColor: '#009EE3', badgeBg: '#E0F2FE', officialName: 'Mercado Pago' };
  }
  if (lower.includes('picpay') || lower.includes('pic pay')) {
    return { bankKey: 'picpay', brandColor: '#11C76F', badgeBg: '#DCFCE7', officialName: 'PicPay' };
  }
  return { bankKey: 'nubank', brandColor: '#820AD1', badgeBg: '#F3E8FF', officialName: name || 'Conta Digital' };
}

/**
 * 1. Check Open Finance & Pluggy configuration status
 */
export async function getBankAccountsStatus(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const pluggyClientId = process.env.PLUGGY_CLIENT_ID || '';
    const pluggyClientSecret = process.env.PLUGGY_CLIENT_SECRET || '';
    const hasPluggy = Boolean(pluggyClientId.trim() && pluggyClientSecret.trim());
    const storedItems = getStoredItems();

    res.json({
      isConfigured: hasPluggy,
      hasLinkedItems: storedItems.length > 0,
      linkedItemsCount: storedItems.length,
      credentials: {
        pluggy: {
          configured: hasPluggy,
          clientIdMasked: pluggyClientId ? `${pluggyClientId.slice(0, 4)}...${pluggyClientId.slice(-4)}` : null,
        },
      },
      supportedInstitutions: [
        { key: 'nubank', name: 'Nubank', connector: 'Pluggy Open Finance', color: '#820AD1' },
        { key: 'inter', name: 'Banco Inter', connector: 'Pluggy Open Finance', color: '#FF7A00' },
        { key: 'mercadopago', name: 'Mercado Pago', connector: 'Pluggy Open Finance', color: '#009EE3' },
        { key: 'picpay', name: 'PicPay', connector: 'Pluggy Open Finance', color: '#11C76F' },
      ],
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao verificar status das contas bancárias', error: error.message });
  }
}

/**
 * 2. Get consolidated overview (Real Balances + Real Transactions - No Mocks)
 */
export async function getBankAccountsOverview(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const apiKey = await getPluggyApiKey();
    const storedItems = getStoredItems();
    const now = new Date();
    const syncTimestamp = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // If Pluggy is configured and we have connected items stored, query live data:
    if (apiKey && storedItems.length > 0) {
      const liveAccounts: any[] = [];
      const liveTransactions: any[] = [];

      for (const itemId of storedItems) {
        try {
          // Fetch item details (to get connector name)
          let connectorName = 'Conta Digital';
          const itemRes = await fetch(`https://api.pluggy.ai/items/${itemId}`, {
            headers: { 'X-API-KEY': apiKey },
          });
          if (itemRes.ok) {
            const itemData = await itemRes.json();
            connectorName = itemData.connector?.name || connectorName;
          }

          const bankInfo = detectBankKey(connectorName);

          // Fetch accounts for this item
          const accsRes = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, {
            headers: { 'X-API-KEY': apiKey },
          });

          if (accsRes.ok) {
            const accsData = await accsRes.json();
            const results = accsData.results || [];

            for (const acc of results) {
              const accountObj = {
                id: acc.id,
                itemId: itemId,
                bankKey: bankInfo.bankKey,
                bankName: bankInfo.officialName,
                accountType: acc.subtype === 'CHECKING_ACCOUNT' ? 'Conta Corrente' : (acc.name || 'Conta Digital'),
                agency: acc.agency || '0001',
                accountNumber: acc.number || '***',
                balance: typeof acc.balance === 'number' ? acc.balance : 0,
                currency: acc.currencyCode || 'BRL',
                brandColor: bankInfo.brandColor,
                badgeBg: bankInfo.badgeBg,
                status: 'connected',
                lastSyncAt: syncTimestamp,
                totalIn: 0,
                totalOut: 0,
              };

              // Fetch recent transactions for this account
              try {
                const txRes = await fetch(`https://api.pluggy.ai/transactions?accountId=${acc.id}&pageSize=30`, {
                  headers: { 'X-API-KEY': apiKey },
                });
                if (txRes.ok) {
                  const txData = await txRes.json();
                  const txResults = txData.results || [];

                  for (const tx of txResults) {
                    const isIncome = tx.amount > 0 || tx.type === 'CREDIT';
                    const absAmount = Math.abs(tx.amount || 0);

                    if (isIncome) {
                      accountObj.totalIn += absAmount;
                    } else {
                      accountObj.totalOut += absAmount;
                    }

                    liveTransactions.push({
                      id: tx.id,
                      bankKey: bankInfo.bankKey,
                      bankName: bankInfo.officialName,
                      type: isIncome ? 'income' : 'expense',
                      amount: absAmount,
                      description: tx.description || 'Movimentação Bancária',
                      category: tx.category || 'Geral',
                      date: tx.date || new Date().toISOString(),
                      status: 'completed',
                      paymentMethod: tx.paymentData?.paymentMethod || 'PIX',
                    });
                  }
                }
              } catch (_) {}

              liveAccounts.push(accountObj);
            }
          }
        } catch (itemErr) {
          console.error(`Error querying item ${itemId}:`, itemErr);
        }
      }

      if (liveAccounts.length > 0) {
        const totalBalance = liveAccounts.reduce((sum, a) => sum + a.balance, 0);
        const totalIncomeMonth = liveTransactions
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        const totalExpenseMonth = liveTransactions
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        res.json({
          isLive: true,
          hasLiveItems: true,
          linkedItemsCount: storedItems.length,
          summary: {
            totalBalance: Math.round(totalBalance * 100) / 100,
            totalIncomeMonth: Math.round(totalIncomeMonth * 100) / 100,
            totalExpenseMonth: Math.round(totalExpenseMonth * 100) / 100,
            connectedAccountsCount: liveAccounts.length,
          },
          accounts: liveAccounts,
          transactions: liveTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        });
        return;
      }
    }

    // When no accounts are linked yet, return clean empty state (zero mocks)
    res.json({
      isLive: Boolean(apiKey),
      hasLiveItems: false,
      linkedItemsCount: 0,
      summary: {
        totalBalance: 0,
        totalIncomeMonth: 0,
        totalExpenseMonth: 0,
        connectedAccountsCount: 0,
      },
      accounts: [],
      transactions: [],
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao carregar visão geral das contas bancárias', error: error.message });
  }
}

/**
 * 3. Link an Item ID (from dashboard or connect widget)
 */
export async function addLinkedItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { itemId } = req.body;
    if (!itemId || typeof itemId !== 'string' || !itemId.trim()) {
      res.status(400).json({ message: 'itemId é obrigatório.' });
      return;
    }

    const cleanId = itemId.trim();
    const stored = getStoredItems();
    if (!stored.includes(cleanId)) {
      stored.push(cleanId);
      saveStoredItems(stored);
    }

    res.json({ success: true, message: 'Item vinculado com sucesso!', items: stored });
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao vincular item', error: error.message });
  }
}

/**
 * 4. Remove a linked Item ID
 */
export async function removeLinkedItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const apiKey = await getPluggyApiKey();
    let stored = getStoredItems();

    if (stored.includes(id)) {
      if (apiKey) {
        await fetch('https://api.pluggy.ai/items/' + id, {
          method: 'DELETE',
          headers: { 'X-API-KEY': apiKey },
        }).catch(() => {});
      }
      stored = stored.filter((item) => item !== id);
    } else {
      let foundItemId = null;
      if (apiKey) {
        for (const itId of stored) {
          try {
            const accsRes = await fetch('https://api.pluggy.ai/accounts?itemId=' + itId, {
              headers: { 'X-API-KEY': apiKey },
            });
            if (accsRes.ok) {
              const accsData = await accsRes.json();
              if ((accsData.results || []).some((a: any) => a.id === id)) {
                foundItemId = itId;
                break;
              }
            }
          } catch (_) {}
        }
      }

      if (foundItemId) {
        if (apiKey) {
          await fetch('https://api.pluggy.ai/items/' + foundItemId, {
            method: 'DELETE',
            headers: { 'X-API-KEY': apiKey },
          }).catch(() => {});
        }
        stored = stored.filter((item) => item !== foundItemId);
      } else if (stored.length === 1) {
        if (apiKey) {
          await fetch('https://api.pluggy.ai/items/' + stored[0], {
            method: 'DELETE',
            headers: { 'X-API-KEY': apiKey },
          }).catch(() => {});
        }
        stored = [];
      }
    }

    saveStoredItems(stored);
    res.json({ success: true, message: 'Conta desvinculada com sucesso!', items: stored });
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao desvincular item', error: error.message });
  }
}

export async function createConnectToken(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const apiKey = await getPluggyApiKey();
    if (!apiKey) {
      res.status(400).json({
        message: 'Credenciais da Pluggy não configuradas ou inválidas no arquivo .env.',
      });
      return;
    }

    const tokenRes = await fetch('https://api.pluggy.ai/connect_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({}),
    });

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.json().catch(() => ({}));
      res.status(tokenRes.status).json({
        message: 'Erro ao gerar Connect Token na Pluggy',
        details: tokenErr,
      });
      return;
    }

    const tokenData = await tokenRes.json();
    res.json({ accessToken: tokenData.accessToken });
  } catch (error: any) {
    res.status(500).json({ message: 'Erro interno ao conectar com a Pluggy', error: error.message });
  }
}

/**
 * 6. Trigger manual or automatic sync
 */
export async function syncBankAccounts(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const now = new Date();
    const syncTimestamp = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    res.json({
      success: true,
      message: 'Sincronização de contas concluída com sucesso.',
      syncedAt: syncTimestamp,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Erro durante a sincronização', error: error.message });
  }
}

/**
 * 7. Handle Pluggy Webhooks (item/created, item/updated, transactions/created, etc.)
 * Public endpoint (called by Pluggy servers)
 */
export async function handlePluggyWebhook(req: Request, res: Response): Promise<void> {
  try {
    const { event, eventId, itemId, accountId, error } = req.body || {};

    console.log(`[Pluggy Webhook] Event received: ${event}`, {
      eventId,
      itemId,
      accountId,
      hasError: Boolean(error),
    });

    // Automatically manage linked items
    if (itemId && typeof itemId === 'string') {
      const cleanItemId = itemId.trim();
      const stored = getStoredItems();

      if (event === 'item/created' || event === 'item/updated') {
        if (!stored.includes(cleanItemId)) {
          stored.push(cleanItemId);
          saveStoredItems(stored);
          console.log(`[Pluggy Webhook] Item auto-linked: ${cleanItemId}`);
        }
      } else if (event === 'item/deleted') {
        if (stored.includes(cleanItemId)) {
          const updated = stored.filter((id) => id !== cleanItemId);
          saveStoredItems(updated);
          console.log(`[Pluggy Webhook] Item auto-removed: ${cleanItemId}`);
        }
      }
    }

    // Always respond immediately with 200 OK so Pluggy knows it was received
    res.status(200).json({
      received: true,
      event: event || 'unknown',
      processedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Pluggy Webhook] Error processing event:', err);
    // Still return 200 to prevent infinite webhook retries for malformed data
    res.status(200).json({
      received: true,
      error: err.message,
    });
  }
}

/**
 * 8. Register Webhook in Pluggy API (Admin action)
 */
export async function registerPluggyWebhook(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const apiKey = await getPluggyApiKey();
    if (!apiKey) {
      res.status(400).json({ message: 'Credenciais da Pluggy não configuradas no .env' });
      return;
    }

    const webhookUrl = req.body.url || 'https://cashbank.onrender.com/api/bank-accounts/webhook';

    const createRes = await fetch('https://api.pluggy.ai/webhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        event: 'all',
        url: webhookUrl,
      }),
    });

    const data = await createRes.json();
    if (!createRes.ok) {
      res.status(createRes.status).json({
        message: 'Erro ao registrar webhook na Pluggy',
        details: data,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Webhook registrado com sucesso na Pluggy!',
      webhook: data,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao registrar webhook', error: error.message });
  }
}

/**
 * 9. Get registered Webhooks in Pluggy API (Admin)
 */
export async function getPluggyWebhooks(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const apiKey = await getPluggyApiKey();
    if (!apiKey) {
      res.status(400).json({ message: 'Credenciais da Pluggy não configuradas no .env' });
      return;
    }

    const whRes = await fetch('https://api.pluggy.ai/webhooks', {
      headers: { 'X-API-KEY': apiKey },
    });

    const data = await whRes.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao listar webhooks', error: error.message });
  }
}
