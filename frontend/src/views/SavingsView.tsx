import React, { useState, useEffect } from 'react';
import {
  Plus,
  MinusCircle,
  ArrowDownRight,
  ArrowUpRight,
  Pencil,
  Trash2,
  PiggyBank,
  Loader2,
  Target,
  Calendar,
  Sparkles,
  Plane,
  Car,
  Home,
  Shield,
  GraduationCap,
  Laptop,
  Heart,
  Gift,
  TrendingUp,
  Filter,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';

export interface PiggyBankItem {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  category: string;
  color: string;
  icon: string;
  description: string | null;
  currentAmount: number;
  progressPercentage: number;
  remainingAmount: number;
  transactionsCount: number;
}

export interface SavingsItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  objective: string;
  piggyBankId?: string | null;
  piggyBank?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  } | null;
}

const ICON_MAP: Record<string, React.ElementType> = {
  piggy: PiggyBank,
  shield: Shield,
  plane: Plane,
  car: Car,
  home: Home,
  cap: GraduationCap,
  laptop: Laptop,
  heart: Heart,
  gift: Gift,
  trending: TrendingUp,
};

const PIGGY_ICONS = [
  { id: 'piggy', label: 'Cofrinho', Icon: PiggyBank },
  { id: 'shield', label: 'Emergência', Icon: Shield },
  { id: 'plane', label: 'Viagem', Icon: Plane },
  { id: 'car', label: 'Veículo', Icon: Car },
  { id: 'home', label: 'Casa', Icon: Home },
  { id: 'cap', label: 'Estudos', Icon: GraduationCap },
  { id: 'laptop', label: 'Eletrônicos', Icon: Laptop },
  { id: 'heart', label: 'Saúde / Sonho', Icon: Heart },
  { id: 'gift', label: 'Celebração', Icon: Gift },
  { id: 'trending', label: 'Investimento', Icon: TrendingUp },
];

const PIGGY_COLORS = [
  { hex: '#15803d', label: 'Verde Esmeralda', bg: 'rgba(21, 128, 61, 0.12)' },
  { hex: '#ea580c', label: 'Laranja Inter', bg: 'rgba(234, 88, 12, 0.12)' },
  { hex: '#2563eb', label: 'Azul Real', bg: 'rgba(37, 99, 235, 0.12)' },
  { hex: '#7c3aed', label: 'Roxo Violeta', bg: 'rgba(124, 58, 237, 0.12)' },
  { hex: '#db2777', label: 'Rosa Pink', bg: 'rgba(219, 39, 119, 0.12)' },
  { hex: '#0d9488', label: 'Teal Ciano', bg: 'rgba(13, 148, 136, 0.12)' },
  { hex: '#d97706', label: 'Âmbar Dourado', bg: 'rgba(217, 119, 6, 0.12)' },
];

export const SavingsView: React.FC<{ onDataChanged?: () => void }> = ({ onDataChanged }) => {
  const [piggyBanks, setPiggyBanks] = useState<PiggyBankItem[]>([]);
  const [savings, setSavings] = useState<SavingsItem[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [savingsGoal, setSavingsGoal] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter state for transactions list
  const [selectedPiggyFilter, setSelectedPiggyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'deposits' | 'withdrawals'>('all');

  // Modals state
  const [isPiggyModalOpen, setIsPiggyModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [editingPiggy, setEditingPiggy] = useState<PiggyBankItem | null>(null);
  const [editingSavingsItem, setEditingSavingsItem] = useState<SavingsItem | null>(null);
  const [deletingPiggy, setDeletingPiggy] = useState<PiggyBankItem | null>(null);
  const [deletingSavingsItem, setDeletingSavingsItem] = useState<SavingsItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Piggy Form State
  const [piggyName, setPiggyName] = useState('');
  const [piggyTargetAmount, setPiggyTargetAmount] = useState('');
  const [piggyTargetDate, setPiggyTargetDate] = useState('');
  const [piggyCategory, setPiggyCategory] = useState('general');
  const [piggyColor, setPiggyColor] = useState('#15803d');
  const [piggyIcon, setPiggyIcon] = useState('piggy');
  const [piggyDesc, setPiggyDesc] = useState('');
  const [piggyInitialDeposit, setPiggyInitialDeposit] = useState('');

  // Deposit / Withdraw Form State
  const [selectedPiggyId, setSelectedPiggyId] = useState('');
  const [operationAmount, setOperationAmount] = useState('');
  const [operationDate, setOperationDate] = useState('');
  const [operationDesc, setOperationDesc] = useState('');
  const [operationError, setOperationError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.getSavings();
      setSavings(res.savings || []);
      setTotalSaved(res.totalSaved || 0);
      setSavingsGoal(res.savingsGoal || 0);
      setOverallProgress(res.progressPercentage || 0);
      setPiggyBanks(res.piggyBanks || []);
    } catch (err) {
      console.error('Failed to load savings and piggy banks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Handlers: Cofrinho CRUD ---
  const openCreatePiggyModal = () => {
    setEditingPiggy(null);
    setPiggyName('');
    setPiggyTargetAmount('');
    setPiggyTargetDate('');
    setPiggyCategory('general');
    setPiggyColor('#15803d');
    setPiggyIcon('piggy');
    setPiggyDesc('');
    setPiggyInitialDeposit('');
    setIsPiggyModalOpen(true);
  };

  const openEditPiggyModal = (pb: PiggyBankItem) => {
    setEditingPiggy(pb);
    setPiggyName(pb.name);
    setPiggyTargetAmount(pb.targetAmount > 0 ? String(pb.targetAmount) : '');
    setPiggyTargetDate(pb.targetDate ? pb.targetDate.split('T')[0] : '');
    setPiggyCategory(pb.category || 'general');
    setPiggyColor(pb.color || '#15803d');
    setPiggyIcon(pb.icon || 'piggy');
    setPiggyDesc(pb.description || '');
    setPiggyInitialDeposit('');
    setIsPiggyModalOpen(true);
  };

  const handlePiggySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!piggyName.trim()) {
      alert('Informe o nome do cofrinho.');
      return;
    }

    try {
      setActionLoading(true);
      const targetVal = piggyTargetAmount ? parseFloat(piggyTargetAmount.replace(',', '.')) : 0;
      const initialVal = piggyInitialDeposit ? parseFloat(piggyInitialDeposit.replace(',', '.')) : 0;

      if (editingPiggy) {
        await api.updatePiggyBank(editingPiggy.id, {
          name: piggyName.trim(),
          targetAmount: targetVal,
          targetDate: piggyTargetDate || null,
          category: piggyCategory,
          color: piggyColor,
          icon: piggyIcon,
          description: piggyDesc,
        });
      } else {
        await api.createPiggyBank({
          name: piggyName.trim(),
          targetAmount: targetVal,
          targetDate: piggyTargetDate || null,
          category: piggyCategory,
          color: piggyColor,
          icon: piggyIcon,
          description: piggyDesc,
          initialDeposit: initialVal > 0 ? initialVal : undefined,
        });
      }

      setIsPiggyModalOpen(false);
      await fetchData();
      onDataChanged?.();
    } catch (err: any) {
      console.error('Error saving piggy bank:', err);
      alert(err.message || 'Erro ao salvar cofrinho.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePiggyConfirm = async () => {
    if (!deletingPiggy) return;
    try {
      setActionLoading(true);
      await api.deletePiggyBank(deletingPiggy.id);
      setDeletingPiggy(null);
      await fetchData();
      onDataChanged?.();
    } catch (err: any) {
      console.error('Error deleting piggy bank:', err);
      alert(err.message || 'Erro ao excluir cofrinho.');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Handlers: Depósito e Retirada ---
  const openDepositModal = (preselectedPiggyId?: string) => {
    setOperationError(null);
    const targetId = preselectedPiggyId || (piggyBanks.length > 0 ? piggyBanks[0].id : '');
    setSelectedPiggyId(targetId);
    setOperationAmount('');
    setOperationDate(new Date().toISOString().split('T')[0]);
    const targetPb = piggyBanks.find((p) => p.id === targetId);
    setOperationDesc(targetPb ? `Depósito no cofrinho ${targetPb.name}` : 'Depósito');
    setIsDepositModalOpen(true);
  };

  const openWithdrawModal = (preselectedPiggyId?: string) => {
    setOperationError(null);
    const targetId = preselectedPiggyId || (piggyBanks.length > 0 ? piggyBanks[0].id : '');
    setSelectedPiggyId(targetId);
    setOperationAmount('');
    setOperationDate(new Date().toISOString().split('T')[0]);
    const targetPb = piggyBanks.find((p) => p.id === targetId);
    setOperationDesc(targetPb ? `Resgate do cofrinho ${targetPb.name}` : 'Resgate');
    setIsWithdrawModalOpen(true);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOperationError(null);

    const val = parseFloat(operationAmount.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      setOperationError('Informe um valor válido maior que zero.');
      return;
    }

    try {
      setActionLoading(true);
      if (selectedPiggyId) {
        await api.depositPiggyBank(selectedPiggyId, {
          amount: val,
          date: operationDate,
          description: operationDesc,
        });
      } else {
        await api.createSavings({
          amount: val,
          date: operationDate,
          description: operationDesc || 'Depósito na poupança',
          objective: 'Poupança',
        });
      }

      setIsDepositModalOpen(false);
      await fetchData();
      onDataChanged?.();
    } catch (err: any) {
      console.error('Error depositing to piggy bank:', err);
      setOperationError(err.message || 'Erro ao depositar no cofrinho.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOperationError(null);

    const val = parseFloat(operationAmount.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      setOperationError('Informe um valor válido maior que zero.');
      return;
    }

    const targetPb = piggyBanks.find((p) => p.id === selectedPiggyId);
    if (targetPb && val > targetPb.currentAmount) {
      setOperationError(
        `Saldo insuficiente no cofrinho "${targetPb.name}". Saldo disponível: ${formatCurrency(targetPb.currentAmount)}`
      );
      return;
    }

    try {
      setActionLoading(true);
      if (selectedPiggyId) {
        await api.withdrawPiggyBank(selectedPiggyId, {
          amount: val,
          date: operationDate,
          description: operationDesc,
        });
      } else {
        await api.createSavings({
          amount: -val,
          date: operationDate,
          description: operationDesc || 'Resgate da poupança',
          objective: 'Resgate',
        });
      }

      setIsWithdrawModalOpen(false);
      await fetchData();
      onDataChanged?.();
    } catch (err: any) {
      console.error('Error withdrawing from piggy bank:', err);
      setOperationError(err.message || 'Erro ao retirar do cofrinho.');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Handlers: Movimentação Individual (Editar / Excluir) ---
  const openEditSavingsModal = (item: SavingsItem) => {
    setEditingSavingsItem(item);
    setSelectedPiggyId(item.piggyBankId || '');
    setOperationAmount(String(Math.abs(item.amount)));
    setOperationDate(item.date ? item.date.split('T')[0] : '');
    setOperationDesc(item.description);
    setOperationError(null);
  };

  const handleEditSavingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSavingsItem) return;

    const val = parseFloat(operationAmount.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      setOperationError('Informe um valor válido.');
      return;
    }

    try {
      setActionLoading(true);
      const isWithdraw = editingSavingsItem.amount < 0;
      const finalAmount = isWithdraw ? -val : val;

      await api.updateSavings(editingSavingsItem.id, {
        amount: finalAmount,
        date: operationDate,
        description: operationDesc,
        piggyBankId: selectedPiggyId || null,
      });

      setEditingSavingsItem(null);
      await fetchData();
      onDataChanged?.();
    } catch (err: any) {
      console.error('Error updating savings item:', err);
      setOperationError(err.message || 'Erro ao atualizar movimentação.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSavingsConfirm = async () => {
    if (!deletingSavingsItem) return;
    try {
      setActionLoading(true);
      await api.deleteSavings(deletingSavingsItem.id);
      setDeletingSavingsItem(null);
      await fetchData();
      onDataChanged?.();
    } catch (err: any) {
      console.error('Error deleting savings item:', err);
      alert(err.message || 'Erro ao excluir movimentação.');
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

  // Filtered transactions
  const filteredSavings = savings.filter((item) => {
    // Filter by piggy bank
    if (selectedPiggyFilter !== 'all') {
      if (item.piggyBankId !== selectedPiggyFilter) return false;
    }
    // Filter by type
    if (typeFilter === 'deposits') {
      if (item.amount < 0) return false;
    } else if (typeFilter === 'withdrawals') {
      if (item.amount >= 0) return false;
    }
    return true;
  });

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
            MEU PORQUINHO & COFRINHOS
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>
            Poupança & Cofrinhos
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4, margin: 0 }}>
            Crie cofrinhos por objetivos, faça depósitos, acompanhe metas e resgate quando precisar.
          </p>
        </div>

        <div className="view-header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={openCreatePiggyModal}
            title="Criar novo cofrinho para guardar dinheiro"
          >
            <Plus size={18} /> Novo cofrinho
          </button>
          <button
            type="button"
            className="btn-deposit"
            onClick={() => openDepositModal()}
            title="Guardar dinheiro em um cofrinho"
          >
            <ArrowDownRight size={18} /> Guardar dinheiro
          </button>
          <button
            type="button"
            className="btn-withdraw"
            onClick={() => openWithdrawModal()}
            title="Retirar dinheiro de um cofrinho"
          >
            <MinusCircle size={18} /> Retirar dinheiro
          </button>
        </div>
      </div>

      {/* Hero Overview Banner */}
      <div
        className="hero-card-banner"
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.35)',
          padding: '24px 28px',
          borderRadius: 20,
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 28,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, width: '100%' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  padding: '3px 10px',
                  borderRadius: 20,
                  color: '#ffffff',
                }}
              >
                Patrimônio Guardado
              </span>
              <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>
                {piggyBanks.length} cofrinho{piggyBanks.length !== 1 ? 's' : ''} ativo{piggyBanks.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="hero-amount" style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.5px', color: '#ffffff', marginBottom: 8 }}>
              {formatCurrency(totalSaved)}
            </div>

            {savingsGoal > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255, 255, 255, 0.9)', fontSize: 13 }}>
                <Target size={15} color="#4ade80" />
                <span>
                  Meta total acumulada: <strong>{formatCurrency(savingsGoal)}</strong> ({overallProgress}%)
                </span>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>
                Defina metas em seus cofrinhos para acompanhar o progresso passo a passo.
              </div>
            )}
          </div>

          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            <PiggyBank size={32} />
          </div>
        </div>

        {/* Global Progress Bar */}
        {savingsGoal > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255, 255, 255, 0.85)', marginBottom: 6 }}>
              <span>Progresso geral dos cofrinhos</span>
              <strong>{overallProgress}%</strong>
            </div>
            <div style={{ width: '100%', height: 8, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(overallProgress, 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #22c55e 0%, #4ade80 100%)',
                  borderRadius: 4,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* =========================================================
         SECTION 1: COFRINHOS GRID (Banco Inter Style)
         ========================================================= */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
              Meus Cofrinhos
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted, #64748b)', margin: '3px 0 0' }}>
              Separe seu dinheiro por projetos e visualize quanto falta para conquistar cada meta.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreatePiggyModal}
            className="btn-secondary"
            style={{ fontSize: 13, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} /> Adicionar objetivo
          </button>
        </div>

        {/* Cofrinhos Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: 16,
          }}
        >
          {piggyBanks.map((pb) => {
            const IconComp = ICON_MAP[pb.icon] || PiggyBank;
            const isCompleted = pb.targetAmount > 0 && pb.currentAmount >= pb.targetAmount;
            const pbColor = pb.color || '#15803d';

            return (
              <div
                key={pb.id}
                className="card piggy-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: 20,
                  borderRadius: 16,
                  border: '1px solid var(--border-color, #e2e8f0)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Colored Top Accent Bar */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    backgroundColor: pbColor,
                  }}
                />

                {/* Card Header: Icon, Title & Actions */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          backgroundColor: `${pbColor}18`,
                          color: pbColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <IconComp size={22} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0, lineHeight: 1.2 }}>
                          {pb.name}
                        </h3>
                        {pb.description && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', marginTop: 2 }}>
                            {pb.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Edit / Delete Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => openEditPiggyModal(pb)}
                        title="Editar cofrinho"
                        style={{
                          padding: 6,
                          borderRadius: 8,
                          color: 'var(--text-muted, #94a3b8)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingPiggy(pb)}
                        title="Excluir cofrinho"
                        style={{
                          padding: 6,
                          borderRadius: 8,
                          color: '#ef4444',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      SALDO NO COFRINHO
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: 2 }}>
                      {formatCurrency(pb.currentAmount)}
                    </div>

                    {pb.targetAmount > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>Meta: {formatCurrency(pb.targetAmount)}</span>
                        <span>•</span>
                        {isCompleted ? (
                          <span style={{ color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <CheckCircle2 size={12} /> Meta batida!
                          </span>
                        ) : (
                          <span>Faltam {formatCurrency(pb.remainingAmount)}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {pb.targetAmount > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', marginBottom: 5 }}>
                        <span>Progresso</span>
                        <span style={{ color: pbColor }}>{pb.progressPercentage}%</span>
                      </div>
                      <div style={{ width: '100%', height: 7, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(pb.progressPercentage, 100)}%`,
                            height: '100%',
                            backgroundColor: pbColor,
                            borderRadius: 4,
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {pb.targetDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginBottom: 14 }}>
                      <Calendar size={13} />
                      <span>Prazo estimado: {formatDate(pb.targetDate)}</span>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border-color, #f1f5f9)', paddingTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => openDepositModal(pb.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      borderRadius: 10,
                      backgroundColor: `${pbColor}14`,
                      color: pbColor,
                      fontSize: 13,
                      fontWeight: 700,
                      border: `1px solid ${pbColor}30`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Plus size={15} /> Guardar
                  </button>

                  <button
                    type="button"
                    onClick={() => openWithdrawModal(pb.id)}
                    disabled={pb.currentAmount <= 0}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      borderRadius: 10,
                      backgroundColor: 'transparent',
                      color: pb.currentAmount > 0 ? 'var(--text-main, #0f172a)' : 'var(--text-muted, #94a3b8)',
                      fontSize: 13,
                      fontWeight: 600,
                      border: '1px solid var(--border-color, #e2e8f0)',
                      cursor: pb.currentAmount > 0 ? 'pointer' : 'not-allowed',
                      opacity: pb.currentAmount > 0 ? 1 : 0.6,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <MinusCircle size={15} /> Retirar
                  </button>
                </div>
              </div>
            );
          })}

          {/* "+ Adicionar Cofrinho" Dotted Card */}
          <div
            onClick={openCreatePiggyModal}
            className="card create-piggy-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 220,
              borderRadius: 16,
              border: '2px dashed var(--border-color, #cbd5e1)',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
              padding: 24,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: 'rgba(21, 128, 61, 0.1)',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Plus size={24} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
              Criar novo cofrinho
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', marginTop: 4, maxWidth: 200 }}>
              Crie metas para viagens, carro, emergência ou qualquer outro sonho.
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
         SECTION 2: EXTRATO / HISTÓRICO DE MOVIMENTAÇÕES
         ========================================================= */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table Filter Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: 0 }}>
              Extrato de movimentações dos cofrinhos
            </h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
              {filteredSavings.length} registro{filteredSavings.length !== 1 ? 's' : ''} encontrado{filteredSavings.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Filter Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Filter by Cofrinho */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted, #64748b)' }}>Cofrinho:</span>
              <select
                value={selectedPiggyFilter}
                onChange={(e) => setSelectedPiggyFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid var(--border-color, #cbd5e1)',
                  backgroundColor: 'var(--bg-card, #ffffff)',
                  color: 'var(--text-main, #0f172a)',
                  cursor: 'pointer',
                }}
              >
                <option value="all">Todos os cofrinhos</option>
                {piggyBanks.map((pb) => (
                  <option key={pb.id} value={pb.id}>
                    {pb.name} ({formatCurrency(pb.currentAmount)})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Type */}
            <div className="tx-filter-bar">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`tx-filter-btn ${typeFilter === 'all' ? 'active' : ''}`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('deposits')}
                className={`tx-filter-btn ${typeFilter === 'deposits' ? 'active' : ''}`}
                style={{ color: typeFilter === 'deposits' ? '#16a34a' : undefined }}
              >
                Depósitos
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('withdrawals')}
                className={`tx-filter-btn ${typeFilter === 'withdrawals' ? 'active' : ''}`}
                style={{ color: typeFilter === 'withdrawals' ? '#dc2626' : undefined }}
              >
                Retiradas
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="desktop-table-wrapper">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 650 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)', backgroundColor: 'var(--bg-item, #fafbfc)' }}>
                  <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px' }}>
                    DESCRIÇÃO & COFRINHO
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
                  <tr className="empty-row">
                    <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                      <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                      Carregando movimentações dos cofrinhos...
                    </td>
                  </tr>
                ) : filteredSavings.length === 0 ? (
                  <tr className="empty-row">
                    <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                      Nenhuma movimentação encontrada para o filtro selecionado. Faça um depósito para começar!
                    </td>
                  </tr>
                ) : (
                  filteredSavings.map((item) => {
                    const isWithdrawal = item.amount < 0;
                    const pb = item.piggyBank || piggyBanks.find((p) => p.id === item.piggyBankId);
                    const pbColor = pb?.color || '#15803d';

                    return (
                      <tr
                        key={item.id}
                        className="data-table-row"
                      >
                        {/* Descrição with Piggy / Withdrawal Icon */}
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                backgroundColor: isWithdrawal ? '#fee2e2' : `${pbColor}18`,
                                color: isWithdrawal ? '#dc2626' : pbColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {isWithdrawal ? <ArrowDownRight size={18} /> : <PiggyBank size={18} />}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                                {item.description}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '1px 8px',
                                    borderRadius: 6,
                                    backgroundColor: isWithdrawal ? '#fee2e2' : '#ecfdf5',
                                    color: isWithdrawal ? '#b91c1c' : '#15803d',
                                  }}
                                >
                                  {isWithdrawal ? 'Resgate' : 'Depósito'}
                                </span>
                                {pb && (
                                  <span style={{ fontSize: 12, color: 'var(--text-muted, #64748b)' }}>
                                    em <strong>{pb.name}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Objetivo / Cofrinho */}
                        <td style={{ padding: '16px 20px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '3px 10px',
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: `${pbColor}15`,
                              color: pbColor,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: pbColor }} />
                            {item.objective || pb?.name || 'Geral'}
                          </span>
                        </td>

                        {/* Data */}
                        <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>
                          {formatDate(item.date)}
                        </td>

                        {/* Valor */}
                        <td style={{ padding: '16px 20px' }}>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                              color: isWithdrawal ? '#dc2626' : '#16a34a',
                            }}
                          >
                            {isWithdrawal ? `- ${formatCurrency(Math.abs(item.amount))}` : `+ ${formatCurrency(item.amount)}`}
                          </span>
                        </td>

                        {/* Ações */}
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => openEditSavingsModal(item)}
                              title="Editar movimentação"
                              style={{
                                color: 'var(--text-muted, #94a3b8)',
                                padding: 6,
                                borderRadius: 6,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingSavingsItem(item)}
                              title="Excluir movimentação"
                              style={{
                                color: '#ef4444',
                                padding: 6,
                                borderRadius: 6,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                              }}
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

        {/* Mobile Cards List */}
        <div className="mobile-cards-wrapper">
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
              Carregando movimentações...
            </div>
          ) : filteredSavings.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Nenhuma movimentação registrada ainda.
            </div>
          ) : (
            filteredSavings.map((item) => {
              const isWithdrawal = item.amount < 0;
              const pb = item.piggyBank || piggyBanks.find((p) => p.id === item.piggyBankId);
              const pbColor = pb?.color || '#15803d';

              return (
                <div key={item.id} className="expense-mobile-item">
                  <div className="expense-mobile-header">
                    <div className="expense-mobile-main">
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          backgroundColor: isWithdrawal ? '#fee2e2' : `${pbColor}18`,
                          color: isWithdrawal ? '#dc2626' : pbColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isWithdrawal ? <ArrowDownRight size={18} /> : <PiggyBank size={18} />}
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
                              backgroundColor: isWithdrawal ? '#fee2e2' : '#ecfdf5',
                              color: isWithdrawal ? '#b91c1c' : '#15803d',
                            }}
                          >
                            {isWithdrawal ? 'Resgate' : 'Depósito'}
                          </span>
                        </div>
                        <div className="expense-mobile-meta">
                          {pb && <span>{pb.name} • </span>}
                          <span>{formatDate(item.date)}</span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: isWithdrawal ? '#dc2626' : '#16a34a',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isWithdrawal ? `- ${formatCurrency(Math.abs(item.amount))}` : `+ ${formatCurrency(item.amount)}`}
                    </div>
                  </div>

                  <div className="expense-mobile-footer">
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: pbColor,
                        backgroundColor: `${pbColor}15`,
                        padding: '2px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {item.objective || pb?.name || 'Poupança'}
                    </span>

                    <div className="expense-mobile-actions">
                      <button
                        type="button"
                        onClick={() => openEditSavingsModal(item)}
                        className="btn-action-mobile"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingSavingsItem(item)}
                        className="btn-action-mobile delete"
                        title="Excluir"
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
         MODAL 1: CRIAR OU EDITAR COFRINHO
         ========================================================= */}
      <Modal
        isOpen={isPiggyModalOpen}
        onClose={() => setIsPiggyModalOpen(false)}
        title={editingPiggy ? 'Editar Cofrinho' : 'Criar Novo Cofrinho'}
        subtitle="Defina o objetivo, meta de valor e personalize as cores e ícones."
        icon={<PiggyBank size={22} />}
        maxWidth="500px"
      >
        <form onSubmit={handlePiggySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">
              Nome do Cofrinho *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Viagem de Férias, Reserva de Emergência, Carro..."
              value={piggyName}
              onChange={(e) => setPiggyName(e.target.value)}
              className="input-field"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">
                Meta de Valor (R$)
              </label>
              <div className="currency-input-wrapper">
                <span className="currency-input-prefix">R$</span>
                <input
                  type="text"
                  placeholder="0,00"
                  value={piggyTargetAmount}
                  onChange={(e) => setPiggyTargetAmount(e.target.value)}
                  className="currency-input-field"
                />
              </div>
            </div>

            <div>
              <label className="form-label">
                Prazo Estimado (Opcional)
              </label>
              <input
                type="date"
                value={piggyTargetDate}
                onChange={(e) => setPiggyTargetDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {!editingPiggy && (
            <div>
              <label className="form-label">
                Depósito Inicial (R$) (Opcional)
              </label>
              <div className="currency-input-wrapper">
                <span className="currency-input-prefix">R$</span>
                <input
                  type="text"
                  placeholder="0,00"
                  value={piggyInitialDeposit}
                  onChange={(e) => setPiggyInitialDeposit(e.target.value)}
                  className="currency-input-field"
                />
              </div>
            </div>
          )}

          {/* Color Picker */}
          <div>
            <label className="form-label">
              Cor do Cofrinho
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {PIGGY_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setPiggyColor(c.hex)}
                  title={c.label}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: c.hex,
                    border: piggyColor === c.hex ? '3px solid #ffffff' : 'none',
                    boxShadow: piggyColor === c.hex ? `0 0 0 2px ${c.hex}` : 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                    transform: piggyColor === c.hex ? 'scale(1.1)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="form-label">
              Ícone
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {PIGGY_ICONS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPiggyIcon(id)}
                  title={label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '8px 4px',
                    borderRadius: 10,
                    backgroundColor: piggyIcon === id ? `${piggyColor}20` : 'var(--bg-item, #f8fafc)',
                    color: piggyIcon === id ? piggyColor : 'var(--text-muted, #64748b)',
                    border: piggyIcon === id ? `2px solid ${piggyColor}` : '1px solid var(--border-color, #e2e8f0)',
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">
              Anotações / Descrição (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Meta até o final do ano para trocar de smartphone"
              value={piggyDesc}
              onChange={(e) => setPiggyDesc(e.target.value)}
              className="input-field"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsPiggyModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : editingPiggy ? 'Salvar alterações' : 'Criar cofrinho'}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
         MODAL 2: GUARDAR DINHEIRO (DEPÓSITO)
         ========================================================= */}
      <Modal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        title="Guardar Dinheiro no Cofrinho"
        subtitle="Adicione um valor ao seu cofrinho para se aproximar da sua meta."
        icon={<ArrowDownRight size={22} color="#15803d" />}
        maxWidth="460px"
      >
        <form onSubmit={handleDepositSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {operationError && (
            <div style={{ padding: 12, borderRadius: 10, backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} />
              <span>{operationError}</span>
            </div>
          )}

          <div>
            <label className="form-label">
              Cofrinho de Destino *
            </label>
            <select
              value={selectedPiggyId}
              onChange={(e) => {
                setSelectedPiggyId(e.target.value);
                const target = piggyBanks.find((p) => p.id === e.target.value);
                if (target) setOperationDesc(`Depósito no cofrinho ${target.name}`);
              }}
              className="input-field"
            >
              {piggyBanks.map((pb) => (
                <option key={pb.id} value={pb.id}>
                  {pb.name} (Saldo atual: {formatCurrency(pb.currentAmount)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">
              Valor a Guardar (R$) *
            </label>
            <div className="currency-input-wrapper">
              <span className="currency-input-prefix">R$</span>
              <input
                type="text"
                required
                placeholder="0,00"
                value={operationAmount}
                onChange={(e) => setOperationAmount(e.target.value)}
                className="currency-input-field"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="form-label">
              Data *
            </label>
            <input
              type="date"
              required
              value={operationDate}
              onChange={(e) => setOperationDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="form-label">
              Descrição / Origem (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Sobra do salário, Aporte mensal..."
              value={operationDesc}
              onChange={(e) => setOperationDesc(e.target.value)}
              className="input-field"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsDepositModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar depósito'}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
         MODAL 3: RETIRAR DINHEIRO (RESGATE)
         ========================================================= */}
      <Modal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        title="Retirar Dinheiro do Cofrinho"
        subtitle="Resgate um valor do seu cofrinho para utilizar quando precisar."
        icon={<MinusCircle size={22} color="#dc2626" />}
        maxWidth="460px"
      >
        <form onSubmit={handleWithdrawSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {operationError && (
            <div style={{ padding: 12, borderRadius: 10, backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} />
              <span>{operationError}</span>
            </div>
          )}

          <div>
            <label className="form-label">
              Cofrinho de Origem *
            </label>
            <select
              value={selectedPiggyId}
              onChange={(e) => {
                setSelectedPiggyId(e.target.value);
                const target = piggyBanks.find((p) => p.id === e.target.value);
                if (target) setOperationDesc(`Resgate do cofrinho ${target.name}`);
              }}
              className="input-field"
            >
              {piggyBanks.map((pb) => (
                <option key={pb.id} value={pb.id}>
                  {pb.name} (Disponível: {formatCurrency(pb.currentAmount)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">
              Valor a Retirar (R$) *
            </label>
            <div className="currency-input-wrapper">
              <span className="currency-input-prefix">R$</span>
              <input
                type="text"
                required
                placeholder="0,00"
                value={operationAmount}
                onChange={(e) => setOperationAmount(e.target.value)}
                className="currency-input-field"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="form-label">
              Data *
            </label>
            <input
              type="date"
              required
              value={operationDate}
              onChange={(e) => setOperationDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="form-label">
              Motivo do Resgate (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Compra de passagem, Emergência médica..."
              value={operationDesc}
              onChange={(e) => setOperationDesc(e.target.value)}
              className="input-field"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsWithdrawModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-withdraw"
              style={{ width: 'auto' }}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar retirada'}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
         MODAL 4: EDITAR MOVIMENTAÇÃO INDIVIDUAL
         ========================================================= */}
      <Modal
        isOpen={Boolean(editingSavingsItem)}
        onClose={() => setEditingSavingsItem(null)}
        title="Editar Movimentação"
        subtitle="Altere a descrição, cofrinho ou valor desta movimentação."
        icon={<Pencil size={20} />}
        maxWidth="460px"
      >
        <form onSubmit={handleEditSavingsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {operationError && (
            <div style={{ padding: 12, borderRadius: 10, backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: 13 }}>
              {operationError}
            </div>
          )}

          <div>
            <label className="form-label">
              Cofrinho
            </label>
            <select
              value={selectedPiggyId}
              onChange={(e) => setSelectedPiggyId(e.target.value)}
              className="input-field"
            >
              <option value="">Sem cofrinho específico (Poupança Geral)</option>
              {piggyBanks.map((pb) => (
                <option key={pb.id} value={pb.id}>
                  {pb.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">
              Descrição *
            </label>
            <input
              type="text"
              required
              value={operationDesc}
              onChange={(e) => setOperationDesc(e.target.value)}
              className="input-field"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">
                Valor (R$) *
              </label>
              <div className="currency-input-wrapper">
                <span className="currency-input-prefix">R$</span>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={operationAmount}
                  onChange={(e) => setOperationAmount(e.target.value)}
                  className="currency-input-field"
                />
              </div>
            </div>

            <div>
              <label className="form-label">
                Data *
              </label>
              <input
                type="date"
                required
                value={operationDate}
                onChange={(e) => setOperationDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditingSavingsItem(null)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation: Cofrinho */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingPiggy)}
        onClose={() => setDeletingPiggy(null)}
        onConfirm={handleDeletePiggyConfirm}
        title="Excluir Cofrinho?"
        itemDescription={`o cofrinho "${deletingPiggy?.name}" e todas as suas movimentações`}
        loading={actionLoading}
      />

      {/* Delete Confirmation: Movimentação */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingSavingsItem)}
        onClose={() => setDeletingSavingsItem(null)}
        onConfirm={handleDeleteSavingsConfirm}
        title="Excluir Movimentação?"
        itemDescription={`a movimentação "${deletingSavingsItem?.description}"`}
        loading={actionLoading}
      />
    </div>
  );
};
