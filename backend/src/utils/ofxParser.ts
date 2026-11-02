/**
 * OFX (Open Financial Exchange) Parser for Brazilian Banks
 * Supports Nubank, Banco Inter, PicPay, Itaú, Bradesco, Santander, Caixa, C6, etc.
 * Handles both SGML and XML style OFX files.
 */

export interface ParsedOfxTransaction {
  externalId: string;
  type: 'income' | 'expense';
  amount: number;
  date: Date;
  description: string;
  category: string;
  paymentMethod: string;
}

export interface ParsedOfxResult {
  bankId?: string;
  accountNumber?: string;
  accountType?: string;
  currency?: string;
  ledgerBalance?: number;
  balanceDate?: Date;
  transactions: ParsedOfxTransaction[];
}

function parseOfxDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  // Standard OFX date: YYYYMMDDHHMMSS or YYYYMMDD
  const clean = dateStr.trim();
  const year = parseInt(clean.substring(0, 4), 10);
  const month = parseInt(clean.substring(4, 6), 10) - 1;
  const day = parseInt(clean.substring(6, 8), 10);

  let hours = 12;
  let minutes = 0;
  let seconds = 0;

  if (clean.length >= 12) {
    hours = parseInt(clean.substring(8, 10), 10) || 12;
    minutes = parseInt(clean.substring(10, 12), 10) || 0;
    if (clean.length >= 14) {
      seconds = parseInt(clean.substring(12, 14), 10) || 0;
    }
  }

  const d = new Date(year, month, day, hours, minutes, seconds);
  return isNaN(d.getTime()) ? new Date() : d;
}

function extractTagValue(block: string, tag: string): string | null {
  // Matches <TAG>value or <TAG>value</TAG>
  const regex = new RegExp(`<${tag}>([^<\\r\\n]+)(?:<\\/${tag}>)?`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : null;
}

function inferCategory(memo: string): string {
  const m = memo.toUpperCase();
  if (m.includes('SALARIO') || m.includes('PROVENTOS') || m.includes('REMUNERACAO')) return 'Salário';
  if (m.includes('IFOOD') || m.includes('PADARIA') || m.includes('MERCADO') || m.includes('SUPERMERCADO') ||
      m.includes('RESTAURANTE') || m.includes('BURGER') || m.includes('PIZZA') || m.includes('LANCHE') ||
      m.includes('AÇOUGUE') || m.includes('PAO') || m.includes('CAFE') || m.includes('BAR ')) return 'Alimentação';
  if (m.includes('UBER') || m.includes('99APP') || m.includes('POSTO') || m.includes('COMBUSTIVEL') ||
      m.includes('SHELL') || m.includes('IPIRANGA') || m.includes('ESTACIONAMENTO') || m.includes('PEDAGIO')) return 'Transporte';
  if (m.includes('FARMACIA') || m.includes('DROGARIA') || m.includes('DROGASIL') || m.includes('CONSULTA') ||
      m.includes('EXAME') || m.includes('HOSPITAL') || m.includes('ODONTO') || m.includes('MEDIC')) return 'Saúde';
  if (m.includes('NETFLIX') || m.includes('SPOTIFY') || m.includes('CINEMA') || m.includes('STEAM') ||
      m.includes('PLAYSTATION') || m.includes('PRIME VIDEO') || m.includes('DISNEY')) return 'Lazer';
  if (m.includes('ENEL') || m.includes('LUZ') || m.includes('ENERGIA') || m.includes('SABESP') ||
      m.includes('AGUA') || m.includes('INTERNET') || m.includes('CLARO') || m.includes('VIVO') ||
      m.includes('TIM') || m.includes('CONDOMINIO') || m.includes('ALUGUEL')) return 'Moradia';
  if (m.includes('PIX') || m.includes('TRANSFERENCIA') || m.includes('TRANSF') || m.includes('TED')) return 'Transferência';
  if (m.includes('BOLETO') || m.includes('TITULO') || m.includes('PAGAMENTO COBRANCA')) return 'Contas Fixas';
  return 'Geral';
}

function inferPaymentMethod(memo: string): string {
  const m = memo.toUpperCase();
  if (m.includes('PIX')) return 'PIX';
  if (m.includes('TED') || m.includes('DOC')) return 'TED';
  if (m.includes('BOLETO') || m.includes('TITULO')) return 'BOLETO';
  if (m.includes('DEBITO') || m.includes('COMPRA CARTAO') || m.includes('MAQUININHA')) return 'DEBITO';
  if (m.includes('TRANSFERENCIA') || m.includes('TRANSF')) return 'TRANSFERENCIA';
  return 'OUTROS';
}

export function parseOfx(rawContent: string): ParsedOfxResult {
  if (!rawContent || typeof rawContent !== 'string') {
    throw new Error('Conteúdo do arquivo OFX inválido ou vazio.');
  }

  // Account details
  const bankId = extractTagValue(rawContent, 'BANKID') || undefined;
  const accountNumber = extractTagValue(rawContent, 'ACCTID') || undefined;
  const accountType = extractTagValue(rawContent, 'ACCTTYPE') || undefined;
  const currency = extractTagValue(rawContent, 'CURDEF') || 'BRL';

  // Ledger balance
  let ledgerBalance: number | undefined = undefined;
  const balStr = extractTagValue(rawContent, 'BALAMT');
  if (balStr) {
    const parsed = parseFloat(balStr.replace(',', '.'));
    if (!isNaN(parsed)) {
      ledgerBalance = parsed;
    }
  }

  let balanceDate: Date | undefined = undefined;
  const balDateStr = extractTagValue(rawContent, 'DTASOF');
  if (balDateStr) {
    balanceDate = parseOfxDate(balDateStr);
  }

  // Transactions extraction
  const transactions: ParsedOfxTransaction[] = [];
  const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;

  while ((match = trnRegex.exec(rawContent)) !== null) {
    const trnBlock = match[1];

    const trnTypeRaw = (extractTagValue(trnBlock, 'TRNTYPE') || '').toUpperCase();
    const dtPostedRaw = extractTagValue(trnBlock, 'DTPOSTED') || '';
    const trnAmtRaw = extractTagValue(trnBlock, 'TRNAMT') || '0';
    const fitIdRaw = extractTagValue(trnBlock, 'FITID') || '';
    const memoRaw = extractTagValue(trnBlock, 'MEMO') || extractTagValue(trnBlock, 'NAME') || 'Transação Bancária';

    const rawAmt = parseFloat(trnAmtRaw.replace(',', '.'));
    if (isNaN(rawAmt)) continue;

    const isExpense = rawAmt < 0 || trnTypeRaw === 'DEBIT';
    const amount = Math.abs(rawAmt);
    const date = parseOfxDate(dtPostedRaw);
    const externalId = fitIdRaw || `ofx-${date.getTime()}-${Math.random().toString(36).substring(2, 8)}`;

    transactions.push({
      externalId,
      type: isExpense ? 'expense' : 'income',
      amount: Math.round(amount * 100) / 100,
      date,
      description: memoRaw.trim(),
      category: inferCategory(memoRaw),
      paymentMethod: inferPaymentMethod(memoRaw),
    });
  }

  return {
    bankId,
    accountNumber,
    accountType,
    currency,
    ledgerBalance,
    balanceDate,
    transactions,
  };
}

