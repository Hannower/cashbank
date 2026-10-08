import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  PiggyBank,
  CheckCircle2,
  Loader2,
  CreditCard,
  ShoppingBag,
  ListFilter,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { NavTab } from '../components/Sidebar';
import { MonthSelector } from '../components/MonthSelector';
import { MonthItem, getInitialMonthItem, FULL_MONTH_NAMES } from '../utils/dateUtils';

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

  useEffect(() => {
    fetchDashboardData(selectedMonth.month, selectedMonth.year);
  }, [selectedMonth.month, selectedMonth.year]);

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
