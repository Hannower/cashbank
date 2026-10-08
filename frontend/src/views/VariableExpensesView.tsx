import React, { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { MonthSelector } from '../components/MonthSelector';
import { MonthItem, getInitialMonthItem } from '../utils/dateUtils';

interface VariableExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

const CATEGORIES = ['Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Moradia', 'Outros'];

export const VariableExpensesView: React.FC<{ onDataChanged?: () => void }> = ({ onDataChanged }) => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<MonthItem>(() => getInitialMonthItem(user?.createdAt));
  const [expenses, setExpenses] = useState<VariableExpense[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<VariableExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<VariableExpense | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formCategory, setFormCategory] = useState('Alimentação');

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.getVariableExpenses(selectedMonth.month, selectedMonth.year);
      setExpenses(res.expenses || []);
      setTotalAmount(res.totalAmount || 0);
    } catch (err) {
      console.error('Failed to load variable expenses:', err);
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
    setFormDate(today);
    setFormCategory('Alimentação');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (exp: VariableExpense) => {
    setEditingExpense(exp);
    setFormDesc(exp.description);
    setFormAmount(String(exp.amount));
    setFormDate(exp.date ? exp.date.split('T')[0] : '');
    setFormCategory(exp.category);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc || !formAmount || !formDate) return;

    try {
      setActionLoading(true);
      await api.createVariableExpense({
        description: formDesc,
        amount: parseFloat(formAmount.replace(',', '.')),
        date: formDate,
        category: formCategory,
      });
      setIsCreateModalOpen(false);
      await fetchExpenses();
      onDataChanged?.();
    } catch (err) {
      console.error('Error creating variable expense:', err);
      alert('Erro ao cadastrar despesa variável.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !formDesc || !formAmount || !formDate) return;

    try {
      setActionLoading(true);
      await api.updateVariableExpense(editingExpense.id, {
        description: formDesc,
        amount: parseFloat(formAmount.replace(',', '.')),
        date: formDate,
        category: formCategory,
      });
      setEditingExpense(null);
      await fetchExpenses();
      onDataChanged?.();
    } catch (err) {
      console.error('Error updating variable expense:', err);
      alert('Erro ao atualizar despesa variável.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingExpense) return;
    try {
      setActionLoading(true);
      await api.deleteVariableExpense(deletingExpense.id);
      setDeletingExpense(null);
      await fetchExpenses();
      onDataChanged?.();
    } catch (err) {
      console.error('Error deleting variable expense:', err);
      alert('Erro ao excluir despesa variável.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const months = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    return `${String(d.getUTCDate()).padStart(2, '0')} de ${months[d.getUTCMonth()]}`;
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
            GASTOS DO DIA A DIA
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>
            Despesas variáveis
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4, margin: 0 }}>
            Acompanhe compras e gastos que mudam a cada mês.
          </p>
        </div>

        <button className="btn-primary" onClick={openCreateModal}>
          <Plus size={18} /> Cadastrar despesa
        </button>
      </div>

      {/* Month Selector Tabs */}
      <MonthSelector
        selectedMonth={selectedMonth}
        onSelectMonth={(m) => setSelectedMonth(m)}
        createdAt={user?.createdAt}
      />

      {/* Hero Card */}
      <div
        className="hero-card-banner"
        style={{
          background: 'linear-gradient(135deg, #a4642f 0%, #884e1e 100%)',
          boxShadow: '0 6px 16px rgba(136, 78, 30, 0.25)',
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.85)', marginBottom: 6 }}>
            Total gasto no mês de {selectedMonth.label}
          </div>
          <div className="hero-amount" style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
            {formatCurrency(totalAmount)}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.9)' }}>
            {expenses.length} lançamento{expenses.length !== 1 ? 's' : ''} registrado{expenses.length !== 1 ? 's' : ''} em {selectedMonth.label}.
          </div>
        </div>

        {/* Translucent Card Icon */}
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: 16,
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          <CreditCard size={32} />
        </div>
      </div>

      {/* Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
            Histórico de despesas de {selectedMonth.label}
          </h3>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            {expenses.length} registro{expenses.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fafbfc' }}>
                <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px' }}>
                  DESCRIÇÃO
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px' }}>
                  CATEGORIA
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px' }}>
                  DATA
                </th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px' }}>
                  VALOR
                </th>
                <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px', textAlign: 'right' }}>
                  AÇÕES
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                    <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                    Carregando despesas variáveis...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                    Nenhuma despesa variável cadastrada para {selectedMonth.label}. Clique em "+ Cadastrar despesa" acima para adicionar.
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
                    {/* Descrição with Card Icon */}
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
                          <CreditCard size={17} />
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

                    {/* Data */}
                    <td style={{ padding: '16px 20px', fontSize: 13, color: '#64748b' }}>
                      {formatDate(exp.date)}
                    </td>

                    {/* Valor (Red negative) */}
                    <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 700, color: '#b45309' }}>
                      - {formatCurrency(exp.amount)}
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
        title="Cadastrar despesa variável"
        subtitle="Registre um gasto pontual do dia a dia."
        icon={<CreditCard size={22} />}
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Descrição
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Supermercado"
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
                Data
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
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

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
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
        title="Editar despesa variável"
        subtitle="Registre um gasto pontual do dia a dia."
        icon={<CreditCard size={22} />}
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
                Data
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
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

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
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

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir despesa variável"
        itemDescription={deletingExpense?.description}
        loading={actionLoading}
      />
    </div>
  );
};
