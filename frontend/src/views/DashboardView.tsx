import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Calendar,
  PiggyBank,
  CheckCircle2,
  Loader2,
  CreditCard,
  ShoppingBag,
  ListFilter,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  PieChart,
  QrCode,
  Copy,
  Check,
  Pencil,
  Clock,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { NavTab } from '../components/Sidebar';
import { MonthSelector } from '../components/MonthSelector';
import { Modal } from '../components/Modal';
import { MonthItem, getInitialMonthItem, FULL_MONTH_NAMES, MONTH_LABELS } from '../utils/dateUtils';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  onOpenQuickLaunch: () => void;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Moradia':
      return {
        bg: '#eff6ff',
        border: '#bfdbfe',
        text: '#1d4ed8',
        bar: '#3b82f6',
        dot: '#2563eb',
        darkBg: 'rgba(59, 130, 246, 0.12)',
        darkBorder: 'rgba(59, 130, 246, 0.32)',
        darkText: '#60a5fa',
        darkDot: '#60a5fa',
      };
    case 'Alimentação':
      return {
        bg: '#fffbeb',
        border: '#fde68a',
        text: '#b45309',
        bar: '#f59e0b',
        dot: '#d97706',
        darkBg: 'rgba(245, 158, 11, 0.12)',
        darkBorder: 'rgba(245, 158, 11, 0.32)',
        darkText: '#fbbf24',
        darkDot: '#fbbf24',
      };
    case 'Transporte':
      return {
        bg: '#f0f9ff',
        border: '#bae6fd',
        text: '#0369a1',
        bar: '#0ea5e9',
        dot: '#0284c7',
        darkBg: 'rgba(14, 165, 233, 0.12)',
        darkBorder: 'rgba(14, 165, 233, 0.32)',
        darkText: '#38bdf8',
        darkDot: '#38bdf8',
      };
    case 'Streaming':
      return {
        bg: '#faf5ff',
        border: '#e9d5ff',
        text: '#6b21a8',
        bar: '#a855f7',
        dot: '#9333ea',
        darkBg: 'rgba(168, 85, 247, 0.12)',
        darkBorder: 'rgba(168, 85, 247, 0.32)',
        darkText: '#c084fc',
        darkDot: '#c084fc',
      };
    case 'Lazer':
      return {
        bg: '#fdf2f8',
        border: '#fbcfe8',
        text: '#be185d',
        bar: '#ec4899',
        dot: '#db2777',
        darkBg: 'rgba(236, 72, 153, 0.12)',
        darkBorder: 'rgba(236, 72, 153, 0.32)',
        darkText: '#f472b6',
        darkDot: '#f472b6',
      };
    case 'Saúde':
      return {
        bg: '#fef2f2',
        border: '#fecaca',
        text: '#b91c1c',
        bar: '#ef4444',
        dot: '#dc2626',
        darkBg: 'rgba(239, 68, 68, 0.12)',
        darkBorder: 'rgba(239, 68, 68, 0.32)',
        darkText: '#f87171',
        darkDot: '#f87171',
      };
    case 'Educação':
      return {
        bg: '#f0fdfa',
        border: '#99f6e4',
        text: '#0f766e',
        bar: '#14b8a6',
        dot: '#0d9488',
        darkBg: 'rgba(20, 184, 166, 0.12)',
        darkBorder: 'rgba(20, 184, 166, 0.32)',
        darkText: '#2dd4bf',
        darkDot: '#2dd4bf',
      };
    case 'Serviços':
      return {
        bg: '#f8fafc',
        border: '#e2e8f0',
        text: '#334155',
        bar: '#64748b',
        dot: '#475569',
        darkBg: 'rgba(100, 116, 139, 0.14)',
        darkBorder: 'rgba(100, 116, 139, 0.32)',
        darkText: '#94a3b8',
        darkDot: '#94a3b8',
      };
    default:
      return {
        bg: '#f8fafc',
        border: '#e2e8f0',
        text: '#475569',
        bar: '#94a3b8',
        dot: '#64748b',
        darkBg: 'rgba(148, 163, 184, 0.10)',
        darkBorder: 'rgba(148, 163, 184, 0.25)',
        darkText: '#cbd5e1',
        darkDot: '#cbd5e1',
      };
  }
};

const getCategorySlug = (category: string) => {
  return (category || 'outros')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-');
};

const VARIABLE_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Lazer',
  'Educação',
  'Streaming',
  'Serviços',
  'Outros',
];

const REVENUE_CATEGORIES = [
  'Salário',
  'Investimentos',
  'Freelance',
  'Vendas',
  'Aluguel',
  'Presente',
  'Reembolso',
  'Outros',
];

const extractDateFromTransaction = (tx: any): string => {
  if (!tx || !tx.date) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(tx.date);
    if (!isNaN(d.getTime())) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return String(tx.date).split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

const extractTimeFromTransaction = (tx: any): string => {
  if (!tx) return '12:00';
  if (tx.date) {
    const d = new Date(tx.date);
    if (!isNaN(d.getTime())) {
      const h = d.getUTCHours();
      const m = d.getUTCMinutes();
      if (h !== 0 || m !== 0) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }
  }
  if (tx.createdAt) {
    const c = new Date(tx.createdAt);
    if (!isNaN(c.getTime())) {
      const h = c.getUTCHours();
      const m = c.getUTCMinutes();
      if (h !== 0 || m !== 0) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }
  }
  return '12:00';
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenQuickLaunch }) => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<MonthItem>(() => getInitialMonthItem(user?.createdAt));
  const [data, setData] = useState<any>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [loading, setLoading] = useState(true);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'revenues' | 'expenses'>('all');

  // Annual View state
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');
  const [selectedAnnualYear, setSelectedAnnualYear] = useState<number>(() => selectedMonth.year);
  const [annualData, setAnnualData] = useState<any>(null);
  const [annualLoading, setAnnualLoading] = useState(false);
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);

  // Edit Transaction state
  const [editingTx, setEditingTx] = useState<any>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPixKey, setEditPixKey] = useState('');
  const [editPiggyBankId, setEditPiggyBankId] = useState('');
  const [editSavingType, setEditSavingType] = useState<'deposit' | 'withdraw'>('deposit');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleOpenEdit = (tx: any) => {
    setEditingTx(tx);
    setEditDesc(tx.description || '');
    setEditAmount(String(tx.amount || ''));
    setEditDate(extractDateFromTransaction(tx));
    setEditTime(extractTimeFromTransaction(tx));
    setEditCategory(tx.category || (tx.type === 'revenue' ? 'Outros' : 'Alimentação'));
    setEditPixKey(tx.pixKey || '');
    setEditPiggyBankId(tx.piggyBank?.id || '');
    setEditSavingType(tx.type === 'savings_withdraw' ? 'withdraw' : 'deposit');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx || !editDesc || !editAmount || !editDate) return;

    try {
      setEditLoading(true);
      setEditError(null);
      const parsedAmount = parseFloat(String(editAmount).replace(',', '.'));
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setEditError('Informe um valor numérico válido maior que zero.');
        setEditLoading(false);
        return;
      }

      const combinedDate = `${editDate}T${editTime || '12:00'}:00.000Z`;

      if (editingTx.type === 'variable_expense') {
        await api.updateVariableExpense(editingTx.originalId, {
          description: editDesc,
          amount: parsedAmount,
          date: combinedDate,
          category: editCategory,
          pixKey: editPixKey.trim() || null,
        });
      } else if (editingTx.type === 'revenue') {
        await api.updateRevenue(editingTx.originalId, {
          description: editDesc,
          amount: parsedAmount,
          date: combinedDate,
          category: editCategory,
        });
      } else if (editingTx.type === 'savings_deposit' || editingTx.type === 'savings_withdraw') {
        const finalAmount = editSavingType === 'withdraw' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
        await api.updateSavings(editingTx.originalId, {
          description: editDesc,
          amount: finalAmount,
          date: combinedDate,
          piggyBankId: editPiggyBankId || null,
        });
      } else if (editingTx.type === 'fixed_expense' || editingTx.type === 'credit_card_payment') {
        if (editingTx.originalId.startsWith('card-invoice-') || editingTx.type === 'credit_card_payment') {
          await api.updateFixedExpenseMonthAmount(editingTx.originalId, {
            month: selectedMonth.month,
            year: selectedMonth.year,
            amount: parsedAmount,
            scope: 'month',
            paidAt: combinedDate,
          });
        } else {
          await api.updateFixedExpenseMonthAmount(editingTx.originalId, {
            month: selectedMonth.month,
            year: selectedMonth.year,
            amount: parsedAmount,
            scope: 'month',
            paidAt: combinedDate,
          });
          await api.updateFixedExpense(editingTx.originalId, {
            description: editDesc,
            category: editCategory,
            pixKey: editPixKey.trim() || null,
          });
        }
      }

      setEditingTx(null);
      await fetchDashboardData(selectedMonth.month, selectedMonth.year);
    } catch (err: any) {
      console.error('Error saving transaction edit:', err);
      setEditError(err.message || 'Erro ao salvar alterações na movimentação.');
    } finally {
      setEditLoading(false);
    }
  };

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

  const fetchDashboardData = async (month: number, year: number) => {
    try {
      setLoading(true);
      const res = await api.getDashboard(month, year);
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnualData = async (year: number) => {
    try {
      setAnnualLoading(true);
      const res = await api.getDashboardAnnual(year);
      setAnnualData(res);
    } catch (err) {
      console.error('Failed to load annual dashboard data:', err);
    } finally {
      setAnnualLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedMonth.month, selectedMonth.year);
  }, [selectedMonth.month, selectedMonth.year]);

  const handleChangeAnnualYear = (delta: number) => {
    const nextYear = selectedAnnualYear + delta;
    setSelectedAnnualYear(nextYear);
    fetchAnnualData(nextYear);
  };

  const handleOpenMonthFromAnnual = (monthNum: number) => {
    const now = new Date();
    const item: MonthItem = {
      month: monthNum,
      year: selectedAnnualYear,
      label: MONTH_LABELS[monthNum - 1],
      yearLabel: String(selectedAnnualYear),
      isCurrent: monthNum === now.getMonth() + 1 && selectedAnnualYear === now.getFullYear(),
    };
    setSelectedMonth(item);
    setViewMode('monthly');
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || isNaN(val)) return 'R$ 0,00';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getFormattedDate = () => {
    try {
      const now = new Date();
      const isCurrentMonth =
        selectedMonth.month === now.getMonth() + 1 && selectedMonth.year === now.getFullYear();
      if (isCurrentMonth) {
        return new Intl.DateTimeFormat('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
          .format(now)
          .toUpperCase();
      }
      return `${FULL_MONTH_NAMES[selectedMonth.month - 1].toUpperCase()} DE ${selectedMonth.year}`;
    } catch {
      return `${selectedMonth.label.toUpperCase()} ${selectedMonth.year}`;
    }
  };

  const rawName = user?.name || data?.user?.name || 'usuário';
  const firstName = rawName.trim().split(' ')[0] || rawName;

  // Extrato de movimentações efetuadas:
  // Se for despesa fixa ou fatura de cartão, deve constar SOMENTE se estiver paga (isPaid === true)
  const rawTransactions: any[] = (data?.transactions || []).filter((t: any) => {
    if (t.type === 'fixed_expense' || t.type === 'credit_card_payment') return t.isPaid === true;
    return true;
  });

  // Ordenação exata: mais recente primeiro (data/hora desc), com tie-break por createdAt desc
  const sortedTransactions = [...rawTransactions].sort((a, b) => {
    const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (timeDiff !== 0) return timeDiff;
    const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    return bCreated - aCreated;
  });

  const filteredTransactions = sortedTransactions.filter((t) => {
    if (transactionFilter === 'revenues') return t.type === 'revenue' || t.type === 'savings_withdraw';
    if (transactionFilter === 'expenses') return t.type === 'variable_expense' || t.type === 'fixed_expense' || t.type === 'credit_card_payment' || t.type === 'savings_deposit';
    return true;
  });

  const totalEntradas = sortedTransactions
    .filter((t) => t.type === 'revenue')
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  const totalSaidas = sortedTransactions
    .filter((t) => t.type !== 'revenue')
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  const saldo = data?.kpis?.saldoDisponivel ?? 0;
  const isNegative = saldo < 0;

  return (
    <div className="content-container animate-fade-in">
      {/* Top Welcome & Actions */}
      <div className="view-header-row">
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: '#15803d',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            {getFormattedDate()}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>
            Olá, {firstName}.
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4, margin: 0 }}>
            Veja o resumo das suas finanças em {FULL_MONTH_NAMES[selectedMonth.month - 1].toLowerCase()} de {selectedMonth.year}.
          </p>
        </div>

        <div className="view-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
              <Loader2 size={16} className="animate-spin" color="#15803d" />
              <span>Atualizando...</span>
            </div>
          )}
          <button
            className="btn-primary"
            onClick={onOpenQuickLaunch}
            style={{ padding: '10px 18px', borderRadius: 10, whiteSpace: 'nowrap' }}
          >
            <Plus size={18} /> Novo lançamento
          </button>
        </div>
      </div>

      {/* View Mode Toggle: Mensal vs Anual */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-card, #ffffff)',
            padding: 4,
            borderRadius: 12,
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.03))',
          }}
        >
          <button
            onClick={() => setViewMode('monthly')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: viewMode === 'monthly' ? '#15803d' : 'transparent',
              color: viewMode === 'monthly' ? '#ffffff' : 'var(--text-secondary, #64748b)',
            }}
          >
            <Calendar size={16} /> Visão Mensal
          </button>
          <button
            onClick={() => {
              setViewMode('annual');
              if (!annualData || annualData.year !== selectedAnnualYear) {
                fetchAnnualData(selectedAnnualYear);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: viewMode === 'annual' ? '#15803d' : 'transparent',
              color: viewMode === 'annual' ? '#ffffff' : 'var(--text-secondary, #64748b)',
            }}
          >
            <BarChart3 size={16} /> Painel Anual
          </button>
        </div>

        {viewMode === 'annual' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => handleChangeAnnualYear(-1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '7px 14px',
                borderRadius: 8,
                backgroundColor: 'var(--bg-card, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                color: 'var(--text-main, #0f172a)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Ano anterior"
            >
              <ChevronLeft size={16} /> {selectedAnnualYear - 1}
            </button>
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: 'var(--text-main, #0f172a)',
                padding: '0 8px',
              }}
            >
              Exercício {selectedAnnualYear}
            </span>
            <button
              onClick={() => handleChangeAnnualYear(1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '7px 14px',
                borderRadius: 8,
                backgroundColor: 'var(--bg-card, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                color: 'var(--text-main, #0f172a)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Próximo ano"
            >
              {selectedAnnualYear + 1} <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {viewMode === 'monthly' ? (
        <>
          {/* Month Carousel Selector */}
          <MonthSelector
        selectedMonth={selectedMonth}
        onSelectMonth={(m) => setSelectedMonth(m)}
        createdAt={user?.createdAt}
      />

      {/* KPI Cards Grid */}
      <div className="kpi-cards-grid">
        {/* Card 1: Saldo Disponível (Vermelho se negativo, verde se positivo) */}
        <div
          style={{
            background: isNegative
              ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
              : 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
            borderRadius: 16,
            padding: 24,
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: isNegative
              ? '0 4px 12px rgba(220, 38, 38, 0.28)'
              : '0 4px 12px rgba(21, 128, 61, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 140,
            transition: 'background 0.3s ease, box-shadow 0.3s ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: -30,
              bottom: -40,
              width: 140,
              height: 140,
              borderRadius: '50%',
              border: '24px solid rgba(255, 255, 255, 0.08)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500 }}>
              Saldo disponível
            </span>
            <button
              onClick={() => setShowBalance(!showBalance)}
              style={{
                color: 'white',
                opacity: 0.85,
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
              title={showBalance ? 'Ocultar saldo' : 'Mostrar saldo'}
            >
              {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          <div style={{ margin: '14px 0 10px' }}>
            <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px' }}>
              {showBalance ? formatCurrency(saldo) : '••••••'}
            </span>
          </div>

          <div style={{ fontSize: 12, color: isNegative ? '#fecaca' : '#86efac', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            <span>{data?.kpis?.saldoGrowthPct > 0 ? `↑ ${data.kpis.saldoGrowthPct}%` : '0.0%'}</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 400 }}>em relação ao mês anterior</span>
          </div>
        </div>

        {/* Card 2: Minha renda */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 140 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Minha renda</span>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#ecfdf5',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowDownLeft size={18} />
            </div>
          </div>

          <div style={{ margin: '14px 0 10px' }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
              {showBalance ? formatCurrency(data?.kpis?.receitasTotais ?? 0) : '••••••'}
            </span>
          </div>

          <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
            {data?.kpis?.receitasGrowthPct > 0 ? `+${data.kpis.receitasGrowthPct}%` : '0.0%'}{' '}
            <span style={{ color: '#64748b', fontWeight: 400 }}>neste mês</span>
          </div>
        </div>

        {/* Card 3: Despesas Totais */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 140 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Despesas totais</span>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#ffedd5',
                color: '#ea580c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={18} />
            </div>
          </div>

          <div style={{ margin: '14px 0 10px' }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
              {showBalance ? formatCurrency(data?.kpis?.despesasTotais ?? 0) : '••••••'}
            </span>
          </div>

          <div style={{ fontSize: 12, color: '#64748b' }}>
            Fixas e variáveis
          </div>
        </div>

        {/* Card 4: Na Poupança */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 140 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Na poupança</span>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#f3e8ff',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PiggyBank size={18} />
            </div>
          </div>

          <div style={{ margin: '14px 0 10px' }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
              {showBalance ? formatCurrency(data?.kpis?.naPoupanca ?? 0) : '••••••'}
            </span>
          </div>

          <div style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
            Total guardado acumulado
          </div>
        </div>
      </div>

      {/* Gastos por Categoria (Visão Mensal) */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <PieChart size={18} color="#15803d" />
              Gastos por categoria em {FULL_MONTH_NAMES[selectedMonth.month - 1]} de {selectedMonth.year}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', margin: '2px 0 0' }}>
              Distribuição proporcional de contas a pagar e gastos variáveis deste mês
            </p>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>
            Total de despesas: <strong style={{ color: 'var(--text-main, #0f172a)', fontSize: 13 }}>{formatCurrency(data?.kpis?.despesasTotais ?? 0)}</strong>
          </div>
        </div>

        {!data?.categories || data.categories.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: 'var(--text-muted, #94a3b8)',
              fontSize: 13,
              backgroundColor: 'var(--bg-item, #f8fafc)',
              borderRadius: 10,
              border: '1px solid var(--border-color, #f1f5f9)',
            }}
          >
            Nenhuma despesa registrada em {selectedMonth.label} de {selectedMonth.year}.
          </div>
        ) : (
          <div className="category-overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {data.categories.map((cat: any) => {
              const theme = getCategoryColor(cat.name);
              const slug = getCategorySlug(cat.name);
              return (
                <div
                  key={cat.name}
                  className={`category-card-item category-card-${slug}`}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    backgroundColor: 'var(--cat-bg, ' + theme.bg + ')',
                    border: '1px solid var(--cat-border, ' + theme.border + ')',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    '--cat-bg': theme.bg,
                    '--cat-border': theme.border,
                    '--cat-text': theme.text,
                    '--cat-bar': theme.bar,
                    '--cat-dot': theme.dot,
                    '--cat-dark-bg': theme.darkBg,
                    '--cat-dark-border': theme.darkBorder,
                    '--cat-dark-text': theme.darkText,
                    '--cat-dark-dot': theme.darkDot,
                  } as React.CSSProperties}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="category-card-dot" style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: theme.dot }} />
                      <span className="category-card-name" style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>
                        {cat.name}
                      </span>
                    </div>
                    <span className="category-card-pct" style={{ fontSize: 12, fontWeight: 800, color: theme.text }}>
                      {cat.percentage}%
                    </span>
                  </div>
                  <div className="category-card-track" style={{ width: '100%', height: 6, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                    <div
                      style={{
                        width: `${Math.min(cat.percentage, 100)}%`,
                        height: '100%',
                        backgroundColor: theme.bar,
                        borderRadius: 3,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                  <div className="category-card-amount" style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                    {formatCurrency(cat.total)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 2: Histórico de Transações & Próximos Vencimentos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr',
          gap: 20,
          marginBottom: 28,
        }}
        className="dashboard-two-col"
      >
        {/* Histórico de Transações (Todas as entradas e saídas) */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          {/* Header with Title and Filter Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ListFilter size={18} color="#15803d" />
                Movimentações financeiras
              </h3>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>
                Extrato de movimentações efetuadas em {FULL_MONTH_NAMES[selectedMonth.month - 1]} de {selectedMonth.year}
              </p>
            </div>

            {/* Filter Pills */}
            <div className="tx-filter-bar">
              <button
                onClick={() => setTransactionFilter('all')}
                className={`tx-filter-btn ${transactionFilter === 'all' ? 'active' : ''}`}
              >
                Todas ({rawTransactions.length})
              </button>
              <button
                onClick={() => setTransactionFilter('revenues')}
                className={`tx-filter-btn ${transactionFilter === 'revenues' ? 'active' : ''}`}
                style={{ color: transactionFilter === 'revenues' ? '#16a34a' : undefined }}
              >
                Entradas ({rawTransactions.filter((t) => t.type === 'revenue').length})
              </button>
              <button
                onClick={() => setTransactionFilter('expenses')}
                className={`tx-filter-btn ${transactionFilter === 'expenses' ? 'active' : ''}`}
                style={{ color: transactionFilter === 'expenses' ? '#dc2626' : undefined }}
              >
                Saídas ({rawTransactions.filter((t) => t.type !== 'revenue').length})
              </button>
            </div>
          </div>

          {/* List of transactions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
            {filteredTransactions.length === 0 ? (
              <div
                style={{
                  padding: '40px 16px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: 13,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                  }}
                >
                  <ListFilter size={20} />
                </div>
                <span>Nenhuma transação encontrada para {selectedMonth.label} de {selectedMonth.year}.</span>
              </div>
            ) : (
              filteredTransactions.map((tx: any) => {
                const isRevenue = tx.type === 'revenue';
                const isCreditCard = tx.type === 'credit_card_payment' || tx.isCreditCard || tx.originalId?.startsWith('card-invoice-') || tx.category === 'Cartão de Crédito';
                const isFixed = tx.type === 'fixed_expense' && !isCreditCard;
                const isSavingsDeposit = tx.type === 'savings_deposit';
                const isSavingsWithdraw = tx.type === 'savings_withdraw';
                const isSavings = isSavingsDeposit || isSavingsWithdraw;
                const isPositive = isRevenue || isSavingsWithdraw;

                return (
                  <div
                    key={tx.id}
                    className="dashboard-list-item"
                  >
                    {/* Left: Icon and Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          backgroundColor: isSavings
                            ? (isSavingsDeposit ? '#ecfdf5' : '#f3e8ff')
                            : isRevenue
                            ? '#ecfdf5'
                            : isCreditCard
                            ? '#eff6ff'
                            : isFixed
                            ? '#ffedd5'
                            : '#f3e8ff',
                          color: isSavings
                            ? (isSavingsDeposit ? '#15803d' : '#7c3aed')
                            : isRevenue
                            ? '#15803d'
                            : isCreditCard
                            ? '#2563eb'
                            : isFixed
                            ? '#ea580c'
                            : '#7c3aed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isSavings ? (
                          <PiggyBank size={18} />
                        ) : isRevenue ? (
                          <ArrowDownLeft size={18} />
                        ) : isCreditCard ? (
                          <CreditCard size={18} />
                        ) : isFixed ? (
                          <Calendar size={18} />
                        ) : (
                          <ShoppingBag size={18} />
                        )}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                            {tx.description}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              backgroundColor: isSavingsDeposit
                                ? '#dcfce7'
                                : isSavingsWithdraw
                                ? '#ede9fe'
                                : isRevenue
                                ? '#dcfce7'
                                : isCreditCard
                                ? '#dbeafe'
                                : isFixed
                                ? '#ffedd5'
                                : '#f3e8ff',
                              color: isSavingsDeposit
                                ? '#15803d'
                                : isSavingsWithdraw
                                ? '#7c3aed'
                                : isRevenue
                                ? '#15803d'
                                : isCreditCard
                                ? '#1d4ed8'
                                : isFixed
                                ? '#ea580c'
                                : '#7c3aed',
                            }}
                          >
                            {isSavingsDeposit
                              ? 'Cofrinho'
                              : isSavingsWithdraw
                              ? 'Resgate'
                              : isRevenue
                              ? 'Minha renda'
                              : isCreditCard
                              ? 'Cartão'
                              : isFixed
                              ? 'Fixa'
                              : 'Variável'}
                          </span>
                          {isFixed && tx.hasCustomAmount && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 4,
                                backgroundColor: '#fef3c7',
                                color: '#b45309',
                              }}
                              title="Valor ajustado especificamente para este mês"
                            >
                              Ajustado no mês
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                          {tx.category} • {tx.dateFormatted}
                        </div>
                      </div>
                    </div>

                    {/* Right: Status and Amount */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {(isFixed || isCreditCard) && (
                          <span
                            className="badge-paid"
                            style={{ fontSize: 11, padding: '2px 8px' }}
                          >
                            Pago
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: isPositive ? '#16a34a' : 'var(--text-main, #0f172a)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isPositive ? `+ ${formatCurrency(tx.amount)}` : `- ${formatCurrency(tx.amount)}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(tx)}
                          title="Editar movimentação"
                          className="btn-tx-edit"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            border: '1px solid var(--border-color, #e2e8f0)',
                            backgroundColor: 'var(--bg-card, #ffffff)',
                            color: 'var(--text-muted, #64748b)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#15803d';
                            e.currentTarget.style.borderColor = '#86efac';
                            e.currentTarget.style.backgroundColor = '#ecfdf5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-muted, #64748b)';
                            e.currentTarget.style.borderColor = 'var(--border-color, #e2e8f0)';
                            e.currentTarget.style.backgroundColor = 'var(--bg-card, #ffffff)';
                          }}
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                      {tx.pixKey && (
                        <button
                          type="button"
                          onClick={() => handleCopyPix(tx.id, tx.pixKey)}
                          title={`Chave Pix: ${tx.pixKey}`}
                          className={`btn-pix-copy-emerald ${copiedPixId === tx.id ? 'copied' : ''}`}
                        >
                          <QrCode size={10} />
                          {copiedPixId === tx.id ? 'Pix copiado!' : 'Copiar Pix'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Summary Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid #f1f5f9',
              paddingTop: 14,
              marginTop: 14,
              fontSize: 12,
              color: '#64748b',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div>
              Entradas: <strong style={{ color: '#16a34a' }}>+ {formatCurrency(totalEntradas)}</strong>
            </div>
            <div>
              Saídas: <strong style={{ color: '#0f172a' }}>- {formatCurrency(totalSaidas)}</strong>
            </div>
            <div>
              Balanço: <strong style={{ color: totalEntradas - totalSaidas >= 0 ? '#16a34a' : '#dc2626' }}>
                {formatCurrency(totalEntradas - totalSaidas)}
              </strong>
            </div>
          </div>
        </div>

        {/* Próximos Vencimentos */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Próximos vencimentos
              </h3>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>
                Despesas que precisam de atenção
              </p>
            </div>
            <button
              onClick={() => onNavigate('fixed-expenses')}
              style={{ fontSize: 12, fontWeight: 600, color: '#15803d' }}
            >
              Ver todas
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            {!data?.upcomingBills || data.upcomingBills.length === 0 ? (
              <div
                style={{
                  padding: '30px 16px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: 13,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  margin: 'auto 0',
                }}
              >
                <CheckCircle2 size={24} color="#15803d" />
                <span>Nenhum vencimento pendente em {FULL_MONTH_NAMES[selectedMonth.month - 1].toLowerCase()} de {selectedMonth.year}. Tudo em dia!</span>
              </div>
            ) : (
              data.upcomingBills.map((bill: any) => (
                <div
                  key={bill.id}
                  className="dashboard-list-item"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: '#ffedd5',
                        color: '#ea580c',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Calendar size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                        {bill.description}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
                        {bill.dueDateFormatted}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main, #0f172a)', textAlign: 'right' }}>
                    <div>{formatCurrency(bill.amount)}</div>
                    {bill.hasCustomAmount && (
                      <span style={{ fontSize: 10, color: '#b45309', fontWeight: 600 }}>Ajustado</span>
                    )}
                    {bill.pixKey && (
                      <div style={{ marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => handleCopyPix(bill.id, bill.pixKey)}
                          title={`Chave Pix: ${bill.pixKey}`}
                          className={`btn-pix-copy-emerald ${copiedPixId === bill.id ? 'copied' : ''}`}
                        >
                          <QrCode size={10} />
                          {copiedPixId === bill.id ? 'Pix copiado!' : 'Copiar Pix'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  ) : (
    /* Annual View Panel */
    annualLoading ? (
      <div className="card" style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
        <Loader2 size={30} className="animate-spin" color="#15803d" style={{ margin: '0 auto 12px' }} />
        <div>Carregando demonstrativo anual de {selectedAnnualYear}...</div>
      </div>
    ) : (
      <div className="animate-fade-in">
        {/* Annual KPI Cards */}
        <div className="kpi-cards-grid" style={{ marginBottom: 24 }}>
          {/* Saldo Anual */}
          <div
            style={{
              background: (annualData?.kpis?.saldoAnual ?? 0) < 0
                ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                : 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
              borderRadius: 16,
              padding: 24,
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: (annualData?.kpis?.saldoAnual ?? 0) < 0
                ? '0 4px 12px rgba(220, 38, 38, 0.28)'
                : '0 4px 12px rgba(21, 128, 61, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 140,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500 }}>
                Saldo acumulado no ano
              </span>
              <button
                onClick={() => setShowBalance(!showBalance)}
                style={{ color: 'white', opacity: 0.85, padding: 4, display: 'flex', alignItems: 'center' }}
                title={showBalance ? 'Ocultar saldo' : 'Mostrar saldo'}
              >
                {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>

            <div style={{ margin: '14px 0 10px' }}>
              <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px' }}>
                {showBalance ? formatCurrency(annualData?.kpis?.saldoAnual ?? 0) : '••••••'}
              </span>
            </div>

            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.85)' }}>
              Balanço consolidado de {selectedAnnualYear}
            </div>
          </div>

          {/* Renda Anual */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 140 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>Renda do ano</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#ecfdf5', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowDownLeft size={18} />
              </div>
            </div>

            <div style={{ margin: '14px 0 10px' }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main, #0f172a)', letterSpacing: '-0.5px' }}>
                {showBalance ? formatCurrency(annualData?.kpis?.totalAnnualRevenues ?? 0) : '••••••'}
              </span>
            </div>

            <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
              Entradas de jan a dez
            </div>
          </div>

          {/* Despesas Anuais */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 140 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>Despesas do ano</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={18} />
              </div>
            </div>

            <div style={{ margin: '14px 0 10px' }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main, #0f172a)', letterSpacing: '-0.5px' }}>
                {showBalance ? formatCurrency(annualData?.kpis?.totalAnnualExpenses ?? 0) : '••••••'}
              </span>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)' }}>
              Fixas e variáveis acumuladas
            </div>
          </div>

          {/* Na Poupança */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 140 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>Poupança no ano</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PiggyBank size={18} />
              </div>
            </div>

            <div style={{ margin: '14px 0 10px' }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main, #0f172a)', letterSpacing: '-0.5px' }}>
                {showBalance ? formatCurrency(annualData?.kpis?.totalAnnualSavings ?? 0) : '••••••'}
              </span>
            </div>

            <div style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
              Reserva guardada no período
            </div>
          </div>
        </div>

        {/* Gráfico Comparativo Mês a Mês */}
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)' }}>
                Comparativo de renda e despesas por mês
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', margin: '2px 0 0' }}>
                Evolução financeira ao longo dos 12 meses de {selectedAnnualYear} (clique em um mês para abrir)
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#16a34a' }} />
                <span style={{ color: 'var(--text-secondary, #64748b)' }}>Minha renda</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#ea580c' }} />
                <span style={{ color: 'var(--text-secondary, #64748b)' }}>Despesas</span>
              </div>
            </div>
          </div>

          {/* Bars container */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: 8,
              alignItems: 'flex-end',
              height: 160,
              paddingTop: 16,
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
            }}
          >
            {(annualData?.months || []).map((m: any) => {
              const maxVal = Math.max(1, ...(annualData?.months || []).map((item: any) => Math.max(item.receitas, item.despesas)));
              const revHeight = m.receitas > 0 ? Math.max(6, Math.round((m.receitas / maxVal) * 120)) : 4;
              const expHeight = m.despesas > 0 ? Math.max(6, Math.round((m.despesas / maxVal) * 120)) : 4;

              return (
                <div
                  key={m.month}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleOpenMonthFromAnnual(m.month)}
                  title={`${m.fullName}: Receitas ${formatCurrency(m.receitas)} | Despesas ${formatCurrency(m.despesas)} | Saldo ${formatCurrency(m.saldo)} (Clique para abrir)`}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, width: '100%', justifyContent: 'center' }}>
                    <div
                      style={{
                        width: '42%',
                        maxWidth: 16,
                        height: revHeight,
                        backgroundColor: m.receitas > 0 ? '#16a34a' : 'rgba(22, 163, 74, 0.2)',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                    />
                    <div
                      style={{
                        width: '42%',
                        maxWidth: 16,
                        height: expHeight,
                        backgroundColor: m.despesas > 0 ? '#ea580c' : 'rgba(234, 88, 12, 0.2)',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted, #94a3b8)',
                      marginTop: 8,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    {m.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabela Demonstrativa Mês a Mês */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color, #f1f5f9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)' }}>
                Detalhamento mensal consolidado
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', margin: '2px 0 0' }}>
                Todos os meses do ano com demonstrativo de renda, despesas e saldo
              </p>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
              {selectedAnnualYear} • 12 meses
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)', backgroundColor: 'var(--bg-item, #fafbfc)' }}>
                  <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px' }}>
                    MÊS
                  </th>
                  <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px' }}>
                    MINHA RENDA
                  </th>
                  <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px' }}>
                    DESPESAS
                  </th>
                  <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px' }}>
                    SALDO DO MÊS
                  </th>
                  <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px' }}>
                    MOVIMENTAÇÕES
                  </th>
                  <th style={{ padding: '12px 24px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px', textAlign: 'right' }}>
                    AÇÃO
                  </th>
                </tr>
              </thead>
              <tbody>
                {(annualData?.months || []).map((m: any) => {
                  const isMonthNegative = m.saldo < 0;
                  return (
                    <tr
                      key={m.month}
                      className="data-table-row"
                    >
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                          {m.fullName}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 700, color: '#16a34a' }}>
                        + {formatCurrency(m.receitas)}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 700, color: '#ea580c' }}>
                        - {formatCurrency(m.despesas)}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 800, color: isMonthNegative ? '#dc2626' : '#16a34a' }}>
                        {formatCurrency(m.saldo)}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 12, color: 'var(--text-muted, #64748b)' }}>
                        {m.fixedCount} fixas • {m.varCount} variáveis • {m.revCount} rendas
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenMonthFromAnnual(m.month)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 14px',
                            borderRadius: 8,
                            backgroundColor: 'var(--bg-item, #f1f5f9)',
                            color: 'var(--text-main, #0f172a)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: '1px solid var(--border-color, #e2e8f0)',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#15803d';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-item, #f1f5f9)';
                            e.currentTarget.style.color = 'var(--text-main, #0f172a)';
                          }}
                        >
                          Ver mês <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Despesas por Categoria no Ano */}
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <PieChart size={18} color="#15803d" />
                Gastos por categoria em {selectedAnnualYear}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', margin: '2px 0 0' }}>
                Consolidação anual de contas a pagar e gastos variáveis por categoria
              </p>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>
              Total no ano: <strong style={{ color: 'var(--text-main, #0f172a)', fontSize: 13 }}>{formatCurrency(annualData?.kpis?.totalAnnualExpenses ?? 0)}</strong>
            </div>
          </div>

          {!annualData?.categories || annualData.categories.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--text-muted, #94a3b8)',
                fontSize: 13,
                backgroundColor: 'var(--bg-item, #f8fafc)',
                borderRadius: 10,
                border: '1px solid var(--border-color, #f1f5f9)',
              }}
            >
              Nenhum gasto registrado em {selectedAnnualYear}.
            </div>
          ) : (
            <div className="category-overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {annualData.categories.map((cat: any) => {
                const theme = getCategoryColor(cat.name);
                const slug = getCategorySlug(cat.name);
                return (
                  <div
                    key={cat.name}
                    className={`category-card-item category-card-${slug}`}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: 'var(--cat-bg, ' + theme.bg + ')',
                      border: '1px solid var(--cat-border, ' + theme.border + ')',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      '--cat-bg': theme.bg,
                      '--cat-border': theme.border,
                      '--cat-text': theme.text,
                      '--cat-bar': theme.bar,
                      '--cat-dot': theme.dot,
                      '--cat-dark-bg': theme.darkBg,
                      '--cat-dark-border': theme.darkBorder,
                      '--cat-dark-text': theme.darkText,
                      '--cat-dark-dot': theme.darkDot,
                    } as React.CSSProperties}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="category-card-dot" style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: theme.dot }} />
                        <span className="category-card-name" style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>
                          {cat.name}
                        </span>
                      </div>
                      <span className="category-card-pct" style={{ fontSize: 12, fontWeight: 800, color: theme.text }}>
                        {cat.percentage}%
                      </span>
                    </div>
                    <div className="category-card-track" style={{ width: '100%', height: 6, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                      <div
                        style={{
                          width: `${Math.min(cat.percentage, 100)}%`,
                          height: '100%',
                          backgroundColor: theme.bar,
                          borderRadius: 3,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                    <div className="category-card-amount" style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                      {formatCurrency(cat.total)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    )
  )}

      {/* Modal: Editar Movimentação Financeira */}
      <Modal
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        title="Editar Movimentação"
        subtitle="Altere a descrição, valor, data, horário e detalhes desta movimentação."
        icon={<Pencil size={20} />}
        maxWidth="480px"
      >
        {editingTx && (
          <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {editError && (
              <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: 13 }}>
                {editError}
              </div>
            )}

            {/* Type indicator badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--bg-item, #f8fafc)', borderRadius: 10, border: '1px solid var(--border-color, #f1f5f9)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Tipo de registro:</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 6,
                  backgroundColor: editingTx.type === 'revenue' || editingTx.type === 'savings_deposit'
                    ? '#dcfce7'
                    : editingTx.type === 'credit_card_payment' || editingTx.originalId?.startsWith('card-invoice-')
                    ? '#dbeafe'
                    : '#fee2e2',
                  color: editingTx.type === 'revenue' || editingTx.type === 'savings_deposit'
                    ? '#15803d'
                    : editingTx.type === 'credit_card_payment' || editingTx.originalId?.startsWith('card-invoice-')
                    ? '#1d4ed8'
                    : '#b91c1c',
                }}
              >
                {editingTx.type === 'revenue'
                  ? 'Minha renda (Entrada)'
                  : editingTx.type === 'variable_expense'
                  ? 'Gasto Variável'
                  : editingTx.type === 'credit_card_payment' || editingTx.originalId?.startsWith('card-invoice-')
                  ? 'Fatura de Cartão de Crédito'
                  : editingTx.type === 'fixed_expense'
                  ? 'Conta a Pagar'
                  : editingTx.type === 'savings_deposit'
                  ? 'Cofrinho (Depósito)'
                  : 'Cofrinho (Resgate)'}
              </span>
            </div>

            {/* Descrição */}
            <div>
              <label className="form-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Descrição *
              </label>
              <input
                type="text"
                required
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="input-field"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            {/* Valor */}
            <div>
              <label className="form-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Valor (R$) *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b', fontSize: 13 }}>
                  R$
                </span>
                <input
                  type="text"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="0,00"
                  style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
            </div>

            {/* Data e Horário em duas colunas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Data *
                </label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Horário *
                </label>
                <input
                  type="time"
                  required
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: -8 }}>
              <Clock size={13} color="#64748b" />
              <span style={{ fontSize: 11, color: '#64748b' }}>
                O horário define a ordem exata entre as movimentações do mesmo dia.
              </span>
            </div>

            {/* Categoria / Detalhes específicos */}
            {editingTx.type === 'variable_expense' && (
              <>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Categoria
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff' }}
                  >
                    {VARIABLE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Chave Pix (opcional)
                  </label>
                  <input
                    type="text"
                    value={editPixKey}
                    onChange={(e) => setEditPixKey(e.target.value)}
                    placeholder="E-mail, CPF, telefone ou aleatória"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>
              </>
            )}

            {editingTx.type === 'revenue' && (
              <div>
                <label className="form-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Categoria
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff' }}
                >
                  {REVENUE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(editingTx.type === 'savings_deposit' || editingTx.type === 'savings_withdraw') && (
              <>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Tipo de Operação
                  </label>
                  <select
                    value={editSavingType}
                    onChange={(e) => setEditSavingType(e.target.value as 'deposit' | 'withdraw')}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff' }}
                  >
                    <option value="deposit">Depósito (Guardar)</option>
                    <option value="withdraw">Resgate (Retirar)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Cofrinho
                  </label>
                  <select
                    value={editPiggyBankId}
                    onChange={(e) => setEditPiggyBankId(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff' }}
                  >
                    <option value="">Sem cofrinho específico (Poupança Geral)</option>
                    {(data?.piggyBanks || []).map((pb: any) => (
                      <option key={pb.id} value={pb.id}>
                        {pb.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {(editingTx.type === 'fixed_expense' || editingTx.type === 'credit_card_payment') && (
              <div>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {editingTx.type === 'credit_card_payment' || editingTx.originalId?.startsWith('card-invoice-')
                    ? `A alteração deste valor ajusta o total da fatura e a data/horário do pagamento para ${selectedMonth.label} de ${selectedMonth.year}.`
                    : `A alteração deste valor se aplica como ajuste efetivo para ${selectedMonth.label} de ${selectedMonth.year}.`}
                </span>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#fff',
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
                disabled={editLoading}
                className="btn-primary"
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {editLoading && <Loader2 size={16} className="animate-spin" />}
                Salvar alterações
              </button>
            </div>
          </form>
        )}
      </Modal>

      <style>{`
        @media (max-width: 1024px) {
          .dashboard-two-col {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
