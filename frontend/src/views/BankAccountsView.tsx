import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Search,
  Plus,
  ShieldCheck,
  Clock,
  Sparkles,
  Link2,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';

interface BankAccount {
  id: string;
  itemId?: string;
  bankKey: 'nubank' | 'inter' | 'mercadopago' | 'picpay';
  bankName: string;
  accountType: string;
  agency?: string;
  accountNumber: string;
  balance: number;
  currency: string;
  brandColor: string;
  badgeBg: string;
  status: 'connected' | 'pending_credentials' | 'syncing';
  lastSyncAt: string;
  totalIn: number;
  totalOut: number;
}

interface BankTransaction {
  id: string;
  bankKey: 'nubank' | 'inter' | 'mercadopago' | 'picpay';
  bankName: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
  status: 'completed';
  paymentMethod: 'PIX' | 'TED' | 'DEBITO' | 'BOLETO' | 'RENDIMENTO';
}

const BANK_META: Record<
  'nubank' | 'inter' | 'mercadopago' | 'picpay',
  { name: string; color: string; badgeBg: string; textColor: string; iconBg: string }
> = {
  nubank: {
    name: 'Nubank',
    color: '#820AD1',
    badgeBg: '#F3E8FF',
    textColor: '#820AD1',
    iconBg: 'rgba(130, 10, 209, 0.1)',
  },
  inter: {
    name: 'Banco Inter',
    color: '#FF7A00',
    badgeBg: '#FFF7ED',
    textColor: '#C2410C',
    iconBg: 'rgba(255, 122, 0, 0.1)',
  },
  mercadopago: {
    name: 'Mercado Pago',
    color: '#009EE3',
    badgeBg: '#E0F2FE',
    textColor: '#0284C7',
    iconBg: 'rgba(0, 158, 227, 0.1)',
  },
  picpay: {
    name: 'PicPay',
    color: '#11C76F',
    badgeBg: '#DCFCE7',
    textColor: '#15803D',
    iconBg: 'rgba(17, 199, 111, 0.12)',
  },
};

export const BankAccountsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [hasLiveItems, setHasLiveItems] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [summary, setSummary] = useState({
    totalBalance: 0,
    totalIncomeMonth: 0,
    totalExpenseMonth: 0,
    connectedAccountsCount: 0,
  });

  // Filters
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [linkItemModalOpen, setLinkItemModalOpen] = useState(false);
  const [disconnectingAcc, setDisconnectingAcc] = useState<BankAccount | null>(null);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [inputItemId, setInputItemId] = useState('');
  const [linkingLoading, setLinkingLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const overviewRes = await api.getBankAccountsOverview().catch(() => null);

      if (overviewRes) {
        setHasLiveItems(Boolean(overviewRes.hasLiveItems));
        setAccounts(overviewRes.accounts || []);
        setTransactions(overviewRes.transactions || []);
        setSummary(
          overviewRes.summary || {
            totalBalance: 0,
            totalIncomeMonth: 0,
            totalExpenseMonth: 0,
            connectedAccountsCount: 0,
          }
        );
      }
    } catch (err) {
      console.error('Erro ao carregar dados das contas bancárias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      await api.syncBankAccounts();
      await fetchData();
      setActionMessage({ type: 'success', text: 'Saldos e extrato sincronizados com sucesso!' });
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Erro ao sincronizar contas: ' + (err.message || 'Tente novamente.') });
    } finally {
      setSyncing(false);
    }
  };

  const handleConfirmDisconnect = async () => {
    if (!disconnectingAcc) return;
    try {
      setDisconnectLoading(true);
      const targetId = disconnectingAcc.itemId || disconnectingAcc.id;
      await api.removeBankLinkedItem(targetId);
      setDisconnectingAcc(null);
      setActionMessage({ type: 'success', text: 'Conta ' + disconnectingAcc.bankName + ' desconectada com sucesso!' });
      setTimeout(() => setActionMessage(null), 4000);
      await fetchData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Erro ao desconectar: ' + (err.message || 'Tente novamente') });
    } finally {
      setDisconnectLoading(false);
    }
  };

  const handleLinkItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputItemId.trim()) return;

    try {
      setLinkingLoading(true);
      const ids = inputItemId
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      for (const id of ids) {
        await api.addBankLinkedItem(id);
      }

      setInputItemId('');
      setLinkItemModalOpen(false);
      setActionMessage({ type: 'success', text: `${ids.length} conexão(ões) vinculada(s) com sucesso!` });
      setTimeout(() => setActionMessage(null), 4000);
      await fetchData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Falha ao vincular: ' + (err.message || 'Verifique o ID') });
    } finally {
      setLinkingLoading(false);
    }
  };

  const handleOpenPluggyConnect = async () => {
    try {
      setSyncing(true);
      const res = await api.createBankConnectToken();
      if (!res?.accessToken) {
        throw new Error('Não foi possível obter o token da Pluggy');
      }

      // Load Pluggy Connect script if not already loaded
      if (!(window as any).PluggyConnect) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2.5.0/pluggy-connect.js';
          script.async = true;
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const pluggyConnect = new (window as any).PluggyConnect({
        connectToken: res.accessToken,
        includeSandbox: true,
        onSuccess: async (data: any) => {
          if (data?.item?.id) {
            await api.addBankLinkedItem(data.item.id);
            await fetchData();
            setActionMessage({ type: 'success', text: `Banco conectado com sucesso!` });
            setTimeout(() => setActionMessage(null), 4000);
          }
        },
        onClose: () => { setSyncing(false); },
        onError: (err: any) => {
          console.error('Pluggy Connect Error:', err);
        },
      });

      pluggyConnect.init();
    } catch (err: any) {
      console.error('Erro ao abrir widget:', err);
      setActionMessage({
        type: 'error',
        text: 'Erro ao abrir o widget: ' + (err.message || 'Verifique suas credenciais'),
      });
    } finally {
      setSyncing(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return (
        d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
        ' às ' +
        d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return isoString;
    }
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (selectedBank !== 'all' && tx.bankKey !== selectedBank) return false;
    if (selectedType !== 'all' && tx.type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = tx.description.toLowerCase().includes(q);
      const matchCategory = tx.category.toLowerCase().includes(q);
      const matchBank = tx.bankName.toLowerCase().includes(q);
      const matchMethod = tx.paymentMethod.toLowerCase().includes(q);
      if (!matchDesc && !matchCategory && !matchBank && !matchMethod) return false;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner / Actions Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          backgroundColor: 'var(--bg-card, #ffffff)',
          padding: '24px 28px',
          borderRadius: 16,
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Landmark size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                Contas Bancárias Digitais
              </h1>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6,
                  backgroundColor: hasLiveItems ? '#dcfce7' : '#f1f5f9',
                  color: hasLiveItems ? '#15803d' : '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Sparkles size={12} />
                {hasLiveItems ? 'Contas Conectadas' : 'Pronto para Conectar'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>
              Sincronização automática de saldos, extratos, entradas e saídas sem preenchimento manual.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          {/* Link Item ID from Dashboard button */}
          <button
            type="button"
            onClick={() => setLinkItemModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              border: '1px solid var(--border-color, #cbd5e1)',
              backgroundColor: 'var(--bg-secondary, #f8fafc)',
              color: 'var(--text-primary, #1e293b)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Link2 size={16} />
            Vincular Item ID
          </button>

          {/* Connect via Widget button */}
          <button
            type="button"
            onClick={handleOpenPluggyConnect}
            disabled={syncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: '#15803d',
              color: '#ffffff',
              border: 'none',
              cursor: syncing ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(21, 128, 61, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={16} />
            Conectar Nova Conta
          </button>

          {/* Sync now button */}
          {accounts.length > 0 && (
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={syncing || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: 'var(--bg-secondary, #f8fafc)',
                color: 'var(--text-primary, #1e293b)',
                border: '1px solid var(--border-color, #cbd5e1)',
                cursor: syncing ? 'not-allowed' : 'pointer',
                opacity: syncing ? 0.7 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          )}
        </div>
      </div>

      {/* Action feedback message */}
      {actionMessage && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            backgroundColor: actionMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: actionMessage.type === 'success' ? '#15803d' : '#b91c1c',
            border: `1px solid ${actionMessage.type === 'success' ? '#86efac' : '#fca5a5'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {actionMessage.text}
        </div>
      )}

      {/* Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {/* Total Balance */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: 16,
            padding: '20px 24px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>
              Saldo Consolidado Total
            </span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: '#dcfce7',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet size={20} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
              {formatCurrency(summary.totalBalance)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)', fontWeight: 500, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <ShieldCheck size={14} color="#15803d" /> {accounts.length} {accounts.length === 1 ? 'conta conectada' : 'contas conectadas'}
            </div>
          </div>
        </div>

        {/* Total Incomes */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: 16,
            padding: '20px 24px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>
              Entradas Automáticas
            </span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: '#d1fae5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowDownLeft size={20} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#059669' }}>
              +{formatCurrency(summary.totalIncomeMonth)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)', marginTop: 4 }}>
              Pix, TED e rendimentos recebidos
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: 16,
            padding: '20px 24px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>
              Saídas Automáticas
            </span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: '#ffe4e6',
                color: '#e11d48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#e11d48' }}>
              -{formatCurrency(summary.totalExpenseMonth)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)', marginTop: 4 }}>
              Boletos, Pix enviados e débito
            </div>
          </div>
        </div>
      </div>

      {/* Connected Accounts Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
            Instituições Conectadas
          </h2>
          {accounts.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>
              Clique no card para filtrar o extrato
            </span>
          )}
        </div>

        {accounts.length === 0 ? (
          /* Empty State: Ready to Connect */
          <div
            style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: 16,
              padding: '48px 24px',
              border: '1px dashed var(--border-color, #cbd5e1)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Landmark size={32} />
            </div>

            <div style={{ maxWidth: 500 }}>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                Nenhuma conta digital conectada ainda
              </h3>
              <p style={{ margin: '8px 0 0 0', fontSize: 13, color: 'var(--text-secondary, #64748b)', lineHeight: 1.5 }}>
                Conecte suas contas do <strong>Nubank</strong>, <strong>Banco Inter</strong>, <strong>Mercado Pago</strong> ou <strong>PicPay</strong> para que o CashBank sincronize seus saldos e extratos automaticamente.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 6 }}>
              <button
                type="button"
                onClick={handleOpenPluggyConnect}
                disabled={syncing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  cursor: syncing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)',
                }}
              >
                <Plus size={18} />
                Conectar Primeira Conta
              </button>

              <button
                type="button"
                onClick={() => setLinkItemModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 18px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: 'var(--bg-secondary, #f8fafc)',
                  color: 'var(--text-primary, #1e293b)',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  cursor: 'pointer',
                }}
              >
                <Link2 size={16} />
                Vincular por Item ID
              </button>
            </div>

            {/* Badges of supported institutions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, backgroundColor: '#F3E8FF', color: '#820AD1', fontWeight: 600 }}>
                Nubank (NuConta)
              </span>
              <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, backgroundColor: '#FFF7ED', color: '#C2410C', fontWeight: 600 }}>
                Banco Inter
              </span>
              <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, backgroundColor: '#E0F2FE', color: '#0284C7', fontWeight: 600 }}>
                Mercado Pago
              </span>
              <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 600 }}>
                PicPay
              </span>
            </div>
          </div>
        ) : (
          /* Cards Grid when accounts exist */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {accounts.map((acc) => {
              const meta = BANK_META[acc.bankKey] || {
                name: acc.bankName,
                color: acc.brandColor || '#475569',
                badgeBg: acc.badgeBg || '#f1f5f9',
                textColor: acc.brandColor || '#475569',
                iconBg: 'rgba(0,0,0,0.05)',
              };
              const isCardActive = selectedBank === acc.bankKey;

              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedBank(selectedBank === acc.bankKey ? 'all' : acc.bankKey)}
                  style={{
                    backgroundColor: 'var(--bg-card, #ffffff)',
                    borderRadius: 16,
                    padding: '22px 20px',
                    border: isCardActive ? `2px solid ${meta.color}` : '1px solid var(--border-color, #e2e8f0)',
                    boxShadow: isCardActive
                      ? `0 4px 12px ${meta.color}25`
                      : '0 1px 3px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.18s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      backgroundColor: meta.color,
                    }}
                  />

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          backgroundColor: meta.iconBg,
                          color: meta.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 16,
                        }}
                      >
                        <Building2 size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                          {acc.bankName}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>
                          {acc.accountType}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 12,
                          backgroundColor: meta.badgeBg,
                          color: meta.textColor,
                          letterSpacing: '0.4px',
                        }}
                      >
                        CONECTADO
                      </span>
                      <button
                        type="button"
                        title="Desconectar esta conta"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDisconnectingAcc(acc);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: 4,
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary, #64748b)' }}>
                      Ag: {acc.agency || '0001'} &bull; Cc: {acc.accountNumber}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color, #f1f5f9)', paddingTop: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>
                      Saldo Atual Disponível
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: meta.color, marginTop: 2 }}>
                      {formatCurrency(acc.balance)}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: 'var(--text-secondary, #94a3b8)',
                      paddingTop: 6,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {acc.lastSyncAt}
                    </span>
                    <span style={{ color: isCardActive ? meta.color : 'inherit', fontWeight: isCardActive ? 600 : 400 }}>
                      {isCardActive ? '✓ Filtrando' : 'Ver extrato'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transactions Section (Extrato Automático) */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          borderRadius: 16,
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
              Extrato Consolidado (Entradas e Saídas)
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>
              Movimentações identificadas automaticamente pelos conectores de cada banco.
            </p>
          </div>

          {/* Filters Bar */}
          {transactions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 10,
                    color: 'var(--text-secondary, #94a3b8)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="Buscar lançamento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 34px',
                    borderRadius: 8,
                    fontSize: 13,
                    border: '1px solid var(--border-color, #cbd5e1)',
                    backgroundColor: 'var(--bg-secondary, #f8fafc)',
                    color: 'var(--text-primary, #0f172a)',
                    outline: 'none',
                    minWidth: 190,
                  }}
                />
              </div>

              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  border: '1px solid var(--border-color, #cbd5e1)',
                  backgroundColor: 'var(--bg-secondary, #f8fafc)',
                  color: 'var(--text-primary, #0f172a)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="all">Todas as Contas</option>
                <option value="nubank">Nubank</option>
                <option value="inter">Banco Inter</option>
                <option value="mercadopago">Mercado Pago</option>
                <option value="picpay">PicPay</option>
              </select>

              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'var(--bg-secondary, #f1f5f9)',
                  borderRadius: 8,
                  padding: 3,
                  border: '1px solid var(--border-color, #e2e8f0)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedType('all')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: selectedType === 'all' ? 'var(--bg-card, #ffffff)' : 'transparent',
                    color: selectedType === 'all' ? 'var(--text-primary, #0f172a)' : 'var(--text-secondary, #64748b)',
                    boxShadow: selectedType === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('income')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: selectedType === 'income' ? '#dcfce7' : 'transparent',
                    color: selectedType === 'income' ? '#15803d' : 'var(--text-secondary, #64748b)',
                  }}
                >
                  Entradas
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('expense')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: selectedType === 'expense' ? '#fee2e2' : 'transparent',
                    color: selectedType === 'expense' ? '#b91c1c' : 'var(--text-secondary, #64748b)',
                  }}
                >
                  Saídas
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Transactions Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Instituição</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Descrição & Tipo</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Categoria</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Data & Horário</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'right' }}>Valor</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'center' }}>Origem</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-secondary, #64748b)' }}>
                    {accounts.length === 0
                      ? 'Nenhuma movimentação para exibir. Conecte sua conta bancária para carregar o extrato automaticamente.'
                      : 'Nenhuma movimentação encontrada para os filtros selecionados.'}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const meta = BANK_META[tx.bankKey] || {
                    name: tx.bankName,
                    color: '#475569',
                    badgeBg: '#f1f5f9',
                    textColor: '#475569',
                    iconBg: 'rgba(0,0,0,0.05)',
                  };
                  const isIncome = tx.type === 'income';

                  return (
                    <tr
                      key={tx.id}
                      style={{
                        borderBottom: '1px solid var(--border-color, #f1f5f9)',
                        transition: 'background-color 0.1s ease',
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            backgroundColor: meta.badgeBg,
                            color: meta.textColor,
                          }}
                        >
                          <Building2 size={14} />
                          {tx.bankName}
                        </span>
                      </td>

                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                            {tx.description}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary, #64748b)' }}>
                            Método: <strong style={{ color: 'var(--text-primary, #334155)' }}>{tx.paymentMethod}</strong>
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            fontSize: 12,
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: 'var(--bg-secondary, #f1f5f9)',
                            color: 'var(--text-secondary, #475569)',
                            fontWeight: 500,
                          }}
                        >
                          {tx.category}
                        </span>
                      </td>

                      <td style={{ padding: '14px', fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>
                        {formatDate(tx.date)}
                      </td>

                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: isIncome ? '#059669' : '#e11d48',
                          }}
                        >
                          {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </td>

                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: '#ecfdf5',
                            color: '#047857',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Sparkles size={11} /> Automático
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Vincular Item ID do Dashboard */}
      <Modal
        isOpen={linkItemModalOpen}
        onClose={() => setLinkItemModalOpen(false)}
        title="Vincular Conexão Manual (Item ID)"
        subtitle="Cole o ID da conexão criada no painel para que o CashBank importe os saldos e transações."
        icon={<Link2 size={22} />}
        maxWidth="520px"
      >
        <form onSubmit={handleLinkItemSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 10 }}>
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '14px',
              fontSize: 12,
              color: '#475569',
              lineHeight: 1.5,
            }}
          >
            <strong>Onde encontrar o Item ID:</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              No painel da Pluggy (<strong>dashboard.pluggy.ai</strong>), acesse <strong>Connections</strong> / <strong>Items</strong>,
              clique na conexão que você fez (ex: Nubank, Inter, MP ou PicPay) e copie o código UUID (ex: <code>8a4c1234-abcd-...</code>).
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>
              Item ID (ou múltiplos IDs separados por vírgula):
            </label>
            <textarea
              required
              rows={3}
              placeholder="Ex: 8a4c1234-5678-90ab-cdef-1234567890ab"
              value={inputItemId}
              onChange={(e) => setInputItemId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 13,
                border: '1px solid var(--border-color, #cbd5e1)',
                backgroundColor: 'var(--bg-secondary, #f8fafc)',
                color: 'var(--text-primary, #0f172a)',
                fontFamily: 'monospace',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setLinkItemModalOpen(false)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={linkingLoading || !inputItemId.trim()}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                backgroundColor: '#15803d',
                color: '#ffffff',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: linkingLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {linkingLoading ? 'Vinculando...' : 'Vincular Conexão'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmar Desconexao */}
      <Modal
        isOpen={Boolean(disconnectingAcc)}
        onClose={() => setDisconnectingAcc(null)}
        title="Desconectar Conta Bancária"
        subtitle="Tem certeza de que deseja desconectar esta instituição?"
        icon={<Trash2 size={22} color="#ef4444" />}
        maxWidth="460px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #475569)', lineHeight: 1.5 }}>
            Ao desconectar a conta <strong>{disconnectingAcc?.bankName}</strong>, ela deixará de sincronizar seus saldos e extratos com o CashBank.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              onClick={() => setDisconnectingAcc(null)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid var(--border-color, #cbd5e1)',
                backgroundColor: 'var(--bg-card, #ffffff)',
                color: 'var(--text-secondary, #475569)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={disconnectLoading}
              onClick={handleConfirmDisconnect}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: disconnectLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {disconnectLoading ? 'Desconectando...' : 'Sim, Desconectar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
