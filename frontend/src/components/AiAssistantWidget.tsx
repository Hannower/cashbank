import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Trash2,
  CheckCircle2,
  Loader2,
  Bot,
  User as UserIcon,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  Landmark,
  PiggyBank,
  Check,
} from 'lucide-react';
import { api } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  actionExecuted?: {
    toolName: string;
    summary: string;
    success: boolean;
  };
  timestamp: Date;
}

interface AiAssistantWidgetProps {
  onDataChanged?: () => void;
}

export const AiAssistantWidget: React.FC<AiAssistantWidgetProps> = ({ onDataChanged }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickPrompts, setQuickPrompts] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // Load quick prompt suggestions on mount
  useEffect(() => {
    api
      .getAiQuickPrompts()
      .then((res) => {
        if (res && res.prompts && res.prompts.length > 0) {
          setQuickPrompts(res.prompts);
        }
      })
      .catch(() => {
        setQuickPrompts([
          'Qual meu saldo atual e previsto?',
          'Quais contas ainda vencem este mês?',
          'Cadastrar gasto de R$ 35 com lanche hoje',
          'Quanto guardei nos meus cofrinhos?',
        ]);
      });
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: String(Date.now()),
      role: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build history for context
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await api.chatWithAi(text, historyPayload);

      const aiMessage: Message = {
        id: String(Date.now() + 1),
        role: 'model',
        text: res.reply,
        actionExecuted: res.actionExecuted,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // If an action was performed (MCP Tool Execution), notify parent to refresh data
      if (res.actionExecuted && res.actionExecuted.success && onDataChanged) {
        onDataChanged();
      }
    } catch (err: any) {
      const errorMessage: Message = {
        id: String(Date.now() + 1),
        role: 'model',
        text:
          err.message ||
          'Desculpe, ocorreu uma instabilidade ao me conectar com a IA. Por favor, tente novamente.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  // Helper to format basic markdown (bold, lists)
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');
    return lines.map((line, idx) => {
      // Format bold text **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} style={{ color: 'inherit', fontWeight: 700 }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        return (
          <div key={idx} style={{ display: 'flex', gap: 6, margin: '3px 0' }}>
            <span style={{ color: '#15803d' }}>•</span>
            <span>{formattedParts}</span>
          </div>
        );
      }

      return (
        <div key={idx} style={{ minHeight: line ? 'auto' : 8, margin: '2px 0' }}>
          {formattedParts}
        </div>
      );
    });
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Abrir Assistente Financeiro IA (CashAI)"
          aria-label="Abrir Assistente IA"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 18px',
            backgroundColor: '#15803d',
            backgroundImage: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
            color: '#ffffff',
            borderRadius: 30,
            border: 'none',
            boxShadow: '0 8px 24px rgba(21, 128, 61, 0.4), 0 2px 6px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(21, 128, 61, 0.5), 0 3px 8px rgba(0,0,0,0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(21, 128, 61, 0.4), 0 2px 6px rgba(0,0,0,0.1)';
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={16} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.2px' }}>
            CashAI
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              backgroundColor: '#ffffff',
              color: '#15803d',
              padding: '2px 6px',
              borderRadius: 8,
              letterSpacing: '0.5px',
            }}
          >
            MCP
          </span>
        </button>
      )}

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 'min(420px, calc(100vw - 32px))',
            height: 'min(620px, calc(100vh - 48px))',
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: 20,
            boxShadow: '0 20px 45px rgba(15, 23, 42, 0.22), 0 4px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100000,
            overflow: 'hidden',
            animation: 'fadeInUp 0.25s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#15803d',
              backgroundImage: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <Bot size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' }}>
                    CashAI
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      padding: '1px 6px',
                      borderRadius: 6,
                    }}
                  >
                    RAG + MCP
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, opacity: 0.9 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: '#4ade80',
                      display: 'inline-block',
                    }}
                  />
                  <span>Conectado às suas finanças</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  title="Limpar conversa"
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.8)',
                    cursor: 'pointer',
                    padding: 6,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Trash2 size={16} />
                </button>
              )}

              <button
                onClick={() => setIsOpen(false)}
                title="Fechar assistente"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div
            style={{
              flex: 1,
              padding: '16px 18px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              backgroundColor: 'var(--bg-main, #f8fafc)',
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  textAlign: 'center',
                  padding: '12px',
                  color: 'var(--text-secondary, #64748b)',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 18,
                    backgroundColor: 'rgba(21, 128, 61, 0.1)',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Sparkles size={28} />
                </div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text-main, #0f172a)',
                    margin: '0 0 6px',
                  }}
                >
                  Como posso te ajudar hoje?
                </h3>
                <p style={{ fontSize: 13, margin: '0 0 20px', lineHeight: 1.5 }}>
                  Consulte seus saldos, pergunte sobre contas a pagar ou peça para eu cadastrar despesas e receitas automaticamente.
                </p>

                {/* Capability Badges */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: 8,
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-card, #ffffff)',
                      borderRadius: 10,
                      border: '1px solid var(--border-color, #e2e8f0)',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Landmark size={16} color="#15803d" />
                    <span><strong>RAG Financeiro:</strong> Sabe seus saldos e contas em tempo real</span>
                  </div>
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-card, #ffffff)',
                      borderRadius: 10,
                      border: '1px solid var(--border-color, #e2e8f0)',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <CheckCircle2 size={16} color="#2563eb" />
                    <span><strong>Ações MCP:</strong> Cadastra gastos e receitas por comando de voz/texto</span>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '12px 16px',
                        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        backgroundColor: isUser ? '#15803d' : 'var(--bg-card, #ffffff)',
                        color: isUser ? '#ffffff' : 'var(--text-main, #0f172a)',
                        fontSize: 13,
                        lineHeight: 1.5,
                        boxShadow: isUser
                          ? '0 2px 8px rgba(21, 128, 61, 0.2)'
                          : '0 2px 6px rgba(0, 0, 0, 0.04)',
                        border: isUser ? 'none' : '1px solid var(--border-color, #e2e8f0)',
                        wordBreak: 'break-word',
                      }}
                    >
                      {renderFormattedText(msg.text)}

                      {/* Action Execution Card (MCP Confirmation) */}
                      {msg.actionExecuted && (
                        <div
                          style={{
                            marginTop: 10,
                            padding: '10px 12px',
                            backgroundColor: msg.actionExecuted.success
                              ? 'rgba(21, 128, 61, 0.08)'
                              : 'rgba(239, 68, 68, 0.08)',
                            borderRadius: 10,
                            border: `1px solid ${
                              msg.actionExecuted.success
                                ? 'rgba(21, 128, 61, 0.25)'
                                : 'rgba(239, 68, 68, 0.25)'
                            }`,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                            fontSize: 12,
                          }}
                        >
                          <div
                            style={{
                              color: msg.actionExecuted.success ? '#15803d' : '#ef4444',
                              marginTop: 1,
                            }}
                          >
                            <Check size={16} />
                          </div>
                          <div>
                            <div
                              style={{
                                fontWeight: 700,
                                color: msg.actionExecuted.success ? '#15803d' : '#ef4444',
                                fontSize: 11,
                                textTransform: 'uppercase',
                                letterSpacing: '0.4px',
                                marginBottom: 2,
                              }}
                            >
                              Ação Executada no Sistema
                            </div>
                            <div style={{ color: 'var(--text-main, #0f172a)' }}>
                              {msg.actionExecuted.summary}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--text-muted, #94a3b8)',
                        padding: '0 4px',
                      }}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })
            )}

            {/* Thinking / Loading Indicator */}
            {isLoading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-card, #ffffff)',
                  borderRadius: '16px 16px 16px 4px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  maxWidth: '75%',
                  color: 'var(--text-secondary, #64748b)',
                  fontSize: 12,
                }}
              >
                <Loader2 size={16} className="animate-spin" color="#15803d" />
                <span>Consultando finanças e pensando...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel */}
          {quickPrompts.length > 0 && (
            <div
              style={{
                padding: '8px 14px',
                backgroundColor: 'var(--bg-card, #ffffff)',
                borderTop: '1px solid var(--border-color, #f1f5f9)',
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  disabled={isLoading}
                  onClick={() => handleSendMessage(prompt)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 14,
                    fontSize: 11,
                    fontWeight: 600,
                    backgroundColor: 'var(--bg-main, #f1f5f9)',
                    color: 'var(--text-secondary, #475569)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(21, 128, 61, 0.1)';
                    e.currentTarget.style.color = '#15803d';
                    e.currentTarget.style.borderColor = 'rgba(21, 128, 61, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-main, #f1f5f9)';
                    e.currentTarget.style.color = 'var(--text-secondary, #475569)';
                    e.currentTarget.style.borderColor = 'var(--border-color, #e2e8f0)';
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderTop: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Pergunte algo ou peça para cadastrar um gasto..."
              style={{
                flex: 1,
                padding: '11px 14px',
                borderRadius: 12,
                border: '1px solid var(--border-input, #cbd5e1)',
                backgroundColor: 'var(--bg-input, #ffffff)',
                color: 'var(--text-main, #0f172a)',
                fontSize: 13,
                outline: 'none',
              }}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              title="Enviar mensagem"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: inputValue.trim() && !isLoading ? '#15803d' : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

