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
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { NavTab } from '../components/Sidebar';
import { MonthSelector } from '../components/MonthSelector';
import { MonthItem, getInitialMonthItem, FULL_MONTH_NAMES, MONTH_LABELS } from '../utils/dateUtils';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  onOpenQuickLaunch: () => void;
}

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

  // Extrato de transações efetuadas:
  // Se for despesa fixa, deve constar SOMENTE se estiver paga (isPaid === true)
  const rawTransactions: any[] = (data?.transactions || []).filter((t: any) => {
    if (t.type === 'fixed_expense') return t.isPaid === true;
    return true;
  });

  const filteredTransactions = rawTransactions.filter((t) => {
    if (transactionFilter === 'revenues') return t.type === 'revenue';
    if (transactionFilter === 'expenses') return t.type === 'variable_expense' || t.type === 'fixed_expense';
    return true;
  });

  const totalEntradas = rawTransactions
    .filter((t) => t.type === 'revenue')
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  const totalSaidas = rawTransactions
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

        {/* Card 2: Receitas */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 140 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Receitas</span>
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
                Histórico de transações
              </h3>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>
                Extrato de transações efetuadas em {FULL_MONTH_NAMES[selectedMonth.month - 1]} de {selectedMonth.year}
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
                const isFixed = tx.type === 'fixed_expense';

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
                          backgroundColor: isRevenue
                            ? '#ecfdf5'
                            : isFixed
                            ? '#ffedd5'
                            : '#f3e8ff',
                          color: isRevenue
                            ? '#15803d'
                            : isFixed
                            ? '#ea580c'
                            : '#7c3aed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isRevenue ? (
                          <ArrowDownLeft size={18} />
                        ) : isFixed ? (
                          <CreditCard size={18} />
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
                              backgroundColor: isRevenue
                                ? '#dcfce7'
                                : isFixed
                                ? '#ffedd5'
                                : '#f3e8ff',
                              color: isRevenue
                                ? '#15803d'
                                : isFixed
                                ? '#ea580c'
                                : '#7c3aed',
                            }}
                          >
                            {isRevenue ? 'Receita' : isFixed ? 'Fixa' : 'Variável'}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      {isFixed && (
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
                          color: isRevenue ? '#16a34a' : 'var(--text-main, #0f172a)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isRevenue ? `+ ${formatCurrency(tx.amount)}` : `- ${formatCurrency(tx.amount)}`}
                      </span>
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

          {/* Receitas Anuais */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 140 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>Receitas do ano</span>
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
                Comparativo de receitas e despesas por mês
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', margin: '2px 0 0' }}>
                Evolução financeira ao longo dos 12 meses de {selectedAnnualYear} (clique em um mês para abrir)
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#16a34a' }} />
                <span style={{ color: 'var(--text-secondary, #64748b)' }}>Receitas</span>
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
                Todos os meses do ano com demonstrativo de receitas, despesas e saldo
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
                    RECEITAS
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
                      style={{
                        borderBottom: '1px solid var(--border-color, #f8fafc)',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-item-hover, #fafbfc)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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
                        {m.fixedCount} fixas • {m.varCount} variáveis • {m.revCount} receitas
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
        {annualData?.categories && annualData.categories.length > 0 && (
          <div className="card" style={{ padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: 'var(--text-main, #0f172a)' }}>
              Gastos por categoria em {selectedAnnualYear}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {annualData.categories.map((cat: any) => (
                <div
                  key={cat.name}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    backgroundColor: 'var(--bg-item, #f8fafc)',
                    border: '1px solid var(--border-color, #f1f5f9)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                      {cat.name}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #64748b)' }}>
                      {cat.percentage}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, backgroundColor: 'var(--border-input, #e2e8f0)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                    <div
                      style={{
                        width: `${Math.min(cat.percentage, 100)}%`,
                        height: '100%',
                        backgroundColor: '#ea580c',
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                    {formatCurrency(cat.total)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  )}

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
