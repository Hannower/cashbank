import { parseOfx, ParsedOfxResult } from './ofxParser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PDFParse } from 'pdf-parse';

export interface ParsedStatementResult {
  bankId?: string;
  accountNumber?: string;
  accountType?: string;
  currency?: string;
  ledgerBalance?: number;
  balanceDate?: Date;
  transactions: Array<{
    externalId: string;
    type: 'income' | 'expense';
    amount: number;
    date: Date;
    description: string;
    category: string;
    paymentMethod: string;
  }>;
}

const CANDIDATE_GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-pro-latest',
];

/**
 * Resilient Gemini AI caller with automatic model fallback
 */
async function callGeminiAiWithFallback(
  promptOrParts: any,
  apiKey: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: any = null;

  for (const modelName of CANDIDATE_GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(promptOrParts);
      const text = result?.response?.text();
      if (text && text.trim().length > 0) {
        return text.trim();
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Fallback] Model ${modelName} failed: ${err.message}`);
    }
  }

  throw new Error(`Falha no serviço Gemini AI: ${lastError?.message || 'Serviço temporariamente indisponível'}`);
}

/**
 * Month abbreviation map for Brazilian bank dates (ex: "15 OUT 2026")
 */
const PT_MONTHS: Record<string, number> = {
  jan: 0,
  fev: 1,
  mar: 2,
  abr: 3,
  mai: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  set: 8,
  out: 9,
  nov: 10,
  dez: 11,
};

function parseBrazilianDate(str: string): Date | null {
  const clean = str.trim().toLowerCase();

  // Case 1: DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY or DD/MM
  const slashMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    let year = slashMatch[3] ? parseInt(slashMatch[3], 10) : new Date().getFullYear();
    if (year < 100) year += 2000;
    const d = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // Case 2: DD MMM YYYY or DD MMM (ex: "15 out 2026", "02 nov")
  const textMatch = clean.match(/^(\d{1,2})\s+([a-z]{3})(?:\s+(\d{2,4}))?$/);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const mStr = textMatch[2];
    let year = textMatch[3] ? parseInt(textMatch[3], 10) : new Date().getFullYear();
    if (year < 100) year += 2000;
    if (PT_MONTHS[mStr] !== undefined) {
      const d = new Date(year, PT_MONTHS[mStr], day, 12, 0, 0);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

/**
 * 1. High-Speed Local Regex Extractor for Brazilian Bank Text
 * Parses statement lines directly in milliseconds without external APIs.
 */
export function parseTextBankStatementLocally(rawText: string): ParsedStatementResult | null {
  if (!rawText || typeof rawText !== 'string') return null;

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return null;

  const transactions: ParsedStatementResult['transactions'] = [];
  let ledgerBalance: number | undefined = undefined;

  // 1. Balance keywords searched bottom-up (most recent final balance is usually near bottom)
  const balanceKeywords = [
    'saldo atual',
    'saldo final',
    'saldo disponível',
    'saldo disponivel',
    'saldo em conta',
    'saldo total',
    'saldo líquido',
    'saldo liquido',
    'saldo do dia',
    'dinheiro disponível',
    'dinheiro disponivel',
    'saldo em conta corrente',
  ];

  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].toLowerCase();
    for (const kw of balanceKeywords) {
      if (l.includes(kw)) {
        const valMatch = lines[i].match(/(?:R\$\s*)?([+-]?\s*\d{1,3}(?:\.\d{3})*,\d{2}|\b\d+,\d{2}\b)/);
        if (valMatch) {
          const num = parseFloat(valMatch[1].replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
          if (!isNaN(num) && ledgerBalance === undefined) {
            ledgerBalance = num;
            break;
          }
        }
      }
    }
    if (ledgerBalance !== undefined) break;
  }

  // 2. Date and monetary value pattern matching
  const datePattern = /(\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b|\b\d{1,2}\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)(?:\s+\d{2,4})?\b)/i;
  const moneyPattern = /(?:(R\$\s*)?([+-]?\s*\d{1,3}(?:\.\d{3})*,\d{2}|\b\d+,\d{2}\b)\s*([CD+-])?|\((?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})\))/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Skip lines that represent only account headers or balance summaries
    if (balanceKeywords.some((kw) => lower.startsWith(kw) || lower.includes('saldo anterior'))) {
      continue;
    }

    const dMatch = line.match(datePattern);
    if (!dMatch) continue;

    const dateVal = parseBrazilianDate(dMatch[0]);
    if (!dateVal) continue;

    const withoutDate = line.replace(dMatch[0], '').trim();
    const mMatch = withoutDate.match(moneyPattern);
    if (!mMatch) continue;

    let amount = 0;
    let isExpense = false;

    if (mMatch[4]) {
      // (123,45) format -> expense
      amount = parseFloat(mMatch[4].replace(/\./g, '').replace(',', '.'));
      isExpense = true;
    } else {
      const valStr = mMatch[2];
      const signOrSuffix = mMatch[3] || '';
      amount = Math.abs(parseFloat(valStr.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')));

      if (valStr.includes('-') || signOrSuffix === '-' || signOrSuffix.toUpperCase() === 'D') {
        isExpense = true;
      } else if (valStr.includes('+') || signOrSuffix === '+' || signOrSuffix.toUpperCase() === 'C') {
        isExpense = false;
      } else {
        const u = withoutDate.toUpperCase();
        if (
          u.includes('PAG') ||
          u.includes('COMPRA') ||
          u.includes('ENVIAD') ||
          u.includes('SAQUE') ||
          u.includes('DEBITO') ||
          u.includes('TARIFA') ||
          u.includes('FATURA') ||
          u.includes('BOLETO') ||
          u.includes('TRANSFERENCIA ENVIADA')
        ) {
          isExpense = true;
        } else if (
          u.includes('RECEB') ||
          u.includes('SALARIO') ||
          u.includes('RENDIMENTO') ||
          u.includes('CREDITO') ||
          u.includes('DEPOSITO') ||
          u.includes('ESTORNO') ||
          u.includes('TRANSFERENCIA RECEBIDA') ||
          u.includes('PROVENT') ||
          u.includes('VENDA APROVADA')
        ) {
          isExpense = false;
        } else {
          isExpense = true;
        }
      }
    }

    if (isNaN(amount) || amount <= 0) continue;

    const desc = withoutDate
      .replace(mMatch[0], '')
      .replace(/^[-\s:|]+/, '')
      .replace(/[-\s:|]+$/, '')
      .trim() || 'Movimentação Bancária';

    const dateStr = dateVal.toISOString().split('T')[0];
    const externalId = `pdf-${dateStr}-${amount.toFixed(2)}-${transactions.length}-${desc.slice(0, 15).replace(/[^a-zA-Z0-9]/g, '')}`;

    transactions.push({
      externalId,
      type: isExpense ? 'expense' : 'income',
      amount: Math.round(amount * 100) / 100,
      date: dateVal,
      description: desc,
      category: inferCategory(desc),
      paymentMethod: inferPaymentMethod(desc),
    });
  }

  if (transactions.length === 0) return null;

  // If no explicit balance was extracted from text, calculate net of transactions
  if (ledgerBalance === undefined) {
    const net = transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
    ledgerBalance = Math.round(net * 100) / 100;
  }

  return {
    currency: 'BRL',
    ledgerBalance,
    transactions,
  };
}

/**
 * 2. AI Fallback Parser using Google Gemini for unstructured or custom bank CSV/text files
 */
export async function parseStatementTextWithAi(rawText: string): Promise<ParsedStatementResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const local = parseTextBankStatementLocally(rawText);
    if (local && local.transactions.length > 0) return local;
    throw new Error('Chave GEMINI_API_KEY não configurada no servidor.');
  }

  const prompt = `Você é um extrator financeiro especialista em extratos de bancos brasileiros (PicPay, Nubank, Inter, Itaú, Bradesco, Santander, Mercado Pago, Caixa, C6, etc.).
Analise este texto de extrato ou demonstrativo bancário e extraia com precisão todas as movimentações e o saldo da conta.

Texto do extrato:
"""
${rawText.slice(0, 45000)}
"""

Retorne EXCLUSIVAMENTE um objeto JSON válido (sem tags markdown de código e sem texto adicional ao redor) no seguinte formato:
{
  "ledgerBalance": 1250.50, // saldo atual ou final da conta informado no documento (ou null se não houver saldo explícito)
  "transactions": [
    {
      "date": "2026-10-15", // data no formato YYYY-MM-DD
      "description": "Nome da despesa ou recebedor/pagador",
      "amount": 45.90, // valor numérico sempre positivo (ex: 45.90)
      "type": "expense", // "expense" para saídas/pagamentos/débitos ou "income" para entradas/recebimentos/créditos
      "category": "Alimentação", // categoria sugerida
      "paymentMethod": "PIX" // PIX, CARTAO, BOLETO, TED ou OUTROS
    }
  ]
}`;

  try {
    const responseText = await callGeminiAiWithFallback(prompt, apiKey);
    let jsonString = responseText.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(jsonString);

    const transactions: ParsedStatementResult['transactions'] = (parsed.transactions || []).map((t: any, idx: number) => {
      const d = t.date ? new Date(t.date + 'T12:00:00Z') : new Date();
      const amount = Math.abs(typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0);
      const desc = (t.description || 'Lançamento bancário').trim();
      const dateStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '2026-01-01';
      const externalId = `ai-${dateStr}-${amount.toFixed(2)}-${idx}-${desc.slice(0, 15).replace(/[^a-zA-Z0-9]/g, '')}`;

      return {
        externalId,
        type: t.type === 'income' ? 'income' : 'expense',
        amount: Math.round(amount * 100) / 100,
        date: isNaN(d.getTime()) ? new Date() : d,
        description: desc,
        category: t.category || inferCategory(desc),
        paymentMethod: t.paymentMethod || inferPaymentMethod(desc),
      };
    });

    return {
      currency: 'BRL',
      ledgerBalance: typeof parsed.ledgerBalance === 'number' ? Math.round(parsed.ledgerBalance * 100) / 100 : undefined,
      transactions,
    };
  } catch (err: any) {
    // If Gemini fails, fallback to local text parsing
    const local = parseTextBankStatementLocally(rawText);
    if (local && local.transactions.length > 0) return local;
    throw err;
  }
}

/**
 * 3. Robust CSV Parser for Bank Statements
 */
export async function parseCsvStatement(rawContent: string): Promise<ParsedStatementResult> {
  if (!rawContent || typeof rawContent !== 'string') {
    throw new Error('Conteúdo do arquivo CSV inválido ou vazio.');
  }

  try {
    const cleanContent = rawContent.replace(/^\uFEFF/, '').trim();
    const lines = cleanContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return await parseStatementTextWithAi(cleanContent);
    }

    // 1. Find the best header line among the first 25 lines
    const keywords = [
      'data',
      'date',
      'valor',
      'amount',
      'vlr',
      'descri',
      'hist',
      'saldo',
      'balance',
      'detalhe',
      'lança',
      'tipo',
      'saida',
      'saída',
      'entrada',
      'credito',
      'crédito',
      'debito',
      'débito',
      'operacao',
      'operação',
      'titulo',
      'título',
    ];

    let bestHeaderIdx = 0;
    let maxKeywordMatches = 0;

    for (let i = 0; i < Math.min(lines.length, 25); i++) {
      const lineLower = lines[i].toLowerCase();
      let matches = 0;
      for (const kw of keywords) {
        if (lineLower.includes(kw)) matches++;
      }
      if (matches > maxKeywordMatches) {
        maxKeywordMatches = matches;
        bestHeaderIdx = i;
      }
    }

    // If no reasonable header line was found, fallback directly to AI or local parser
    if (maxKeywordMatches < 2) {
      const local = parseTextBankStatementLocally(cleanContent);
      if (local && local.transactions.length > 0) return local;
      return await parseStatementTextWithAi(cleanContent);
    }

    const headerLine = lines[bestHeaderIdx];

    // Detect delimiter (; or , or \t)
    const semicolonCount = (headerLine.match(/;/g) || []).length;
    const commaCount = (headerLine.match(/,/g) || []).length;
    const tabCount = (headerLine.match(/\t/g) || []).length;

    let delimiter = ';';
    if (commaCount > semicolonCount && commaCount > tabCount) delimiter = ',';
    else if (tabCount > semicolonCount && tabCount > commaCount) delimiter = '\t';

    const headers = headerLine.split(delimiter).map((h) => h.replace(/["']/g, '').trim().toLowerCase());

    // Find column indices
    let dateIdx = headers.findIndex((h) => h.includes('data') || h.includes('date'));
    let amountIdx = headers.findIndex((h) => h.includes('valor') || h.includes('amount') || h.includes('vlr'));
    let descIdx = headers.findIndex(
      (h) =>
        h.includes('descri') ||
        h.includes('hist') ||
        h.includes('titulo') ||
        h.includes('título') ||
        h.includes('title') ||
        h.includes('lança') ||
        h.includes('detalhe') ||
        h.includes('operacao') ||
        h.includes('operação') ||
        h.includes('origem') ||
        h.includes('estabelecimento')
    );
    let saldoIdx = headers.findIndex((h) => h.includes('saldo') || h.includes('balance'));
    let typeIdx = headers.findIndex((h) => h === 'tipo' || h.includes('tipo') || h === 'd/c' || h === 'dc');
    let incomeIdx = headers.findIndex((h) => h.includes('entrada') || h.includes('credito') || h.includes('crédito'));
    let expenseIdx = headers.findIndex((h) => h.includes('saida') || h.includes('saída') || h.includes('debito') || h.includes('débito'));
    let idIdx = headers.findIndex((h) => h.includes('id') || h.includes('identificador') || h.includes('doc'));

    if (dateIdx === -1) dateIdx = 0;
    if (descIdx === -1) descIdx = headers.length > 1 ? 1 : 0;
    if (amountIdx === -1 && incomeIdx === -1 && expenseIdx === -1) {
      amountIdx = headers.length > 2 ? 2 : 1;
    }

    const transactions: ParsedStatementResult['transactions'] = [];
    let calculatedNet = 0;
    let lastFoundSaldo: number | undefined = undefined;

    for (let i = bestHeaderIdx + 1; i < lines.length; i++) {
      const row = lines[i];
      const cols = row.split(delimiter).map((c) => c.replace(/["']/g, '').trim());
      if (cols.length < 2) continue;

      const rawDate = cols[dateIdx] || '';
      const rawDesc = descIdx !== -1 && cols[descIdx] ? cols[descIdx] : 'Lançamento bancário';
      const rawId = idIdx !== -1 ? cols[idIdx] : '';

      // Check balance column if exists
      if (saldoIdx !== -1 && cols[saldoIdx]) {
        const parsedSaldo = parseNumber(cols[saldoIdx]);
        if (!isNaN(parsedSaldo)) {
          lastFoundSaldo = parsedSaldo;
        }
      }

      // Determine amount and type
      let numAmt = 0;
      let isExpense = false;

      if (incomeIdx !== -1 && expenseIdx !== -1) {
        const inAmt = parseNumber(cols[incomeIdx]);
        const outAmt = parseNumber(cols[expenseIdx]);
        if (!isNaN(inAmt) && inAmt > 0) {
          numAmt = inAmt;
          isExpense = false;
        } else if (!isNaN(outAmt) && outAmt > 0) {
          numAmt = outAmt;
          isExpense = true;
        } else {
          continue;
        }
      } else if (amountIdx !== -1 && cols[amountIdx]) {
        const parsedVal = parseNumber(cols[amountIdx]);
        if (isNaN(parsedVal) || parsedVal === 0) continue;

        if (parsedVal < 0) {
          numAmt = Math.abs(parsedVal);
          isExpense = true;
        } else {
          numAmt = parsedVal;
          if (typeIdx !== -1 && cols[typeIdx]) {
            const tVal = cols[typeIdx].toLowerCase();
            isExpense = tVal.includes('deb') || tVal.includes('sai') || tVal === 'd' || tVal === '-';
          } else {
            const dLower = rawDesc.toLowerCase();
            isExpense =
              dLower.includes('compra') ||
              dLower.includes('pagamento') ||
              dLower.includes('pagto') ||
              dLower.includes('saque') ||
              dLower.includes('tarifa') ||
              dLower.includes('deb') ||
              dLower.includes('fatura');
          }
        }
      } else {
        continue;
      }

      const txDate = parseCsvDate(rawDate);
      const roundedAmt = Math.round(numAmt * 100) / 100;

      calculatedNet += isExpense ? -roundedAmt : roundedAmt;

      const dateStr = !isNaN(txDate.getTime()) ? txDate.toISOString().split('T')[0] : '2026-01-01';
      const cleanDesc = rawDesc.replace(/\s+/g, ' ').trim();
      const externalId =
        rawId && rawId.length > 3
          ? `csv-${rawId}`
          : `csv-${dateStr}-${roundedAmt.toFixed(2)}-${transactions.length}-${cleanDesc.slice(0, 15).replace(/[^a-zA-Z0-9]/g, '')}`;

      transactions.push({
        externalId,
        type: isExpense ? 'expense' : 'income',
        amount: roundedAmt,
        date: txDate,
        description: cleanDesc,
        category: inferCategory(cleanDesc),
        paymentMethod: inferPaymentMethod(cleanDesc),
      });
    }

    if (transactions.length === 0) {
      const local = parseTextBankStatementLocally(cleanContent);
      if (local && local.transactions.length > 0) return local;
      return await parseStatementTextWithAi(cleanContent);
    }

    return {
      currency: 'BRL',
      ledgerBalance: lastFoundSaldo !== undefined ? Math.round(lastFoundSaldo * 100) / 100 : Math.round(calculatedNet * 100) / 100,
      transactions,
    };
  } catch (err: any) {
    console.warn('[CSV Parser] Heuristic parsing failed, trying local & AI fallback:', err.message);
    const local = parseTextBankStatementLocally(rawContent);
    if (local && local.transactions.length > 0) return local;
    return await parseStatementTextWithAi(rawContent);
  }
}

/**
 * 4. High-Performance PDF Parser for Bank Statements
 * - First extracts plain text via pdf-parse in milliseconds
 * - Runs high-speed local regex parser for Brazilian bank statements
 * - Falls back to Google Gemini AI (text or multimodal) if layout is complex
 */
export async function parsePdfStatement(pdfBase64: string): Promise<ParsedStatementResult> {
  const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').trim();
  const pdfBuffer = Buffer.from(cleanBase64, 'base64');

  // Step 1: Extract text from PDF directly using pdf-parse
  let extractedText = '';
  try {
    const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
    const textRes = await parser.getText();
    await parser.destroy();
    extractedText = textRes?.text?.trim() || '';
  } catch (e: any) {
    console.warn('[PDF Parser] pdf-parse extraction error:', e.message);
  }

  // Step 2: If we have text, run local regex parser first (instant, 10-20ms)
  if (extractedText && extractedText.length > 20) {
    const localResult = parseTextBankStatementLocally(extractedText);
    if (localResult && localResult.transactions.length > 0) {
      console.log(
        `[PDF Parser] Extracted ${localResult.transactions.length} transactions locally. Balance: R$ ${localResult.ledgerBalance}`
      );
      return localResult;
    }

    // Step 2b: If local regex found 0 transactions, send text to Gemini AI
    try {
      console.log('[PDF Parser] Sending extracted PDF text to Gemini AI...');
      return await parseStatementTextWithAi(extractedText);
    } catch (aiErr: any) {
      console.warn('[PDF Parser] AI text parsing failed:', aiErr.message);
      if (localResult && localResult.transactions.length > 0) {
        return localResult;
      }
    }
  }

  // Step 3: If extracted text was empty (scanned image PDF) or text parsing failed, send inline PDF to Gemini multimodal
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Não foi possível ler as transações do PDF. Certifique-se de que o arquivo é um extrato bancário oficial legível.');
  }

  const prompt = `Você é um extrator financeiro especialista em extratos e faturas bancárias do Brasil (Nubank, Inter, PicPay, Itaú, Bradesco, Santander, Mercado Pago, etc.).
Analise este documento em PDF de extrato bancário e extraia com precisão todas as movimentações financeiras e o saldo da conta.

Retorne EXCLUSIVAMENTE um objeto JSON válido (sem tags markdown de código e sem texto adicional ao redor) no seguinte formato:
{
  "ledgerBalance": 1250.50, // saldo atual ou final da conta informado no documento (ou null se não houver saldo explícito)
  "transactions": [
    {
      "date": "2026-10-15", // data no formato YYYY-MM-DD
      "description": "Nome da despesa ou estabelecimento",
      "amount": 45.90, // valor numérico sempre positivo (ex: 45.90)
      "type": "expense", // "expense" para saídas/débitos ou "income" para entradas/créditos
      "category": "Alimentação", // inferir categoria
      "paymentMethod": "PIX" // PIX, CARTAO, BOLETO, TED ou OUTROS
    }
  ]
}`;

  const responseText = await callGeminiAiWithFallback(
    [
      prompt,
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: cleanBase64,
        },
      },
    ],
    apiKey
  );

  let jsonString = responseText.trim();
  if (jsonString.startsWith('```json')) {
    jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(jsonString);

  const transactions: ParsedStatementResult['transactions'] = (parsed.transactions || []).map((t: any, idx: number) => {
    const d = t.date ? new Date(t.date + 'T12:00:00Z') : new Date();
    const amount = Math.abs(typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0);
    const desc = (t.description || 'Movimentação em PDF').trim();
    const dateStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '2026-01-01';
    const externalId = `pdf-${dateStr}-${amount.toFixed(2)}-${idx}-${desc.slice(0, 15).replace(/[^a-zA-Z0-9]/g, '')}`;

    return {
      externalId,
      type: t.type === 'income' ? 'income' : 'expense',
      amount: Math.round(amount * 100) / 100,
      date: isNaN(d.getTime()) ? new Date() : d,
      description: desc,
      category: t.category || inferCategory(desc),
      paymentMethod: t.paymentMethod || inferPaymentMethod(desc),
    };
  });

  let balance = typeof parsed.ledgerBalance === 'number' ? Math.round(parsed.ledgerBalance * 100) / 100 : undefined;
  if (balance === undefined && transactions.length > 0) {
    balance = Math.round(transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0) * 100) / 100;
  }

  return {
    currency: 'BRL',
    ledgerBalance: balance,
    transactions,
  };
}

/**
 * 5. Unified Dispatcher for all formats (OFX, CSV and PDF)
 */
export async function parseStatementFile(
  content: string,
  fileType: 'ofx' | 'csv' | 'pdf'
): Promise<ParsedStatementResult> {
  const type = fileType.toLowerCase();

  if (type === 'ofx') {
    return parseOfx(content);
  }

  if (type === 'csv') {
    return await parseCsvStatement(content);
  }

  if (type === 'pdf') {
    return await parsePdfStatement(content);
  }

  throw new Error(`Formato de arquivo não suportado: ${fileType}. Utilize .ofx, .csv ou .pdf.`);
}

function parseNumber(val: string): number {
  if (!val) return NaN;
  const clean = val.replace(/[R$\s]/g, '').trim();
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.indexOf('.') < clean.indexOf(',')) {
      return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
    } else {
      return parseFloat(clean.replace(/,/g, ''));
    }
  }
  if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.'));
  }
  return parseFloat(clean);
}

function parseCsvDate(rawDate: string): Date {
  if (!rawDate) return new Date();
  const parsed = parseBrazilianDate(rawDate);
  if (parsed) return parsed;
  const d = new Date(rawDate);
  return !isNaN(d.getTime()) ? d : new Date();
}

function inferCategory(memo: string): string {
  const m = memo.toUpperCase();
  if (m.includes('SALARIO') || m.includes('PROVENTOS') || m.includes('REMUNERACAO')) return 'Salário';
  if (
    m.includes('IFOOD') ||
    m.includes('PADARIA') ||
    m.includes('MERCADO') ||
    m.includes('SUPERMERCADO') ||
    m.includes('RESTAURANTE') ||
    m.includes('BURGER') ||
    m.includes('PIZZA') ||
    m.includes('LANCHE') ||
    m.includes('AÇOUGUE') ||
    m.includes('PAO') ||
    m.includes('CAFE') ||
    m.includes('BAR ')
  )
    return 'Alimentação';
  if (
    m.includes('UBER') ||
    m.includes('99APP') ||
    m.includes('POSTO') ||
    m.includes('COMBUSTIVEL') ||
    m.includes('SHELL') ||
    m.includes('IPIRANGA') ||
    m.includes('ESTACIONAMENTO') ||
    m.includes('PEDAGIO')
  )
    return 'Transporte';
  if (
    m.includes('FARMACIA') ||
    m.includes('DROGARIA') ||
    m.includes('DROGASIL') ||
    m.includes('CONSULTA') ||
    m.includes('EXAME') ||
    m.includes('HOSPITAL') ||
    m.includes('ODONTO') ||
    m.includes('MEDIC')
  )
    return 'Saúde';
  if (
    m.includes('NETFLIX') ||
    m.includes('SPOTIFY') ||
    m.includes('CINEMA') ||
    m.includes('STEAM') ||
    m.includes('PLAYSTATION') ||
    m.includes('PRIME VIDEO') ||
    m.includes('DISNEY')
  )
    return 'Lazer';
  if (
    m.includes('ENEL') ||
    m.includes('LUZ') ||
    m.includes('ENERGIA') ||
    m.includes('SABESP') ||
    m.includes('AGUA') ||
    m.includes('INTERNET') ||
    m.includes('CLARO') ||
    m.includes('VIVO') ||
    m.includes('TIM') ||
    m.includes('CONDOMINIO') ||
    m.includes('ALUGUEL')
  )
    return 'Moradia';
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
