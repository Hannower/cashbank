import React, { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  Clock,
  Loader2,
  HandCoins,
  CheckCircle2,
  AlertCircle,
  Search,
  Users,
  CreditCard,
  RotateCcw,
  Sparkles,
  ArrowDownLeft,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { MonthSelector } from '../components/MonthSelector';
import { MonthItem, getInitialMonthItem } from '../utils/dateUtils';

interface ReceivableItem {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  category: string;
  payer: string | null;
  isReceived: boolean;
  receivedAt: string | null;
  notes: string | null;
  creditCardPurchaseId?: string | null;
  creditCardInstallmentId?: string | null;
  creditCardPurchase?: {
    id: string;
    description: string;
    creditCard?: {
      id: string;
      name: string;
      color: string;
    };
  } | null;
  creditCardInstallment?: {
    installmentNumber: number;
    totalInstallments: number;
  } | null;
  revenueId?: string | null;
  revenue?: {
    id: string;
    date: string;
    amount: number;
  } | null;
}

interface ReceivablesSummary {
  totalExpected: number;
  totalPending: number;
  totalReceived: number;
  pendingCount: number;
  receivedCount: number;
  totalCount: number;
}

const CATEGORIES = [
  'Serviços',
  'Vendas',
  'Empréstimos',
  'Reembolsos',
  'Cartão de Terceiros',
  'Aluguel',
  'Comissões',
  'Outros',
];

export const ReceivablesView: React.FC<{ onDataChanged?: () => void }> = ({ onDataChanged }) => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<MonthItem>(() => getInitialMonthItem(user?.createdAt));
  const [receivables, setReceivables] = useState<ReceivableItem[]>([]);
  const [summary, setSummary] = useState<ReceivablesSummary>({
    totalExpected: 0,
    totalPending: 0,
    totalReceived: 0,
    pendingCount: 0,
    receivedCount: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'received' | 'thirdParty'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReceivableItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ReceivableItem | null>(null);
  const [receivingItem, setReceivingItem] = useState<ReceivableItem | null>(null);

  // Forms
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formPayer, setFormPayer] = useState('');
  const [formCategory, setFormCategory] = useState('Serviços');
  const [formNotes, setFormNotes] = useState('');
  const [receiveDate, setReceiveDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Toast feedback
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4500);
  };

  const fetchReceivables = async () => {
    try {
      setLoading(true);
      const res = await api.getReceivables(selectedMonth.month, selectedMonth.year);
      setReceivables(res.receivables || []);
      setSummary(
        res.summary || {
          totalExpected: 0,
          totalPending: 0,
          totalReceived: 0,
          pendingCount: 0,
          receivedCount: 0,
          totalCount: 0,
        }
      );
    } catch (err) {
      console.error('Failed to load receivables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, [selectedMonth]);

  const openCreateModal = () => {
    setFormDesc('');
    setFormAmount('');
    const today = new Date().toISOString().split('T')[0];
    setFormDueDate(today);
    setFormPayer('');
    setFormCategory('Serviços');
    setFormNotes('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (item: ReceivableItem) => {
    setEditingItem(item);
    setFormDesc(item.description);
    setFormAmount(String(item.amount));
    setFormDueDate(item.dueDate ? item.dueDate.split('T')[0] : '');
    setFormPayer(item.payer || '');
    setFormCategory(item.category || 'Serviços');
    setFormNotes(item.notes || '');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc || !formAmount || !formDueDate) return;

    try {
      setActionLoading(true);
      await api.createReceivable({
        description: formDesc.trim(),
        amount: parseFloat(formAmount.replace(',', '.')),
        dueDate: formDueDate,
        category: formCategory,
        payer: formPayer.trim() || null,
        notes: formNotes.trim() || null,
      });

      setIsCreateModalOpen(false);
      await fetchReceivables();
      onDataChanged?.();
      showToast('Conta a receber cadastrada com sucesso!');
    } catch (err: any) {
      console.error('Error creating receivable:', err);
      alert(err.message || 'Erro ao cadastrar conta a receber.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !formDesc || !formAmount || !formDueDate) return;

    try {
      setActionLoading(true);
      await api.updateReceivable(editingItem.id, {
        description: formDesc.trim(),
        amount: parseFloat(formAmount.replace(',', '.')),
        dueDate: formDueDate,
        category: formCategory,
        payer: formPayer.trim() || null,
        notes: formNotes.trim() || null,
      });

      setEditingItem(null);
      await fetchReceivables();
      onDataChanged?.();
      showToast('Conta a receber atualizada com sucesso!');
    } catch (err: any) {
      console.error('Error updating receivable:', err);
      alert(err.message || 'Erro ao atualizar conta a receber.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      setActionLoading(true);
      await api.deleteReceivable(deletingItem.id);
      setDeletingItem(null);
      await fetchReceivables();
      onDataChanged?.();
      showToast('Conta a receber removida.');
    } catch (err: any) {
      console.error('Error deleting receivable:', err);
      alert(err.message || 'Erro ao excluir conta a receber.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!receivingItem) return;
    try {
      setActionLoading(true);
      await api.toggleReceivableReceived(receivingItem.id, {
        isReceived: true,
        receivedAt: receiveDate ? `${receiveDate}T12:00:00.000Z` : undefined,
      });

      const amountFormatted = formatCurrency(receivingItem.amount);
      setReceivingItem(null);
      await fetchReceivables();
      onDataChanged?.();
      showToast(`Recebimento registrado! O valor de ${amountFormatted} foi adicionado à seção de Receitas.`);
    } catch (err: any) {
      console.error('Error confirming receipt:', err);
      alert(err.message || 'Erro ao confirmar recebimento.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBackToPending = async (item: ReceivableItem) => {
    try {
      setActionLoading(true);
      await api.toggleReceivableReceived(item.id, {
        isReceived: false,
      });

      await fetchReceivables();
      onDataChanged?.();
      showToast('Recebimento desfeito. O lançamento foi removido de Receitas.');
    } catch (err: any) {
      console.error('Error undoing receipt:', err);
      alert(err.message || 'Erro ao desfazer recebimento.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered items
  const filteredReceivables = receivables.filter((item) => {
    if (statusFilter === 'pending' && item.isReceived) return false;
    if (statusFilter === 'received' && !item.isReceived) return false;
    if (statusFilter === 'thirdParty' && !item.creditCardPurchaseId && item.category !== 'Cartão de Terceiros') return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.payer && item.payer.toLowerCase().includes(q)) ||
      (item.notes && item.notes.toLowerCase().includes(q))
    );
  });

  const thirdPartyCount = receivables.filter(
    (r) => Boolean(r.creditCardPurchaseId) || r.category === 'Cartão de Terceiros'
  ).length;

  return (
    <div className="content-container animate-fade-in">
      {/* Toast Feedback */}
      {successToast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: '#15803d',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(21, 128, 61, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="view-header-row">
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: '#64748b',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            ENTRADAS PREVISTAS
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: 'var(--text-main, #0f172a)',
              letterSpacing: '-0.5px',
              margin: 0,
            }}
          >
            Contas a receber
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted, #64748b)', marginTop: 4, margin: 0 }}>
            Registre contas que você tem a receber, reembolsos e compras de terceiros no seu cartão.
          </p>
        </div>

        <button className="btn-primary" onClick={openCreateModal} style={{ gap: 8 }}>
          <Plus size={18} /> Nova conta a receber
        </button>
      </div>

      {/* Month Selector Bar */}
      <div style={{ marginTop: 20 }}>
        <MonthSelector selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />
      </div>

      {/* Integration Notice Alert Banner */}
      <div
        style={{
          marginTop: 18,
          borderRadius: 12,
          padding: '12px 18px',
          backgroundColor: 'rgba(21, 128, 61, 0.08)',
          border: '1px solid rgba(21, 128, 61, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: '#15803d',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ArrowDownLeft size={18} />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-main, #0f172a)', lineHeight: 1.5 }}>
          <strong>Integração automática com Receitas:</strong> Ao registrar o recebimento de qualquer conta aqui, o valor é somado instantaneamente na seção de <strong>Receitas</strong> e passa a compor seu saldo disponível!
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginTop: 20,
        }}
      >
        {/* KPI 1: Total Pendente (A Receber) */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
              Total a receber (Pendente)
            </span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={20} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#d97706', marginTop: 12 }}>
            {formatCurrency(summary.totalPending)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', marginTop: 4 }}>
            {summary.pendingCount} conta(s) aguardando recebimento
          </div>
        </div>

        {/* KPI 2: Já Recebido no Mês */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
              Já recebido em {selectedMonth.label}
            </span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a', marginTop: 12 }}>
            {formatCurrency(summary.totalReceived)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', marginTop: 4 }}>
            {summary.receivedCount} conta(s) recebida(s) e somada(s) em Receitas
          </div>
        </div>

        {/* KPI 3: Previsão Total */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
              Previsão total do mês
            </span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HandCoins size={20} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: 12 }}>
            {formatCurrency(summary.totalExpected)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', marginTop: 4 }}>
            {summary.totalCount} conta(s) no total em {selectedMonth.label}/{selectedMonth.year}
          </div>
        </div>
      </div>

      {/* Main List Section */}
      <div style={{ marginTop: 32 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
              Contas do mês de {selectedMonth.label}/{selectedMonth.year}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted, #64748b)', margin: '2px 0 0' }}>
              Valores a receber e histórico de confirmações.
            </p>
          </div>

          {/* Filter Bar & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Status Filter Tabs */}
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: 'var(--bg-card, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: 8,
                padding: 3,
                gap: 4,
              }}
            >
              <button
                onClick={() => setStatusFilter('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: statusFilter === 'all' ? '#1e293b' : 'transparent',
                  color: statusFilter === 'all' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                  transition: 'all 0.15s ease',
                }}
              >
                Todas ({receivables.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: statusFilter === 'pending' ? '#d97706' : 'transparent',
                  color: statusFilter === 'pending' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                  transition: 'all 0.15s ease',
                }}
              >
                Pendentes ({summary.pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter('received')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: statusFilter === 'received' ? '#15803d' : 'transparent',
                  color: statusFilter === 'received' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                  transition: 'all 0.15s ease',
                }}
              >
                Recebidas ({summary.receivedCount})
              </button>
              <button
                onClick={() => setStatusFilter('thirdParty')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: statusFilter === 'thirdParty' ? '#2563eb' : 'transparent',
                  color: statusFilter === 'thirdParty' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                  transition: 'all 0.15s ease',
                }}
              >
                Cartão Terceiros ({thirdPartyCount})
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Buscar conta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{
                  paddingLeft: 32,
                  paddingRight: 12,
                  paddingTop: 6,
                  paddingBottom: 6,
                  fontSize: 12,
                  width: 180,
                  height: 34,
                }}
              />
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted, #94a3b8)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="card desktop-table-wrapper" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', backgroundColor: 'var(--bg-app, #f8fafc)' }}>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #64748b)' }}>
                    STATUS
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #64748b)' }}>
                    DESCRIÇÃO
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #64748b)' }}>
                    DEVEDOR / PAGADOR
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #64748b)' }}>
                    CATEGORIA
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #64748b)' }}>
                    VENCIMENTO
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #64748b)', textAlign: 'right' }}>
                    VALOR
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #64748b)', textAlign: 'right' }}>
                    AÇÕES
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
                      <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 6px' }} />
                      Carregando contas a receber...
                    </td>
                  </tr>
                ) : filteredReceivables.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      Nenhuma conta a receber encontrada para este período.
                    </td>
                  </tr>
                ) : (
                  filteredReceivables.map((item) => {
                    const isCardThirdParty = Boolean(item.creditCardPurchaseId) || item.category === 'Cartão de Terceiros';

                    return (
                      <tr key={item.id} className="data-table-row">
                        {/* Status */}
                        <td style={{ padding: '14px 20px' }}>
                          {item.isReceived ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 6,
                                backgroundColor: 'rgba(21, 128, 61, 0.1)',
                                color: '#15803d',
                              }}
                              title={item.receivedAt ? `Recebido em: ${formatDate(item.receivedAt)}` : 'Recebido'}
                            >
                              <Check size={12} /> Recebido
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 6,
                                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                                color: '#d97706',
                              }}
                            >
                              <Clock size={12} /> Pendente
                            </span>
                          )}
                        </td>

                        {/* Descrição */}
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span>{item.description}</span>
                            {isCardThirdParty && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                    color: '#2563eb',
                                  }}
                                >
                                  <CreditCard size={11} /> Compra no Cartão
                                </span>
                                {item.creditCardPurchase?.creditCard?.name && (
                                  <span style={{ fontSize: 11, color: '#64748b' }}>
                                    • {item.creditCardPurchase.creditCard.name}
                                  </span>
                                )}
                              </div>
                            )}
                            {item.notes && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>
                                {item.notes}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Devedor / Pagador */}
                        <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary, #475569)' }}>
                          {item.payer ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                              <Users size={13} color="#64748b" /> {item.payer}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>

                        {/* Categoria */}
                        <td style={{ padding: '14px 20px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor: 'var(--bg-app, #f1f5f9)',
                              color: 'var(--text-secondary, #475569)',
                            }}
                          >
                            {item.category}
                          </span>
                        </td>

                        {/* Vencimento */}
                        <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>
                          {formatDate(item.dueDate)}
                        </td>

                        {/* Valor */}
                        <td
                          style={{
                            padding: '14px 20px',
                            fontWeight: 700,
                            color: item.isReceived ? '#15803d' : '#d97706',
                            textAlign: 'right',
                            fontSize: 14,
                          }}
                        >
                          {formatCurrency(item.amount)}
                        </td>

                        {/* Ações */}
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {item.isReceived ? (
                              <button
                                onClick={() => handleToggleBackToPending(item)}
                                title="Desfazer recebimento (remove de Receitas)"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: '#64748b',
                                  backgroundColor: 'var(--bg-app, #f1f5f9)',
                                  border: '1px solid var(--border-color, #e2e8f0)',
                                  borderRadius: 6,
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                }}
                              >
                                <RotateCcw size={12} /> Desfazer
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setReceivingItem(item);
                                  setReceiveDate(new Date().toISOString().split('T')[0]);
                                }}
                                title="Confirmar recebimento e somar em Receitas"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: '#ffffff',
                                  backgroundColor: '#15803d',
                                  border: 'none',
                                  borderRadius: 6,
                                  padding: '5px 10px',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 4px rgba(21, 128, 61, 0.2)',
                                }}
                              >
                                <Check size={12} /> Receber
                              </button>
                            )}

                            <button
                              onClick={() => openEditModal(item)}
                              title="Editar conta a receber"
                              style={{
                                color: '#94a3b8',
                                padding: 6,
                                borderRadius: 6,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                            >
                              <Pencil size={15} />
                            </button>

                            <button
                              onClick={() => setDeletingItem(item)}
                              title="Excluir conta a receber"
                              style={{
                                color: '#94a3b8',
                                padding: 6,
                                borderRadius: 6,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards (Responsive View) */}
        <div className="mobile-cards-wrapper">
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
              Carregando contas a receber...
            </div>
          ) : filteredReceivables.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Nenhuma conta a receber para este mês.
            </div>
          ) : (
            filteredReceivables.map((item) => (
              <div key={item.id} className="expense-mobile-item">
                <div className="expense-mobile-header">
                  <div className="expense-mobile-main">
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: item.isReceived ? 'rgba(21, 128, 61, 0.15)' : 'rgba(217, 119, 6, 0.15)',
                        color: item.isReceived ? '#15803d' : '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <HandCoins size={18} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span className="expense-mobile-title">{item.description}</span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 4,
                            backgroundColor: item.isReceived ? 'rgba(21, 128, 61, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                            color: item.isReceived ? '#15803d' : '#d97706',
                          }}
                        >
                          {item.isReceived ? 'Recebido' : 'Pendente'}
                        </span>
                      </div>
                      <div className="expense-mobile-subtitle">
                        <span>Vence em {formatDate(item.dueDate)}</span>
                        {item.payer && <span>• {item.payer}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="expense-mobile-actions">
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: item.isReceived ? '#15803d' : '#d97706',
                        textAlign: 'right',
                        marginBottom: 6,
                      }}
                    >
                      {formatCurrency(item.amount)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      {item.isReceived ? (
                        <button
                          onClick={() => handleToggleBackToPending(item)}
                          className="btn-secondary"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                        >
                          Desfazer
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setReceivingItem(item);
                            setReceiveDate(new Date().toISOString().split('T')[0]);
                          }}
                          className="btn-primary"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                        >
                          Receber
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(item)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', padding: 4 }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeletingItem(item)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', padding: 4 }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* =========================================================
         MODAL 1: CADASTRAR CONTA A RECEBER
         ========================================================= */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Cadastrar conta a receber"
        subtitle="Informe os dados da previsão de entrada financeira."
        icon={<HandCoins size={22} />}
        maxWidth="500px"
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Descrição *</label>
            <input
              type="text"
              required
              placeholder="Ex: Consultoria técnica, Venda do sofá, Reembolso"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="input-field"
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 12 }}>
            <div>
              <label className="form-label">Valor a receber *</label>
              <div className="currency-input-wrapper">
                <span className="currency-input-prefix">R$</span>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="currency-input-field"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Data prevista *</label>
              <input
                type="date"
                required
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">De quem vai receber <span style={{ color: '#94a3b8' }}>(opc.)</span></label>
              <input
                type="text"
                placeholder="Ex: João Silva, Cliente X"
                value={formPayer}
                onChange={(e) => setFormPayer(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="form-label">Categoria</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="input-field"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Observações adicionais <span style={{ color: '#94a3b8' }}>(opc.)</span></label>
            <textarea
              rows={2}
              placeholder="Ex: Pagamento combinado via PIX"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="input-field"
              style={{ resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" className="btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Salvando...' : 'Salvar conta'}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
         MODAL 2: EDITAR CONTA A RECEBER
         ========================================================= */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Editar conta a receber"
        subtitle="Atualize os valores e informações da entrada prevista."
        icon={<Pencil size={22} />}
        maxWidth="500px"
      >
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Descrição *</label>
            <input
              type="text"
              required
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="input-field"
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 12 }}>
            <div>
              <label className="form-label">Valor a receber *</label>
              <div className="currency-input-wrapper">
                <span className="currency-input-prefix">R$</span>
                <input
                  type="text"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="currency-input-field"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Data prevista *</label>
              <input
                type="date"
                required
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">De quem vai receber</label>
              <input
                type="text"
                value={formPayer}
                onChange={(e) => setFormPayer(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="form-label">Categoria</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="input-field"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Observações</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="input-field"
              style={{ resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" className="btn-secondary" onClick={() => setEditingItem(null)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
         MODAL 3: CONFIRMAR RECEBIMENTO
         ========================================================= */}
      <Modal
        isOpen={!!receivingItem}
        onClose={() => setReceivingItem(null)}
        title="Confirmar recebimento"
        subtitle="O valor será somado e listado na seção de Receitas."
        icon={<CheckCircle2 size={22} />}
        maxWidth="460px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: '16px',
              borderRadius: 12,
              backgroundColor: 'rgba(21, 128, 61, 0.08)',
              border: '1px solid rgba(21, 128, 61, 0.2)',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>Valor a receber</span>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
              {formatCurrency(receivingItem?.amount || 0)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-main, #0f172a)', marginTop: 4, fontWeight: 600 }}>
              {receivingItem?.description}
            </div>
            {receivingItem?.payer && (
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Pagador: <strong>{receivingItem.payer}</strong>
              </div>
            )}
          </div>

          <div>
            <label className="form-label">Data do recebimento efetivo</label>
            <input
              type="date"
              required
              value={receiveDate}
              onChange={(e) => setReceiveDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div
            style={{
              fontSize: 12,
              color: 'var(--text-secondary, #64748b)',
              lineHeight: 1.5,
              backgroundColor: 'var(--bg-app, #f8fafc)',
              padding: '10px 14px',
              borderRadius: 8,
            }}
          >
            ℹ️ Ao confirmar, o status desta conta mudará para <strong>Recebido</strong> e uma entrada de receita será automaticamente gerada em seu extrato de <strong>Receitas</strong>.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" className="btn-secondary" onClick={() => setReceivingItem(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleConfirmReceipt}
              disabled={actionLoading}
              style={{ gap: 6 }}
            >
              {actionLoading ? 'Confirmando...' : (
                <>
                  <Check size={16} /> Confirmar recebimento
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir conta a receber"
        itemDescription={deletingItem?.description}
        loading={actionLoading}
      />
    </div>
  );
};
