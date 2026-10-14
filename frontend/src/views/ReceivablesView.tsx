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
  SlidersHorizontal,
  Calendar,
  Tag,
  Tv,
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
  baseAmount?: number;
  adjustedBaseAmount?: number;
  hasCustomAmount?: boolean;
  hasAdjustment?: boolean;
  adjustmentDetails?: {
    startMonth: number;
    startYear: number;
    amount: number;
  } | null;
  dueDate: string;
  dueDay?: number;
  endDate?: string | null;
  isRecurring?: boolean;
  isSale?: boolean;
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
  thirdPartyCount?: number;
  totalCount: number;
}

const CATEGORIES = [
  'Streaming',
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
    thirdPartyCount: 0,
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
  const [adjustingItem, setAdjustingItem] = useState<ReceivableItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustScope, setAdjustScope] = useState<'onward' | 'month' | 'all'>('onward');

  // Forms
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formIsSale, setFormIsSale] = useState(false);
  const [formPayer, setFormPayer] = useState('');
  const [formCategory, setFormCategory] = useState('Streaming');
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
          thirdPartyCount: 0,
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
    setFormEndDate('');
    setFormIsRecurring(false);
    setFormIsSale(false);
    setFormPayer('');
    setFormCategory('Streaming');
    setFormNotes('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (item: ReceivableItem) => {
    setEditingItem(item);
    // Remove redundant payer name prefix if present
    let desc = item.description;
    if (item.payer && desc.startsWith(`${item.payer} - `)) {
      desc = desc.replace(`${item.payer} - `, '');
    }
    setFormDesc(desc);
    setFormAmount(String(item.baseAmount ?? item.amount));
    setFormDueDate(item.dueDate ? item.dueDate.split('T')[0] : '');
    setFormEndDate(item.endDate ? item.endDate.split('T')[0] : '');
    setFormIsRecurring(Boolean(item.isRecurring));
    setFormIsSale(Boolean(item.isSale));
    setFormPayer(item.payer || '');
    setFormCategory(item.category || 'Streaming');
    setFormNotes(item.notes || '');
  };

  const openAdjustModal = (item: ReceivableItem) => {
    setAdjustingItem(item);
    setAdjustAmount(String(item.amount));
    setAdjustScope('onward');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc.trim() || !formAmount || !formDueDate) return;

    try {
      setActionLoading(true);
      await api.createReceivable({
        description: formDesc.trim(),
        amount: parseFloat(formAmount.replace(',', '.')),
        dueDate: formDueDate,
        endDate: formEndDate ? formEndDate : null,
        isRecurring: formIsRecurring || Boolean(formEndDate),
        isSale: formIsSale,
        payer: formPayer.trim() || null,
        category: formCategory,
        notes: formNotes.trim() || null,
      });

      setIsCreateModalOpen(false);
      await fetchReceivables();
      onDataChanged?.();
      showToast('Conta a receber cadastrada com sucesso!');
    } catch (err) {
      console.error('Error creating receivable:', err);
      alert('Erro ao cadastrar conta a receber.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !formDesc.trim() || !formAmount || !formDueDate) return;

    try {
      setActionLoading(true);
      await api.updateReceivable(editingItem.id, {
        description: formDesc.trim(),
        amount: parseFloat(formAmount.replace(',', '.')),
        dueDate: formDueDate,
        endDate: formEndDate ? formEndDate : null,
        isRecurring: formIsRecurring || Boolean(formEndDate),
        isSale: formIsSale,
        payer: formPayer.trim() || null,
        category: formCategory,
        notes: formNotes.trim() || null,
      });

      setEditingItem(null);
      await fetchReceivables();
      onDataChanged?.();
      showToast('Conta a receber atualizada com sucesso!');
    } catch (err) {
      console.error('Error updating receivable:', err);
      alert('Erro ao atualizar conta a receber.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem || !adjustAmount) return;

    try {
      setActionLoading(true);
      await api.adjustReceivableAmount(adjustingItem.id, {
        month: selectedMonth.month,
        year: selectedMonth.year,
        amount: parseFloat(adjustAmount.replace(',', '.')),
        scope: adjustScope,
      });

      setAdjustingItem(null);
      await fetchReceivables();
      onDataChanged?.();
      showToast('Valor ajustado com sucesso!');
    } catch (err) {
      console.error('Error adjusting receivable amount:', err);
      alert('Erro ao ajustar valor.');
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
      showToast('Conta a receber excluída.');
    } catch (err) {
      console.error('Error deleting receivable:', err);
      alert('Erro ao excluir conta a receber.');
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
        receivedAt: receiveDate,
        month: selectedMonth.month,
        year: selectedMonth.year,
      });

      const amountFormatted = formatCurrency(receivingItem.amount);
      const isSale = receivingItem.isSale;
      setReceivingItem(null);
      await fetchReceivables();
      onDataChanged?.();

      if (isSale) {
        showToast(`Recebimento registrado! Como é uma venda, o valor de ${amountFormatted} foi adicionado à sua seção de Minha renda.`);
      } else {
        showToast(`Recebimento confirmado! O valor de ${amountFormatted} foi marcado como recebido (sem gerar renda pessoal).`);
      }
    } catch (err) {
      console.error('Error confirming receipt:', err);
      alert('Erro ao confirmar recebimento.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBackToPending = async (item: ReceivableItem) => {
    try {
      setActionLoading(true);
      await api.toggleReceivableReceived(item.id, {
        isReceived: false,
        month: selectedMonth.month,
        year: selectedMonth.year,
      });

      await fetchReceivables();
      onDataChanged?.();
      if (item.isSale) {
        showToast('Recebimento desfeito. O lançamento correspondente foi removido de Minha renda.');
      } else {
        showToast('Status revertido para pendente com sucesso.');
      }
    } catch (err) {
      console.error('Error undoing receipt:', err);
      alert('Erro ao desfazer recebimento.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered list
  const filteredReceivables = receivables.filter((item) => {
    if (statusFilter === 'pending' && item.isReceived) return false;
    if (statusFilter === 'received' && !item.isReceived) return false;
    if (statusFilter === 'thirdParty') {
      const isCard = Boolean(item.creditCardPurchaseId) || item.category === 'Cartão de Terceiros';
      if (!isCard) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchPayer = (item.payer || '').toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      if (!matchDesc && !matchPayer && !matchCat) return false;
    }

    return true;
  });

  const thirdPartyCount = summary.thirdPartyCount ?? receivables.filter((r) => Boolean(r.creditCardPurchaseId) || r.category === 'Cartão de Terceiros').length;

  return (
    <div className="content-container animate-fade-in">
      {/* Toast Alert */}
      {successToast && (
        <div
          style={{
            position: 'fixed',
            top: 85,
            right: 24,
            zIndex: 9999,
            backgroundColor: '#15803d',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
            maxWidth: 420,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successToast}</span>
        </div>
      )}

      {/* View Header */}
      <div className="view-header-row">
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--text-muted, #64748b)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            ENTRADAS PREVISTAS
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-main, #0f172a)', letterSpacing: '-0.5px', margin: 0 }}>
            Contas a receber
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted, #64748b)', marginTop: 4, margin: 0 }}>
            Gerencie o que tem para receber de devedores, assinaturas de streaming e compras de terceiros.
          </p>
        </div>

        <button className="btn-primary" onClick={openCreateModal}>
          <Plus size={18} /> Nova conta a receber
        </button>
      </div>

      {/* Month Selector Tabs */}
      <MonthSelector
        selectedMonth={selectedMonth}
        onSelectMonth={(m) => setSelectedMonth(m)}
        createdAt={user?.createdAt}
      />

      {/* Hero Banner with Integrated Info */}
      <div
        className="hero-card-banner"
        style={{
          background: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)',
          boxShadow: '0 6px 18px rgba(67, 56, 202, 0.25)',
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.85)', marginBottom: 6 }}>
            Total pendente a receber em {selectedMonth.label}
          </div>
          <div className="hero-amount" style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
            {formatCurrency(summary.totalPending)}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span>{summary.pendingCount} conta(s) pendente(s)</span>
            <span>•</span>
            <span>{formatCurrency(summary.totalReceived)} já recebidos</span>
          </div>
        </div>

        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: 16,
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          <HandCoins size={36} />
        </div>
      </div>

      {/* Quick Summary Cards (KPIs) */}
      <div className="stats-grid" style={{ marginTop: 24 }}>
        {/* KPI 1: Pendentes */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
              Pendente no mês
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
            {summary.pendingCount} conta(s) em aberto para cobrar
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
            {summary.receivedCount} conta(s) recebida(s)
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
              Contas de {selectedMonth.label}/{selectedMonth.year}
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

        {/* Desktop Table View */}
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

                    // Ensure payer name is not duplicated in description
                    let cleanDesc = item.description;
                    if (item.payer && cleanDesc.startsWith(`${item.payer} - `)) {
                      cleanDesc = cleanDesc.replace(`${item.payer} - `, '');
                    }

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span>{cleanDesc}</span>
                              {item.isSale && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    backgroundColor: '#dcfce7',
                                    color: '#15803d',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                  }}
                                  title="Esta conta é uma Venda (soma em Minha renda ao receber)"
                                >
                                  <Tag size={10} /> Venda
                                </span>
                              )}
                              {item.isRecurring && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                    color: '#4f46e5',
                                  }}
                                  title={item.endDate ? `Repete todo mês até ${formatDate(item.endDate)}` : 'Repete todo mês'}
                                >
                                  Recorrente
                                </span>
                              )}
                            </div>

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
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              backgroundColor: item.category === 'Streaming' ? '#f3e8ff' : 'var(--bg-card, #ffffff)',
                              color: item.category === 'Streaming' ? '#7c3aed' : 'var(--text-secondary, #475569)',
                              border: item.category === 'Streaming' ? '1px solid #d8b4fe' : '1px solid var(--border-color, #e2e8f0)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {item.category === 'Streaming' && <Tv size={11} />}
                            {item.category}
                          </span>
                        </td>

                        {/* Vencimento */}
                        <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-main, #0f172a)' }}>
                          {formatDate(item.dueDate)}
                        </td>

                        {/* Valor */}
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: item.isReceived ? '#15803d' : 'var(--text-main, #0f172a)' }}>
                            {formatCurrency(item.amount)}
                          </div>
                          {item.hasAdjustment && (
                            <span style={{ fontSize: 10, color: '#15803d', fontWeight: 600 }}>
                              Reajustado
                            </span>
                          )}
                          {item.hasCustomAmount && (
                            <span style={{ fontSize: 10, color: '#b45309', fontWeight: 600 }}>
                              Ajuste do mês
                            </span>
                          )}
                        </td>

                        {/* Ações */}
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            {/* Ajustar Mês Button */}
                            <button
                              type="button"
                              onClick={() => openAdjustModal(item)}
                              title="Ajustar valor desta conta"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                padding: '4px 8px',
                                borderRadius: 6,
                                backgroundColor: item.hasAdjustment ? '#ecfdf5' : item.hasCustomAmount ? '#fef3c7' : 'transparent',
                                color: item.hasAdjustment ? '#15803d' : item.hasCustomAmount ? '#b45309' : 'var(--text-muted, #64748b)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: '1px solid var(--border-input, #cbd5e1)',
                              }}
                            >
                              <SlidersHorizontal size={12} />
                              Ajustar
                            </button>

                            {item.isReceived ? (
                              <button
                                onClick={() => handleToggleBackToPending(item)}
                                title="Desfazer recebimento"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: 'var(--text-muted, #64748b)',
                                  backgroundColor: 'transparent',
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
                                title="Confirmar recebimento"
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

        {/* Mobile View: Enhanced Responsive Cards */}
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
            filteredReceivables.map((item) => {
              const isCardThirdParty = Boolean(item.creditCardPurchaseId) || item.category === 'Cartão de Terceiros';

              let cleanDesc = item.description;
              if (item.payer && cleanDesc.startsWith(`${item.payer} - `)) {
                cleanDesc = cleanDesc.replace(`${item.payer} - `, '');
              }

              return (
                <div key={item.id} className="receivables-mobile-card">
                  {/* Top Row: Icon + Title + Amount */}
                  <div className="receivables-mobile-header">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          backgroundColor: item.category === 'Streaming'
                            ? '#f3e8ff'
                            : item.isReceived
                            ? 'rgba(21, 128, 61, 0.15)'
                            : 'rgba(217, 119, 6, 0.15)',
                          color: item.category === 'Streaming'
                            ? '#7c3aed'
                            : item.isReceived
                            ? '#15803d'
                            : '#d97706',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        {item.category === 'Streaming' ? <Tv size={18} /> : isCardThirdParty ? <CreditCard size={18} /> : <HandCoins size={18} />}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main, #0f172a)', wordBreak: 'break-word', lineHeight: 1.3 }}>
                          {cleanDesc}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          {/* Status Pill */}
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: item.isReceived ? 'rgba(21, 128, 61, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                              color: item.isReceived ? '#15803d' : '#d97706',
                            }}
                          >
                            {item.isReceived ? '✓ Recebido' : '⏳ Pendente'}
                          </span>

                          {/* Category */}
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: 'var(--bg-app, #f1f5f9)',
                              color: 'var(--text-secondary, #64748b)',
                            }}
                          >
                            {item.category}
                          </span>

                          {/* Venda Badge */}
                          {item.isSale && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: 4,
                                backgroundColor: '#dcfce7',
                                color: '#15803d',
                              }}
                            >
                              🏷️ Venda
                            </span>
                          )}

                          {item.isRecurring && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: 4,
                                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                color: '#4f46e5',
                              }}
                            >
                              Recorrente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: item.isReceived ? '#15803d' : 'var(--text-main, #0f172a)',
                        }}
                      >
                        {formatCurrency(item.amount)}
                      </div>
                      {item.hasAdjustment && (
                        <div style={{ fontSize: 10, color: '#15803d', fontWeight: 600, marginTop: 1 }}>
                          Reajustado
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Info Row: Payer & Due Date (Payer shown strictly ONCE) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                      fontSize: 12,
                      color: 'var(--text-muted, #64748b)',
                      backgroundColor: 'var(--bg-item, #f8fafc)',
                      padding: '8px 10px',
                      borderRadius: 8,
                    }}
                  >
                    <div>
                      <span>Vencimento: </span>
                      <strong style={{ color: 'var(--text-main, #0f172a)' }}>{formatDate(item.dueDate)}</strong>
                    </div>

                    {item.payer && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Users size={12} color="#64748b" />
                        <span>Devedor: </span>
                        <strong style={{ color: 'var(--text-main, #0f172a)' }}>{item.payer}</strong>
                      </div>
                    )}
                  </div>

                  {/* Footer Row: Actions */}
                  <div className="receivables-mobile-footer">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {/* Ajustar Button */}
                      <button
                        type="button"
                        onClick={() => openAdjustModal(item)}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '5px 9px',
                          borderRadius: 6,
                          border: '1px solid var(--border-input, #cbd5e1)',
                          backgroundColor: 'transparent',
                          color: 'var(--text-secondary, #475569)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <SlidersHorizontal size={12} />
                        Ajustar
                      </button>

                      {/* Receber / Desfazer Button */}
                      {item.isReceived ? (
                        <button
                          type="button"
                          onClick={() => handleToggleBackToPending(item)}
                          className="btn-secondary"
                          style={{ fontSize: 11, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <RotateCcw size={12} /> Desfazer
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setReceivingItem(item);
                            setReceiveDate(new Date().toISOString().split('T')[0]);
                          }}
                          className="btn-primary"
                          style={{ fontSize: 11, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Check size={12} /> Receber
                        </button>
                      )}
                    </div>

                    {/* Edit and Delete Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        title="Editar"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted, #94a3b8)',
                          padding: 6,
                          cursor: 'pointer',
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingItem(item)}
                        title="Excluir"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          padding: 6,
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
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
        maxWidth="520px"
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Descrição *</label>
            <input
              type="text"
              required
              placeholder="Ex: Netflix divisão amigos, Aluguel quitinete, Venda da bike..."
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
              <label className="form-label">Primeiro vencimento *</label>
              <input
                type="date"
                required
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Data Final & Recorrência (Modelo Contas a pagar) */}
          <div style={{ backgroundColor: 'var(--bg-app, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                <input
                  type="checkbox"
                  checked={formIsRecurring}
                  onChange={(e) => setFormIsRecurring(e.target.checked)}
                  style={{ accentColor: '#4338ca', width: 16, height: 16 }}
                />
                Repetir este recebimento todo mês (Recorrente)
              </label>
            </div>

            {formIsRecurring && (
              <div style={{ marginTop: 8 }}>
                <label className="form-label">
                  Data final <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="input-field"
                />
                <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block', lineHeight: 1.4 }}>
                  Deixe em branco para repetir todo mês indefinidamente. Ao definir uma data final, o valor se repetirá todo mês até a data fim indicada.
                </span>
              </div>
            )}
          </div>

          {/* Opção Venda (Somar em Minha Renda) */}
          <div
            style={{
              backgroundColor: formIsSale ? 'rgba(21, 128, 61, 0.08)' : 'var(--bg-app, #f8fafc)',
              border: formIsSale ? '2px solid #16a34a' : '1px solid var(--border-color, #e2e8f0)',
              borderRadius: 10,
              padding: '12px 14px',
              transition: 'all 0.2s ease',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formIsSale}
                onChange={(e) => setFormIsSale(e.target.checked)}
                style={{ accentColor: '#16a34a', width: 18, height: 18, marginTop: 2 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: formIsSale ? '#15803d' : 'var(--text-main, #0f172a)' }}>
                  Esta conta é uma Venda (somar e listar em Minha renda ao receber)
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #64748b)', marginTop: 2, lineHeight: 1.4 }}>
                  💡 <strong>Importante:</strong> Marque somente se for venda de produto ou serviço. Reembolsos de cartões, empréstimos ou divisões de assinaturas não são vendas e não geram receita pessoal.
                </div>
              </div>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Categoria</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="input-field"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                De quem vai receber? <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ex: João, Maria, Cliente..."
                value={formPayer}
                onChange={(e) => setFormPayer(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="form-label">
              Observações <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Chave Pix dele é 11999999999, cobrar todo dia 10..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="input-field"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={actionLoading}
            >
              {actionLoading ? 'Salvando...' : 'Salvar conta a receber'}
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
        subtitle="Altere as informações desta entrada prevista."
        icon={<Pencil size={22} />}
        maxWidth="520px"
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
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 12 }}>
            <div>
              <label className="form-label">Valor base *</label>
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
              <label className="form-label">Vencimento *</label>
              <input
                type="date"
                required
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Data Final & Recorrência */}
          <div style={{ backgroundColor: 'var(--bg-app, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 10, padding: '12px 14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
              <input
                type="checkbox"
                checked={formIsRecurring}
                onChange={(e) => setFormIsRecurring(e.target.checked)}
                style={{ accentColor: '#4338ca', width: 16, height: 16 }}
              />
              Repetir este recebimento todo mês (Recorrente)
            </label>

            {formIsRecurring && (
              <div style={{ marginTop: 8 }}>
                <label className="form-label">
                  Data final <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="input-field"
                />
                <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block' }}>
                  Deixe em branco para repetir indefinidamente ou selecione a data final.
                </span>
              </div>
            )}
          </div>

          {/* Opção Venda */}
          <div
            style={{
              backgroundColor: formIsSale ? 'rgba(21, 128, 61, 0.08)' : 'var(--bg-app, #f8fafc)',
              border: formIsSale ? '2px solid #16a34a' : '1px solid var(--border-color, #e2e8f0)',
              borderRadius: 10,
              padding: '12px 14px',
              transition: 'all 0.2s ease',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formIsSale}
                onChange={(e) => setFormIsSale(e.target.checked)}
                style={{ accentColor: '#16a34a', width: 18, height: 18, marginTop: 2 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: formIsSale ? '#15803d' : 'var(--text-main, #0f172a)' }}>
                  Esta conta é uma Venda (somar e listar em Minha renda ao receber)
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #64748b)', marginTop: 2, lineHeight: 1.4 }}>
                  Marque somente se for venda. Cobranças de terceiros no cartão e reembolsos NÃO geram renda pessoal.
                </div>
              </div>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Categoria</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="input-field"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Devedor / Pagador</label>
              <input
                type="text"
                value={formPayer}
                onChange={(e) => setFormPayer(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Observações</label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="input-field"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditingItem(null)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={actionLoading}
            >
              {actionLoading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
         MODAL 3: AJUSTAR OU REAJUSTAR VALOR DO MÊS / FUTUROS (Modelo Contas a pagar)
         ========================================================= */}
      <Modal
        isOpen={!!adjustingItem}
        onClose={() => setAdjustingItem(null)}
        title="Ajustar ou Reajustar Valor"
        subtitle={`${adjustingItem?.description} em ${selectedMonth.label}/${selectedMonth.year}`}
        icon={<SlidersHorizontal size={22} />}
        maxWidth="500px"
      >
        <form onSubmit={handleSaveAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">
              Novo valor para o recebimento
            </label>
            <div className="currency-input-wrapper">
              <span className="currency-input-prefix">R$</span>
              <input
                type="text"
                required
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="0,00"
                autoFocus
                className="currency-input-field"
                style={{ fontSize: 18, fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Scope Selector: Escolha de vigência do ajuste */}
          {adjustingItem?.isRecurring ? (
            <div>
              <label className="form-label" style={{ marginBottom: 8 }}>
                Como deseja aplicar este novo valor?
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Opção 1: Reajuste a partir deste mês em diante */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: adjustScope === 'onward' ? '2px solid #16a34a' : '1px solid var(--border-color, #e2e8f0)',
                    backgroundColor: adjustScope === 'onward' ? 'rgba(22, 163, 74, 0.08)' : 'var(--bg-item, #f8fafc)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="adjustScope"
                    value="onward"
                    checked={adjustScope === 'onward'}
                    onChange={() => setAdjustScope('onward')}
                    style={{ marginTop: 3, accentColor: '#16a34a' }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: adjustScope === 'onward' ? '#15803d' : 'var(--text-main, #0f172a)' }}>
                      Reajustar a partir deste mês ({selectedMonth.label}/{selectedMonth.year}) em diante
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted, #64748b)', marginTop: 2, lineHeight: 1.4 }}>
                      🌟 <strong>Ideal para Streaming e Assinaturas:</strong> Altera o valor de {selectedMonth.label}/{selectedMonth.year} para todos os meses futuros automaticamente, preservando o histórico passado.
                    </div>
                  </div>
                </label>

                {/* Opção 2: Apenas neste mês */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: adjustScope === 'month' ? '2px solid #2563eb' : '1px solid var(--border-color, #e2e8f0)',
                    backgroundColor: adjustScope === 'month' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-item, #f8fafc)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="adjustScope"
                    value="month"
                    checked={adjustScope === 'month'}
                    onChange={() => setAdjustScope('month')}
                    style={{ marginTop: 3, accentColor: '#2563eb' }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: adjustScope === 'month' ? '#1e40af' : 'var(--text-main, #0f172a)' }}>
                      Apenas neste mês ({selectedMonth.label}/{selectedMonth.year})
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted, #64748b)', marginTop: 2, lineHeight: 1.4 }}>
                      Modifica apenas o recebimento deste mês pontualmente, sem afetar outros meses.
                    </div>
                  </div>
                </label>

                {/* Opção 3: Alterar valor padrão geral */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: adjustScope === 'all' ? '2px solid #475569' : '1px solid var(--border-color, #e2e8f0)',
                    backgroundColor: adjustScope === 'all' ? 'rgba(71, 85, 105, 0.08)' : 'var(--bg-item, #f8fafc)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="adjustScope"
                    value="all"
                    checked={adjustScope === 'all'}
                    onChange={() => setAdjustScope('all')}
                    style={{ marginTop: 3, accentColor: '#475569' }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: adjustScope === 'all' ? '#0f172a' : 'var(--text-main, #0f172a)' }}>
                      Alterar valor padrão geral (todos os meses)
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted, #64748b)', marginTop: 2, lineHeight: 1.4 }}>
                      Altera o valor cadastrado original da conta em todo o sistema.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)' }}>
              Esta conta é pontual. O novo valor será atualizado diretamente no registro.
            </div>
          )}

          {adjustingItem && (
            <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', backgroundColor: 'var(--bg-item, #f8fafc)', padding: '8px 12px', borderRadius: 8 }}>
              Valor original cadastrado: <strong>{formatCurrency(adjustingItem.baseAmount ?? adjustingItem.amount)}</strong>
              {adjustingItem.hasAdjustment && adjustingItem.adjustmentDetails && (
                <span> • Reajustado para {formatCurrency(adjustingItem.adjustmentDetails.amount)} em {adjustingItem.adjustmentDetails.startMonth}/{adjustingItem.adjustmentDetails.startYear}</span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setAdjustingItem(null)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={actionLoading}
            >
              {actionLoading ? 'Salvando...' : 'Salvar ajuste'}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
         MODAL 4: CONFIRMAR RECEBIMENTO
         ========================================================= */}
      <Modal
        isOpen={!!receivingItem}
        onClose={() => setReceivingItem(null)}
        title="Confirmar recebimento"
        subtitle={receivingItem?.isSale ? 'O valor será somado e listado em Minha renda.' : 'O status será atualizado para recebido.'}
        icon={<CheckCircle2 size={22} />}
        maxWidth="440px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              backgroundColor: 'var(--bg-app, #f8fafc)',
              borderRadius: 12,
              padding: 16,
              border: '1px solid var(--border-color, #e2e8f0)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', marginBottom: 4 }}>
              Conta a receber
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
              {receivingItem?.description}
            </div>
            {receivingItem?.payer && (
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                Pagador: <strong>{receivingItem.payer}</strong>
              </div>
            )}
            <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d', marginTop: 8 }}>
              {receivingItem && formatCurrency(receivingItem.amount)}
            </div>
          </div>

          <div>
            <label className="form-label">Data em que o valor caiu na sua conta</label>
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
              color: receivingItem?.isSale ? '#15803d' : '#64748b',
              backgroundColor: receivingItem?.isSale ? '#f0fdf4' : 'var(--bg-item, #f8fafc)',
              padding: '10px 12px',
              borderRadius: 8,
              lineHeight: 1.4,
              border: receivingItem?.isSale ? '1px solid #bbf7d0' : '1px solid var(--border-color, #e2e8f0)',
            }}
          >
            {receivingItem?.isSale ? (
              <span>
                ℹ️ Esta conta está marcada como <strong>Venda</strong>. Ao confirmar, uma entrada será automaticamente adicionada em seu extrato de <strong>Minha renda</strong>, compondo seu saldo disponível.
              </span>
            ) : (
              <span>
                ℹ️ Esta conta é uma <strong>cobrança/reembolso</strong> (não é venda). O status mudará para recebido sem inflar sua renda pessoal.
              </span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setReceivingItem(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleConfirmReceipt}
              disabled={actionLoading}
            >
              {actionLoading ? 'Confirmando...' : 'Confirmar recebimento'}
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
