import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { getUserFinancialContext, formatFinancialContextAsRAGText } from '../services/aiContextService';
import { AI_TOOL_DECLARATIONS, executeAiTool, ToolExecutionResult } from '../services/aiToolService';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.5-flash',
];

async function callGeminiApi(
  apiKey: string,
  payload: any
): Promise<{ ok: true; data: any; usedModel: string } | { ok: false; status: number; error: string; isRateLimit: boolean }> {
  let lastError = '';
  let lastStatus = 500;
  let isRateLimit = false;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return { ok: true, data, usedModel: model };
      }

      lastStatus = response.status;
      lastError = await response.text();

      if (response.status === 429) {
        isRateLimit = true;
        console.warn(`[Gemini Fallback] Modelo ${model} atingiu cota 429. Tentando próximo modelo...`);
        continue;
      }

      console.warn(`[Gemini Fallback] Modelo ${model} retornou ${response.status}: ${lastError}. Tentando próximo...`);
    } catch (e: any) {
      lastError = e.message;
      console.warn(`[Gemini Fallback] Erro ao chamar ${model}: ${e.message}`);
    }
  }

  return { ok: false, status: lastStatus, error: lastError, isRateLimit };
}

export async function chatWithAi(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ message: 'Mensagem não fornecida ou vazia.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        message: 'Chave GEMINI_API_KEY não configurada no servidor. Por favor, adicione sua chave nas variáveis de ambiente.',
      });
      return;
    }

    // 1. Build RAG Context from user's live financial data
    const financialCtx = await getUserFinancialContext(userId);
    const ragContextText = formatFinancialContextAsRAGText(financialCtx);

    const systemInstruction = `
Você é o CashAI, o assistente financeiro inteligente, empático e de alta precisão do CashBank.
Sua missão é ajudar ${financialCtx.userName} a ter total clareza e controle sobre seu dinheiro, tirar dúvidas sobre seus lançamentos, dar dicas práticas para atingir suas metas de poupança e executar ações quando solicitado.

REGRAS FUNDAMENTAIS:
1. BASE DE CONHECIMENTO (RAG) E PROJEÇÕES FUTURAS:
   - Abaixo estão os dados financeiros reais, atualizados em tempo real, do usuário.
   - Você tem acesso tanto ao mês corrente quanto às PROJEÇÕES DE FATURAS DE CARTÃO PARA MESES FUTUROS (ex: novembro/2026, dezembro/2026, 2027, etc.).
   - Se o usuário perguntar sobre o valor da fatura de algum cartão em meses futuros ou passados, CONSULTE a seção de projeções futuras no contexto ou execute a ferramenta 'get_credit_card_invoice_details' para obter o valor e todos os itens detalhados!
2. FORMATAÇÃO: Sempre formate valores em reais no padrão brasileiro (ex: R$ 1.250,50). Use negrito para destacar valores e categorias.
3. ESTILO DE RESPOSTA: Seja cordial, direto, objetivo e encorajador. Evite textos excessivamente longos sem necessidade.
4. EXECUÇÃO DE AÇÕES (MCP / TOOLS):
   - Se o usuário pedir para registrar uma despesa, receita, pagar conta, consultar faturas ou guardar dinheiro em cofrinho, CHAME A FERRAMENTA CORRESPONDENTE IMEDIATAMENTE com os dados inferidos da mensagem.
   - Não hesite em inferir a categoria mais apropriada para a despesa caso o usuário não tenha especificado (ex: "comprei pizza" -> categoria "Alimentação").
   - Hoje é ${new Date().toLocaleDateString('pt-BR')}. Se o usuário disser "hoje", use a data atual.

${ragContextText}
`;

    // 2. Prepare contents payload for Gemini
    const contents: any[] = [];

    // Add recent history (up to last 6 messages)
    if (Array.isArray(history)) {
      const recentHistory = history.slice(-6);
      for (const item of recentHistory) {
        if (item.text && (item.role === 'user' || item.role === 'model')) {
          contents.push({
            role: item.role,
            parts: [{ text: item.text }],
          });
        }
      }
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: message.trim() }],
    });

    const geminiPayload = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents,
      tools: [
        {
          functionDeclarations: AI_TOOL_DECLARATIONS,
        },
      ],
      generationConfig: {
        temperature: 0.2, // Low temperature for high financial precision
      },
    };

    // 3. First call to Gemini with model fallback
    const geminiResult = await callGeminiApi(apiKey, geminiPayload);

    if (!geminiResult.ok) {
      console.error('[Gemini API Final Failure]:', geminiResult.status, geminiResult.error);
      const userMessage = geminiResult.isRateLimit
        ? 'Limite de requisições atingido. A cota gratuita da IA foi atingida temporariamente. Por favor, aguarde alguns instantes e tente novamente.'
        : 'Não foi possível se comunicar com o serviço de IA. Tente novamente em instantes.';

      res.status(502).json({
        message: userMessage,
        error: geminiResult.error,
      });
      return;
    }

    const data = geminiResult.data;
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    // Check if Gemini invoked a tool (functionCall)
    const functionCallPart = parts.find((p: any) => p.functionCall);

    if (functionCallPart && functionCallPart.functionCall) {
      const { name, args } = functionCallPart.functionCall;
      console.log(`[AI Tool Executing]: ${name} (via ${geminiResult.usedModel})`, args);

      // Execute action on user's database
      const actionResult: ToolExecutionResult = await executeAiTool(userId, name, args);

      // 4. Second call to Gemini to generate natural confirmation message
      const followUpContents = [
        ...contents,
        {
          role: 'model',
          parts: [{ functionCall: functionCallPart.functionCall }],
        },
        {
          role: 'user',
          parts: [
            {
              functionResponse: {
                name,
                response: actionResult,
              },
            },
          ],
        },
      ];

      const followUpPayload = {
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: followUpContents,
        generationConfig: { temperature: 0.3 },
      };

      const followUpResult = await callGeminiApi(apiKey, followUpPayload);

      let finalReply = actionResult.summary;
      if (followUpResult.ok) {
        const textPart = followUpResult.data.candidates?.[0]?.content?.parts?.find((p: any) => p.text);
        if (textPart && textPart.text) {
          finalReply = textPart.text;
        }
      }

      res.json({
        reply: finalReply,
        actionExecuted: {
          toolName: name,
          summary: actionResult.summary,
          success: actionResult.success,
          data: actionResult.data,
        },
      });
      return;
    }

    // Direct conversational/RAG answer
    const textPart = parts.find((p: any) => p.text);
    const replyText = textPart?.text || 'Estou à disposição para analisar suas finanças ou registrar movimentações.';

    res.json({
      reply: replyText,
    });
  } catch (error: any) {
    console.error('[aiController] chatWithAi error:', error);
    res.status(500).json({
      message: 'Erro ao processar consulta com o assistente virtual.',
      error: error.message,
    });
  }
}

export async function getAiQuickPrompts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const ctx = await getUserFinancialContext(userId);

    const prompts: string[] = [];

    // Dynamically generate intelligent prompts based on user's real situation
    if (ctx.totalPendingExpensesMonth > 0) {
      prompts.push('Quais contas ainda preciso pagar este mês?');
    }

    if (ctx.piggyBanks.length > 0) {
      prompts.push(`Quanto falta para bater a meta do cofrinho "${ctx.piggyBanks[0].name}"?`);
    }

    prompts.push('Qual o valor da minha fatura do Nubank em novembro?');
    prompts.push('Qual meu saldo disponível e previsto pós-contas?');

    res.json({
      prompts: prompts.slice(0, 4),
    });
  } catch (error) {
    console.error('getAiQuickPrompts error:', error);
    res.json({
      prompts: [
        'Qual meu saldo atual e previsto?',
        'Quais contas vencem este mês?',
        'Cadastrar gasto de R$ 30 com mercado',
        'Dicas para economizar no mês',
      ],
    });
  }
}
