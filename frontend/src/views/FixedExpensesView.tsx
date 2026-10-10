import React, { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  CalendarCheck2,
  Check,
  Clock,
  Loader2,
  Copy,
  QrCode,
  Zap,
  TrendingUp,
  CreditCard,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { MonthSelector } from '../components/MonthSelector';
import { MonthItem, getInitialMonthItem } from '../utils/dateUtils';

interface FixedExpenseAdjustmentItem {
  id: string;
  startMonth: number;
  startYear: number;
  amount: number;
}

interface FixedExpense {
  id: string;
  description: string;
  amount: number;
  baseAmount?: number;
  adjustedBaseAmount?: number;
  hasCustomAmount?: boolean;
  isEstimated?: boolean;
  hasAdjustment?: boolean;
  adjustmentDetails?: {
    startMonth: number;
    startYear: number;
    amount: number;
  } | null;
  adjustments?: FixedExpenseAdjustmentItem[];
  dueDay: number;
  firstDueDate: string;
  endDate: string | null;
  category: string;
  pixKey?: string | null;
  isVariable?: boolean;
  variableType?: string | null;
  isPaid: boolean;
  paidAt: string | null;
}

const CATEGORIES = [
  'Moradia',
  'Serviços',
  'Saúde',
  'Educação',
  'Transporte',
  'Alimentação',
  'Lazer',
  'Streaming',
  'Cartão de Crédito',
  'Outros',
];

export const FixedExpensesView: React.FC<{ onDataChanged?: () => void }> = ({ onDataChanged }) => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<MonthItem>(() => getInitialMonthItem(user?.createdAt));
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [summary, setSummary] = useState({ totalAmount: 0, pendingAmount: 0, paidCount: 0, totalCount: 0 });
  const [monthVariableExpensesSum, setMonthVariableExpensesSum] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<FixedExpense | null>(null);
  const [adjustingMonthExpense, setAdjustingMonthExpense] = useState<FixedExpense | null>(null);
  const [adjustMonthAmount, setAdjustMonthAmount] = useState('');
  const [adjustScope, setAdjustScope] = useState<'month' | 'onward' | 'all'>('onward');
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formFirstDueDate, setFormFirstDueDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formCategory, setFormCategory] = useState('Moradia');
  const [formPixKey, setFormPixKey] = useState('');
  const [formIsVariable, setFormIsVariable] = useState(false);
  const [formVariableType, setFormVariableType] = useState('credit_card');
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);
  const [copiedFormPix, setCopiedFormPix] = useState(false);

  const handleCopyPix = async (id: string, key: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(key);
      } else {
        const ta = document.createElement('textarea');
        ta.value = key;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedPixId(id);
      setTimeout(() => setCopiedPixId(null), 2000);
    } catch (err) {
      console.error('Failed to copy Pix:', err);
    }
  };

  const handleCopyFormPix = async () => {
    if (!formPixKey) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(formPixKey);
      } else {
        const ta = document.createElement('textarea');
        ta.value = formPixKey;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedFormPix(true);
      setTimeout(() => setCopiedFormPix(false), 2000);
    } catch (err) {
      console.error('Failed to copy Pix:', err);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.getFixedExpenses(selectedMonth.month, selectedMonth.year);
      setExpenses(res.expenses || []);
      setSummary(res.summary || { totalAmount: 0, pendingAmount: 0, paidCount: 0, totalCount: 0 });
      setMonthVariableExpensesSum(res.monthVariableExpensesSum || 0);
    } catch (err) {
      console.error('Failed to load fixed expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth]);

  const openCreateModal = () => {
    setFormDesc('');
    setFormAmount('');
    const today = new Date().toISOString().split('T')[0];
    setFormFirstDueDate(today);
    setFormEndDate('');
    setFormCategory('Moradia');
    setFormPixKey('');
    setFormIsVariable(false);
    setFormVariableType('credit_card');
    setCopiedFormPix(false);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (exp: FixedExpense) => {
    setEditingExpense(exp);
    setFormDesc(exp.description);
    setFormAmount(String(exp.baseAmount ?? exp.amount));
    setFormFirstDueDate(exp.firstDueDate ? exp.firstDueDate.split('T')[0] : '');
    setFormEndDate(exp.endDate ? exp.endDate.split('T')[0] : '');
    setFormCategory(exp.category);
    setFormPixKey(exp.pixKey || '');
    setFormIsVariable(Boolean(exp.isVariable));
    setFormVariableType(exp.variableType || 'credit_card');
    setCopiedFormPix(false);
  };

  const openAdjustMonthModal = (exp: FixedExpense) => {
    setAdjustingMonthExpense(exp);
    setAdjustMonthAmount(String(exp.amount));
    if (exp.id.startsWith('card-invoice-') || exp.isVariable) {
      setAdjustScope('month');
    } else {
      setAdjustScope('onward');
    }
  };

  const handlePullVariableExpenses = () => {
    if (monthVariableExpensesSum > 0) {
      setAdjustMonthAmount(String(monthVariableExpensesSum));
      setAdjustScope('month');
    }
  };

  const handleSaveMonthAmount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingMonthExpense) return;
    try {
      setActionLoading(true);
      const isCard = adjustingMonthExpense.id.startsWith('card-invoice-');
      await api.updateFixedExpenseMonthAmount(adjustingMonthExpense.id, {
        month: selectedMonth.month,
        year: selectedMonth.year,
        amount: parseFloat(adjustMonthAmount.replace(',', '.')),
        scope: isCard ? 'month' : adjustScope,
      });
      setAdjustingMonthExpense(null);
      await fetchExpenses();
      onDataChanged?.();
    } catch (err) {
      console.error('Error updating month amount:', err);
      alert('Erro ao atualizar o valor para este mês.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetMonthAmount = async () => {
    if (!adjustingMonthExpense) return;
    try {
      setActionLoading(true);
      await api.updateFixedExpenseMonthAmount(adjustingMonthExpense.id, {
        month: selectedMonth.month,
        year: selectedMonth.year,
        amount: null,
        scope: adjustScope,
      });
      setAdjustingMonthExpense(null);
      await fetchExpenses();
      onDataChanged?.();
    } catch (err) {
      console.error('Error resetting month amount:', err);
      alert('Erro ao restaurar valor padrão.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc || !formAmount || !formFirstDueDate) return;

    try {
      setActionLoading(true);
      await api.createFixedExpense({
        description: formDesc,
        amount: parseFloat(formAmount.replace(',', '.')),
        firstDueDate: formFirstDueDate,
        endDate: formEndDate ? formEndDate : null,
        category: formCategory,
        pixKey: formPixKey.trim() || null,
        isVariable: formIsVariable,
        variableType: formIsVariable ? formVariableType : null,
      });
      setIsCreateModalOpen(false);
      await fetchExpenses();
      onDataChanged?.();
    } catch (err) {
      console.error('Error creating fixed expense:', err);
      alert('Erro ao cadastrar despesa fixa.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !formDesc || !formAmount || !formFirstDueDate) return;

    try {
      setActionLoading(true);
      await api.updateFixedExpense(editingExpense.id, {
        description: formDesc,
        amount: parseFloat(formAmount.replace(',', '.')),
        firstDueDate: formFirstDueDate,
        endDate: formEndDate ? formEndDate : null,
        category: formCategory,
        pixKey: formPixKey.trim() || null,
        isVariable: formIsVariable,
        variableType: formIsVariable ? formVariableType : null,
      });
      setEditingExpense(null);
      await fetchExpenses();
      onDataChanged?.();
    } catch (err) {
      console.error('Error updating fixed expense:', err);
      alert('Erro ao atualizar despesa fixa.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingExpense) return;
    try {
      setActionLoading(true);
      await api.deleteFixedExpense(deletingExpense.id);
      setDeletingExpense(null);
      await fetchExpenses();
      onDataChanged?.();
    } catch (err) {
      console.error('Error deleting fixed expense:', err);
      alert('Erro ao excluir despesa fixa.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePayment = async (exp: FixedExpense) => {
    try {
      const nextStatus = !exp.isPaid;
      // Optimistic update
      setExpenses((prev) =>
        prev.map((item) => (item.id === exp.id ? { ...item, isPaid: nextStatus } : item))
      );
      await api.toggleFixedExpensePayment(exp.id, {
        month: selectedMonth.month,
        year: selectedMonth.year,
        isPaid: nextStatus,
      });
      await fetchExpenses();
      onDataChanged?.();
    } catch (err) {
      console.error('Error toggling payment status:', err);
      await fetchExpenses();
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatPeriod = (exp: FixedExpense) => {
    const dayStr = `Dia ${exp.dueDay}`;
    if (!exp.endDate) {
      return `${dayStr} • sem data final`;
    }
    const end = new Date(exp.endDate);
    const monthsNames = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    return `${dayStr} • até ${end.getUTCDate()} de ${monthsNames[end.getUTCMonth()]}`;
  };

  return (
    <div className="content-container animate-fade-in">
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
            CONTROLE MENSAL
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-main, #0f172a)', letterSpacing: '-0.5px', margin: 0 }}>
            Despesas fixas
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted, #64748b)', marginTop: 4, margin: 0 }}>
            Cadastre compromissos recorrentes, gerencie reajustes e faturas variáveis mês a mês.
          </p>
        </div>

        <button className="btn-primary" onClick={openCreateModal}>
          <Plus size={18} /> Cadastrar despesa
        </button>
      </div>

      {/* Month selector pill bar */}
      <MonthSelector
        selectedMonth={selectedMonth}
        onSelectMonth={(m) => setSelectedMonth(m)}
        createdAt={user?.createdAt}
      />

      {/* 3 Summary Cards */}
      <div className="summary-cards-grid">
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', fontWeight: 500, marginBottom: 8 }}>
            Total do mês
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            {formatCurrency(summary.totalAmount)}
          </div>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', fontWeight: 500, marginBottom: 8 }}>
            Pendente
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: summary.pendingAmount > 0 ? '#b45309' : 'var(--text-main, #0f172a)' }}>
            {formatCurrency(summary.pendingAmount)}
          </div>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', fontWeight: 500, marginBottom: 8 }}>
            Pagas
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            {summary.paidCount} de {summary.totalCount}
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table Header Row */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0 }}>
              Compromissos de {selectedMonth.label} de {selectedMonth.year}
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
              {expenses.length} despesa{expenses.length !== 1 ? 's' : ''}
            </span>
          </div>

          {monthVariableExpensesSum > 0 && (
            <div
              style={{
                fontSize: 12,
                color: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                padding: '4px 10px',
                borderRadius: 8,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              title="Soma de todos os lançamentos em Despesas Variáveis neste mês"
            >
              <Zap size={13} />
              <span>Gastos variáveis deste mês: {formatCurrency(monthVariableExpensesSum)}</span>
            </div>
          )}
        </div>

        {/* Desktop Table */}
        <div className="desktop-table-wrapper">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 650 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)', backgroundColor: 'var(--bg-item, #fafbfc)' }}>
                  <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px' }}>
                    DESCRIÇÃO
                  </th>
                  <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px' }}>
                    CATEGORIA
                  </th>
                  <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px' }}>
                    PERÍODO
                  </th>
                  <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px' }}>
                    VALOR
                  </th>
                  <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px' }}>
                    STATUS
                  </th>
                  <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px', textAlign: 'right' }}>
                    AÇÕES
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="empty-row">
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                      <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                      Carregando despesas fixas...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr className="empty-row">
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                      Nenhuma despesa fixa cadastrada para este mês. Clique em "+ Cadastrar despesa" acima para adicionar.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr
                      key={exp.id}
                      className="data-table-row"
                    >
                      {/* Descrição with Orange Icon and Badges */}
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 8,
                              backgroundColor: exp.isVariable ? '#dbeafe' : '#ffedd5',
                              color: exp.isVariable ? '#2563eb' : '#ea580c',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {exp.isVariable ? <CreditCard size={17} /> : <CalendarCheck2 size={17} />}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                                {exp.description}
                              </span>
                              {exp.isVariable && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: 12,
                                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                    color: '#2563eb',
                                    border: '1px solid rgba(37, 99, 235, 0.25)',
                                  }}
                                  title="Despesa com valor que oscila mensalmente (fatura ou consumo)"
                                >
                                  Variável
                                </span>
                              )}
                            </div>

                            {exp.pixKey && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                <span
                                  className="pix-pill"
                                  title={`Chave Pix: ${exp.pixKey}`}
                                >
                                  <QrCode size={11} /> Pix: {exp.pixKey.length > 18 ? `${exp.pixKey.slice(0, 16)}...` : exp.pixKey}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPix(exp.id, exp.pixKey!)}
                                  title="Copiar chave Pix"
                                  className={`btn-pix-copy ${copiedPixId === exp.id ? 'copied' : ''}`}
                                >
                                  {copiedPixId === exp.id ? <Check size={11} /> : <Copy size={11} />}
                                  {copiedPixId === exp.id ? 'Copiado!' : 'Copiar'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Categoria */}
                      <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-muted, #64748b)' }}>
                        {exp.category}
                      </td>

                      {/* Período */}
                      <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-muted, #64748b)' }}>
                        {formatPeriod(exp)}
                      </td>

                      {/* Valor com opção de ajuste / reajuste */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                            {formatCurrency(exp.amount)}
                          </span>
                          <button
                            onClick={() => openAdjustMonthModal(exp)}
                            title="Ajustar fatura deste mês ou reajustar para todos os meses futuros (Netflix, Aluguel...)"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              padding: '3px 8px',
                              borderRadius: 6,
                              backgroundColor: exp.hasAdjustment
                                ? '#ecfdf5'
                                : exp.hasCustomAmount
                                ? '#fef3c7'
                                : exp.isEstimated
                                ? '#f0f9ff'
                                : 'var(--bg-item, #f8fafc)',
                              color: exp.hasAdjustment
                                ? '#15803d'
                                : exp.hasCustomAmount
                                ? '#b45309'
                                : exp.isEstimated
                                ? '#0284c7'
                                : '#475569',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: exp.hasAdjustment
                                ? '1px solid #a7f3d0'
                                : exp.hasCustomAmount
                                ? '1px solid #fde68a'
                                : exp.isEstimated
                                ? '1px solid #bae6fd'
                                : '1px solid var(--border-color, #e2e8f0)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Pencil size={11} />
                            {exp.hasAdjustment
                              ? 'Reajustado'
                              : exp.hasCustomAmount
                              ? 'Fatura fechada'
                              : exp.isEstimated
                              ? 'Estimado'
                              : 'Ajustar'}
                          </button>
                        </div>
                        {exp.hasAdjustment && exp.adjustmentDetails && (
                          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2, fontWeight: 600 }}>
                            Reajustado desde {exp.adjustmentDetails.startMonth}/{exp.adjustmentDetails.startYear}
                          </div>
                        )}
                        {exp.hasCustomAmount && (
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            Padrão: {formatCurrency(exp.adjustedBaseAmount ?? exp.baseAmount ?? exp.amount)}
                          </div>
                        )}
                        {!exp.hasCustomAmount && exp.isEstimated && (
                          <div style={{ fontSize: 11, color: '#0284c7', marginTop: 2, fontWeight: 500 }}>
                            Projeção automática
                          </div>
                        )}
                      </td>

                      {/* Status Badge (Clickable Toggle) */}
                      <td style={{ padding: '16px 20px' }}>
                        <button
                          onClick={() => handleTogglePayment(exp)}
                          title="Clique para alternar status de pagamento"
                          className={exp.isPaid ? 'badge-paid' : 'badge-pending'}
                          style={{ cursor: 'pointer', transition: 'transform 0.1s' }}
                        >
                          {exp.isPaid ? (
                            <>
                              <Check size={13} /> Pago
                            </>
                          ) : (
                            <>
                              <Clock size={13} /> Pendente
                            </>
                          )}
                        </button>
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            onClick={() => (exp.id.startsWith('card-invoice-') ? openAdjustMonthModal(exp) : openEditModal(exp))}
                            title={exp.id.startsWith('card-invoice-') ? 'Ajustar valor da fatura deste mês' : 'Editar cadastro'}
                            style={{
                              color: '#94a3b8',
                              padding: 6,
                              borderRadius: 6,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                          >
                            <Pencil size={16} />
                          </button>
                          {!exp.id.startsWith('card-invoice-') && (
                            <button
                              onClick={() => setDeletingExpense(exp)}
                              title="Excluir"
                              style={{
                                color: '#94a3b8',
                                padding: 6,
                                borderRadius: 6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards (Responsive compact cards) */}
        <div className="mobile-cards-wrapper">
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
              Carregando despesas fixas...
            </div>
          ) : expenses.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Nenhuma despesa fixa cadastrada para este mês.
            </div>
          ) : (
            expenses.map((exp) => (
              <div key={exp.id} className="expense-mobile-item">
                <div className="expense-mobile-header">
                  <div className="expense-mobile-main">
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: exp.isVariable ? '#dbeafe' : '#ffedd5',
                        color: exp.isVariable ? '#2563eb' : '#ea580c',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {exp.isVariable ? <CreditCard size={18} /> : <CalendarCheck2 size={18} />}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span className="expense-mobile-title">{exp.description}</span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 4,
                            backgroundColor: 'var(--bg-item, #f1f5f9)',
                            color: 'var(--text-muted, #475569)',
                          }}
                        >
                          {exp.category}
                        </span>
                        {exp.isVariable && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              backgroundColor: 'rgba(37, 99, 235, 0.1)',
                              color: '#2563eb',
                            }}
                          >
                            Variável
                          </span>
                        )}
                        {exp.hasAdjustment && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              backgroundColor: '#ecfdf5',
                              color: '#15803d',
                            }}
                          >
                            Reajustado
                          </span>
                        )}
                        {exp.hasCustomAmount && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                            }}
                            title="Valor ajustado no mês"
                          >
                            Fechada
                          </span>
                        )}
                      </div>
                      <div className="expense-mobile-subtitle">
                        <span>{formatPeriod(exp)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Paid/Pending Toggle */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                      {formatCurrency(exp.amount)}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <button
                        onClick={() => handleTogglePayment(exp)}
                        title="Alternar pagamento"
                        className={exp.isPaid ? 'badge-paid' : 'badge-pending'}
                        style={{ cursor: 'pointer', fontSize: 11, padding: '2px 8px' }}
                      >
                        {exp.isPaid ? (
                          <>
                            <Check size={12} /> Pago
                          </>
                        ) : (
                          <>
                            <Clock size={12} /> Pendente
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pix row if present */}
                {exp.pixKey && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingLeft: 48 }}>
                    <span className="pix-pill" title={`Chave Pix: ${exp.pixKey}`}>
                      <QrCode size={11} /> Pix: {exp.pixKey.length > 20 ? `${exp.pixKey.slice(0, 18)}...` : exp.pixKey}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyPix(exp.id, exp.pixKey!)}
                      title="Copiar chave Pix"
                      className={`btn-pix-copy ${copiedPixId === exp.id ? 'copied' : ''}`}
                    >
                      {copiedPixId === exp.id ? <Check size={11} /> : <Copy size={11} />}
                      {copiedPixId === exp.id ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                )}

                {/* Footer: Month adjustment & actions */}
                <div className="expense-mobile-footer">
                  <button
                    onClick={() => openAdjustMonthModal(exp)}
                    title="Ajustar valor do mês ou reajustar para meses futuros"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 6,
                      backgroundColor: exp.hasAdjustment
                        ? '#ecfdf5'
                        : exp.hasCustomAmount
                        ? '#fef3c7'
                        : exp.isEstimated
                        ? '#f0f9ff'
                        : 'transparent',
                      color: exp.hasAdjustment
                        ? '#15803d'
                        : exp.hasCustomAmount
                        ? '#b45309'
                        : exp.isEstimated
                        ? '#0284c7'
                        : 'var(--text-muted, #64748b)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: exp.hasAdjustment
                        ? '1px solid #a7f3d0'
                        : exp.hasCustomAmount
                        ? '1px solid #fde68a'
                        : '1px solid var(--border-input, #e2e8f0)',
                    }}
                  >
                    <Pencil size={11} />
                    {exp.hasAdjustment
                      ? 'Reajustado'
                      : exp.hasCustomAmount
                      ? `Fechada (${formatCurrency(exp.amount)})`
                      : exp.isEstimated
                      ? 'Estimado'
                      : 'Ajustar mês'}
                  </button>

                  <div className="expense-mobile-actions">
                    <button
                      onClick={() => (exp.id.startsWith('card-invoice-') ? openAdjustMonthModal(exp) : openEditModal(exp))}
                      title={exp.id.startsWith('card-invoice-') ? 'Ajustar fatura deste mês' : 'Editar'}
                      style={{
                        color: '#94a3b8',
                        padding: '6px 8px',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    >
                      <Pencil size={14} /> {exp.id.startsWith('card-invoice-') ? 'Ajustar' : 'Editar'}
                    </button>
                    {!exp.id.startsWith('card-invoice-') && (
                      <button
                        onClick={() => setDeletingExpense(exp)}
                        title="Excluir"
                        style={{
                          color: '#94a3b8',
                          padding: '6px 8px',
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* =========================================================
         MODAL 1: CADASTRAR DESPESA FIXA
         ========================================================= */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Cadastrar despesa fixa"
        subtitle="Defina o compromisso e seu período de recorrência."
        icon={<CalendarCheck2 size={22} />}
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">
              Descrição
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Aluguel, Netflix, Fatura Nubank, Luz..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="input-field"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">
                {formIsVariable ? 'Valor Médio / Estimado' : 'Valor'}
              </label>
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
              <label className="form-label">
                Primeiro vencimento
              </label>
              <input
                type="date"
                required
                value={formFirstDueDate}
                onChange={(e) => setFormFirstDueDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div>
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
              Deixe em branco para repetir todo mês. Ao definir uma data final, a despesa será encerrada a partir do mês seguinte.
            </span>
          </div>

          <div>
            <label className="form-label">
              Categoria
            </label>
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
              Chave Pix para pagamento <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Ex: CPF, CNPJ, e-mail, telefone ou chave aleatória"
                value={formPixKey}
                onChange={(e) => {
                  setFormPixKey(e.target.value);
                  setCopiedFormPix(false);
                }}
                className="input-field"
                style={{ paddingRight: 80 }}
              />
              {formPixKey.trim() && (
                <button
                  type="button"
                  onClick={handleCopyFormPix}
                  title="Copiar chave Pix digitada"
                  className={`btn-pix-copy ${copiedFormPix ? 'copied' : ''}`}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                >
                  {copiedFormPix ? <Check size={12} /> : <Copy size={12} />}
                  {copiedFormPix ? 'Copiado!' : 'Copiar'}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
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
              {actionLoading ? 'Salvando...' : 'Salvar despesa'}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
         MODAL 2: EDITAR DESPESA FIXA
         ========================================================= */}
      <Modal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        title="Editar despesa fixa"
        subtitle="Defina o compromisso e seu período de recorrência."
        icon={<CalendarCheck2 size={22} />}
      >
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">
              Descrição
            </label>
            <input
              type="text"
              required
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="input-field"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">
                {formIsVariable ? 'Valor Médio / Estimado' : 'Valor Base'}
              </label>
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
              <label className="form-label">
                Primeiro vencimento
              </label>
              <input
                type="date"
                required
                value={formFirstDueDate}
                onChange={(e) => setFormFirstDueDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div>
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
              Deixe em branco para repetir todo mês. Ao definir uma data final, a despesa será encerrada a partir do mês seguinte.
            </span>
          </div>

          <div>
            <label className="form-label">
              Categoria
            </label>
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
              Chave Pix para pagamento <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Ex: CPF, CNPJ, e-mail, telefone ou chave aleatória"
                value={formPixKey}
                onChange={(e) => {
                  setFormPixKey(e.target.value);
                  setCopiedFormPix(false);
                }}
                className="input-field"
                style={{ paddingRight: 80 }}
              />
              {formPixKey.trim() && (
                <button
                  type="button"
                  onClick={handleCopyFormPix}
                  title="Copiar chave Pix digitada"
                  className={`btn-pix-copy ${copiedFormPix ? 'copied' : ''}`}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                >
                  {copiedFormPix ? <Check size={12} /> : <Copy size={12} />}
                  {copiedFormPix ? 'Copiado!' : 'Copiar'}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditingExpense(null)}
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
         MODAL 3: AJUSTAR OU REAJUSTAR VALOR DO MÊS / FUTUROS
         ========================================================= */}
      <Modal
        isOpen={!!adjustingMonthExpense}
        onClose={() => setAdjustingMonthExpense(null)}
        title={`Ajustar ou Reajustar Valor`}
        subtitle={`${adjustingMonthExpense?.description} em ${selectedMonth.label}/${selectedMonth.year}`}
        icon={<SlidersHorizontal size={22} />}
        maxWidth="500px"
      >
        <form onSubmit={handleSaveMonthAmount} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick Action: Puxar soma de Despesas Variáveis */}
          {monthVariableExpensesSum > 0 && (
            <div
              style={{
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid #bfdbfe',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}>
                  Fatura do Cartão / Gastos do Mês
                </div>
                <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 2 }}>
                  Você teve <strong>{formatCurrency(monthVariableExpensesSum)}</strong> em despesas variáveis em {selectedMonth.label}.
                </div>
              </div>
              <button
                type="button"
                onClick={handlePullVariableExpenses}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'background 0.15s ease',
                }}
              >
                <Zap size={14} /> Usar este valor
              </button>
            </div>
          )}

          {/* Input do novo valor */}
          <div>
            <label className="form-label">
              Novo valor para a despesa
            </label>
            <div className="currency-input-wrapper">
              <span className="currency-input-prefix">R$</span>
              <input
                type="text"
                required
                value={adjustMonthAmount}
                onChange={(e) => setAdjustMonthAmount(e.target.value)}
                placeholder="0,00"
                autoFocus
                className="currency-input-field"
                style={{ fontSize: 18, fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Scope Selector: Escolha de vigência do ajuste */}
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
                    🌟 <strong>Ideal para Netflix, Aluguel, Planos:</strong> Altera o valor de {selectedMonth.label}/{selectedMonth.year} para todos os meses futuros automaticamente, preservando o histórico dos meses anteriores.
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
                    💳 <strong>Ideal para Cartão de Crédito e Contas de Luz/Água:</strong> Modifica apenas a fatura fechada deste mês, sem afetar o valor dos outros meses.
                  </div>
                </div>
              </label>

              {/* Opção 3: Alterar valor padrão geral em todos os meses */}
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
                    Altera o valor cadastrado original da despesa em todo o sistema.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {adjustingMonthExpense && (
            <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', backgroundColor: 'var(--bg-item, #f8fafc)', padding: '8px 12px', borderRadius: 8 }}>
              Valor original cadastrado: <strong>{formatCurrency(adjustingMonthExpense.baseAmount ?? adjustingMonthExpense.amount)}</strong>
              {adjustingMonthExpense.hasAdjustment && adjustingMonthExpense.adjustmentDetails && (
                <span> • Reajustado para {formatCurrency(adjustingMonthExpense.adjustmentDetails.amount)} em {adjustingMonthExpense.adjustmentDetails.startMonth}/{adjustingMonthExpense.adjustmentDetails.startYear}</span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            {adjustingMonthExpense?.hasCustomAmount || adjustingMonthExpense?.hasAdjustment ? (
              <button
                type="button"
                onClick={handleResetMonthAmount}
                disabled={actionLoading}
                style={{
                  fontSize: 12,
                  color: '#dc2626',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #fecaca',
                  backgroundColor: '#fef2f2',
                }}
              >
                Restaurar valor padrão
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setAdjustingMonthExpense(null)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={actionLoading}
              >
                {actionLoading ? 'Salvando...' : 'Confirmar e Salvar'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir despesa fixa"
        itemDescription={deletingExpense?.description}
        loading={actionLoading}
      />
    </div>
  );
};
