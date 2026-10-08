import React, { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  CalendarCheck2,
  Check,
  Clock,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { MonthSelector } from '../components/MonthSelector';
import { MonthItem, getInitialMonthItem } from '../utils/dateUtils';

interface FixedExpense {
  id: string;
  description: string;
  amount: number;
  baseAmount?: number;
  hasCustomAmount?: boolean;
  dueDay: number;
  firstDueDate: string;
  endDate: string | null;
  category: string;
  isPaid: boolean;
  paidAt: string | null;
}

const CATEGORIES = ['Moradia', 'Serviços', 'Saúde', 'Educação', 'Transporte', 'Alimentação', 'Lazer', 'Outros'];

export const FixedExpensesView: React.FC<{ onDataChanged?: () => void }> = ({ onDataChanged }) => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<MonthItem>(() => getInitialMonthItem(user?.createdAt));
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [summary, setSummary] = useState({ totalAmount: 0, pendingAmount: 0, paidCount: 0, totalCount: 0 });
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<FixedExpense | null>(null);
  const [adjustingMonthExpense, setAdjustingMonthExpense] = useState<FixedExpense | null>(null);
  const [adjustMonthAmount, setAdjustMonthAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formFirstDueDate, setFormFirstDueDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formCategory, setFormCategory] = useState('Moradia');

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.getFixedExpenses(selectedMonth.month, selectedMonth.year);
      setExpenses(res.expenses || []);
      setSummary(res.summary || { totalAmount: 0, pendingAmount: 0, paidCount: 0, totalCount: 0 });
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
    setIsCreateModalOpen(true);
  };

  const openEditModal = (exp: FixedExpense) => {
    setEditingExpense(exp);
    setFormDesc(exp.description);
    setFormAmount(String(exp.baseAmount ?? exp.amount));
    setFormFirstDueDate(exp.firstDueDate ? exp.firstDueDate.split('T')[0] : '');
    setFormEndDate(exp.endDate ? exp.endDate.split('T')[0] : '');
    setFormCategory(exp.category);
  };

  const openAdjustMonthModal = (exp: FixedExpense) => {
    setAdjustingMonthExpense(exp);
    setAdjustMonthAmount(String(exp.amount));
  };

  const handleSaveMonthAmount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingMonthExpense) return;
    try {
      setActionLoading(true);
      await api.updateFixedExpenseMonthAmount(adjustingMonthExpense.id, {
        month: selectedMonth.month,
        year: selectedMonth.year,
        amount: parseFloat(adjustMonthAmount.replace(',', '.')),
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
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>
            Despesas fixas
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4, margin: 0 }}>
            Cadastre compromissos recorrentes e acompanhe os pagamentos.
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
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 8 }}>
            Total do mês
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>
            {formatCurrency(summary.totalAmount)}
          </div>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 8 }}>
            Pendente
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: summary.pendingAmount > 0 ? '#b45309' : '#0f172a' }}>
            {formatCurrency(summary.pendingAmount)}
          </div>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 8 }}>
            Pagas
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>
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
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Compromissos de {selectedMonth.label}
          </h3>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            {expenses.length} despesa{expenses.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 650 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fafbfc' }}>
                <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px' }}>
                  DESCRIÇÃO
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px' }}>
                  CATEGORIA
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px' }}>
                  PERÍODO
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px' }}>
                  VALOR
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px' }}>
                  STATUS
                </th>
                <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px', textAlign: 'right' }}>
                  AÇÕES
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                    <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                    Carregando despesas fixas...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                    Nenhuma despesa fixa cadastrada para este mês. Clique em "+ Cadastrar despesa" acima para adicionar.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr
                    key={exp.id}
                    style={{
                      borderBottom: '1px solid #f8fafc',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafbfc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Descrição with Orange Icon */}
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            backgroundColor: '#ffedd5',
                            color: '#ea580c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <CalendarCheck2 size={17} />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                          {exp.description}
                        </span>
                      </div>
                    </td>

                    {/* Categoria */}
                    <td style={{ padding: '16px 20px', fontSize: 13, color: '#64748b' }}>
                      {exp.category}
                    </td>

                    {/* Período */}
                    <td style={{ padding: '16px 20px', fontSize: 13, color: '#64748b' }}>
                      {formatPeriod(exp)}
                    </td>

                    {/* Valor com opção de ajuste mensal */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                          {formatCurrency(exp.amount)}
                        </span>
                        <button
                          onClick={() => openAdjustMonthModal(exp)}
                          title={`Ajustar valor especificamente para ${selectedMonth.label} (ideal para contas que variam como Fatura Nubank, Luz)`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: exp.hasCustomAmount ? '#fef3c7' : '#f8fafc',
                            color: exp.hasCustomAmount ? '#b45309' : '#475569',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: exp.hasCustomAmount ? '1px solid #fde68a' : '1px solid #e2e8f0',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = exp.hasCustomAmount ? '#fde68a' : '#f1f5f9';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = exp.hasCustomAmount ? '#fef3c7' : '#f8fafc';
                          }}
                        >
                          <Pencil size={11} />
                          {exp.hasCustomAmount ? 'Ajustado' : 'Ajustar mês'}
                        </button>
                      </div>
                      {exp.hasCustomAmount && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          Padrão: {formatCurrency(exp.baseAmount ?? exp.amount)}
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
                          onClick={() => openEditModal(exp)}
                          title="Editar"
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cadastrar Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Cadastrar despesa fixa"
        subtitle="Defina o compromisso e seu período de recorrência."
        icon={<CalendarCheck2 size={22} />}
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Descrição
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Conta de energia"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Valor
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600, fontSize: 13 }}>
                  R$
                </span>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 38px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Primeiro vencimento
              </label>
              <input
                type="date"
                required
                value={formFirstDueDate}
                onChange={(e) => setFormFirstDueDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Data final <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span>
            </label>
            <input
              type="date"
              value={formEndDate}
              onChange={(e) => setFormEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block' }}>
              Deixe em branco para repetir sem prazo final.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Categoria
            </label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                outline: 'none',
                backgroundColor: 'white',
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              backgroundColor: '#f0fdf4',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: 12,
              color: '#15803d',
              border: '1px solid #dcfce7',
            }}
          >
            A nova despesa será cadastrada inicialmente como pendente.
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
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
              {actionLoading ? 'Salvando...' : 'Salvar registro'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Editar Modal */}
      <Modal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        title="Editar despesa fixa"
        subtitle="Defina o compromisso e seu período de recorrência."
        icon={<CalendarCheck2 size={22} />}
      >
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Descrição
            </label>
            <input
              type="text"
              required
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Valor
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600, fontSize: 13 }}>
                  R$
                </span>
                <input
                  type="text"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 38px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Primeiro vencimento
              </label>
              <input
                type="date"
                required
                value={formFirstDueDate}
                onChange={(e) => setFormFirstDueDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Data final <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span>
            </label>
            <input
              type="date"
              value={formEndDate}
              onChange={(e) => setFormEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block' }}>
              Deixe em branco para repetir sem prazo final.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Categoria
            </label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                outline: 'none',
                backgroundColor: 'white',
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
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

      {/* Modal Ajustar Valor do Mês */}
      <Modal
        isOpen={!!adjustingMonthExpense}
        onClose={() => setAdjustingMonthExpense(null)}
        title={`Ajustar valor em ${selectedMonth.label}/${selectedMonth.year}`}
        subtitle={`Despesa fixa: ${adjustingMonthExpense?.description}`}
        icon={<CalendarCheck2 size={22} />}
      >
        <form onSubmit={handleSaveMonthAmount} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #dbeafe',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: 12,
              color: '#1e40af',
              lineHeight: 1.5,
            }}
          >
            💡 <strong>Para contas que variam todo mês</strong> (como Fatura de Cartão, Luz, Água): o valor informado abaixo será aplicado <strong>somente em {selectedMonth.label} de {selectedMonth.year}</strong>, sem alterar o valor base nem os outros meses.
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Valor específico para {selectedMonth.label} de {selectedMonth.year}
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600, fontSize: 13 }}>
                R$
              </span>
              <input
                type="text"
                required
                value={adjustMonthAmount}
                onChange={(e) => setAdjustMonthAmount(e.target.value)}
                placeholder="0,00"
                autoFocus
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 38px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              />
            </div>
            {adjustingMonthExpense && (
              <span style={{ fontSize: 12, color: '#64748b', marginTop: 6, display: 'block' }}>
                Valor base padrão cadastrado: <strong>{formatCurrency(adjustingMonthExpense.baseAmount ?? adjustingMonthExpense.amount)}</strong>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            {adjustingMonthExpense?.hasCustomAmount ? (
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
                {actionLoading ? 'Salvando...' : 'Salvar para este mês'}
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
