import React, { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  PiggyBank,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';

interface SavingsItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  objective: string;
}

export const SavingsView: React.FC<{ onDataChanged?: () => void }> = ({ onDataChanged }) => {
  const [savings, setSavings] = useState<SavingsItem[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SavingsItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<SavingsItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formObjective, setFormObjective] = useState('Poupança');

  const fetchSavings = async () => {
    try {
      setLoading(true);
      const res = await api.getSavings();
      setSavings(res.savings || []);
      setTotalSaved(res.totalSaved || 0);
    } catch (err) {
      console.error('Failed to load savings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavings();
  }, []);

  const openCreateModal = () => {
    setFormDesc('');
    setFormAmount('');
    const today = new Date().toISOString().split('T')[0];
    setFormDate(today);
    setFormObjective('Poupança');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (item: SavingsItem) => {
    setEditingItem(item);
    setFormDesc(item.description);
    setFormAmount(String(item.amount));
    setFormDate(item.date ? item.date.split('T')[0] : '');
    setFormObjective(item.objective);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc || !formAmount || !formDate) return;

    try {
      setActionLoading(true);
      await api.createSavings({
        description: formDesc,
        amount: parseFloat(formAmount.replace(',', '.')),
        date: formDate,
        objective: formObjective,
      });
      setIsCreateModalOpen(false);
      await fetchSavings();
      onDataChanged?.();
    } catch (err) {
      console.error('Error adding to savings:', err);
      alert('Erro ao guardar dinheiro.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !formDesc || !formAmount || !formDate) return;

    try {
      setActionLoading(true);
      await api.updateSavings(editingItem.id, {
        description: formDesc,
        amount: parseFloat(formAmount.replace(',', '.')),
        date: formDate,
        objective: formObjective,
      });
      setEditingItem(null);
      await fetchSavings();
      onDataChanged?.();
    } catch (err) {
      console.error('Error updating savings:', err);
      alert('Erro ao atualizar registro da poupança.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      setActionLoading(true);
      await api.deleteSavings(deletingItem.id);
      setDeletingItem(null);
      await fetchSavings();
      onDataChanged?.();
    } catch (err) {
      console.error('Error deleting savings:', err);
      alert('Erro ao excluir registro da poupança.');
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
            CONSTRUA SEU FUTURO
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>
            Poupança
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4, margin: 0 }}>
            Acompanhe cada passo rumo aos seus objetivos.
          </p>
        </div>

        <button className="btn-primary" onClick={openCreateModal}>
          <Plus size={18} /> Guardar dinheiro
        </button>
      </div>

      {/* Hero Banner */}
      <div
        className="hero-card-banner"
        style={{
          background: 'linear-gradient(135deg, #5b6fae 0%, #4a5c96 100%)',
          boxShadow: '0 6px 16px rgba(74, 92, 150, 0.25)',
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.85)', marginBottom: 6 }}>
            Total guardado
          </div>
          <div className="hero-amount" style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
            {formatCurrency(totalSaved)}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.9)' }}>
            {totalSaved > 0
              ? 'Você está construindo uma ótima reserva.'
              : 'Comece a guardar dinheiro para formar sua reserva de emergência.'}
          </div>
        </div>

        {/* Translucent Piggy Icon */}
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
          <PiggyBank size={34} />
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
            Aportes recentes
          </h3>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            {savings.length} registro{savings.length !== 1 ? 's' : ''}
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
                  OBJETIVO
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
                    Carregando dados da poupança...
                  </td>
                </tr>
              ) : savings.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                    Nenhum aporte registrado ainda. Clique em "+ Guardar dinheiro" acima para adicionar.
                  </td>
                </tr>
              ) : (
                savings.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #f8fafc',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafbfc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Descrição with Piggy Icon */}
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            backgroundColor: '#ede9fe',
                            color: '#7c3aed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <PiggyBank size={17} />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                          {item.description}
                        </span>
                      </div>
                    </td>

                    {/* Objetivo */}
                    <td style={{ padding: '16px 20px', fontSize: 13, color: '#64748b' }}>
                      {item.objective}
                    </td>

                    {/* Data */}
                    <td style={{ padding: '16px 20px', fontSize: 13, color: '#64748b' }}>
                      {formatDate(item.date)}
                    </td>

                    {/* Valor (Green positive) */}
                    <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 700, color: '#16a34a' }}>
                      + {formatCurrency(item.amount)}
                    </td>

                    {/* Ações */}
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          onClick={() => openEditModal(item)}
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
                          onClick={() => setDeletingItem(item)}
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
        title="Adicionar à poupança"
        subtitle="Registre um novo valor guardado."
        icon={<PiggyBank size={22} />}
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Descrição
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Reserva de emergência"
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
              Objetivo
            </label>
            <input
              type="text"
              placeholder="Poupança"
              value={formObjective}
              onChange={(e) => setFormObjective(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                outline: 'none',
              }}
            />
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
              {actionLoading ? 'Salvando...' : 'Guardar valor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Editar Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Editar valor da poupança"
        subtitle="Altere os dados do aporte guardado."
        icon={<PiggyBank size={22} />}
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
              Objetivo
            </label>
            <input
              type="text"
              value={formObjective}
              onChange={(e) => setFormObjective(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
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

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir aporte da poupança"
        itemDescription={deletingItem?.description}
        loading={actionLoading}
      />
    </div>
  );
};
