import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { FixedExpensesView } from './views/FixedExpensesView';
import { VariableExpensesView } from './views/VariableExpensesView';
import { RevenuesView } from './views/RevenuesView';
import { SavingsView } from './views/SavingsView';
import { Modal } from './components/Modal';
import { SettingsModal } from './components/SettingsModal';
import { api } from './services/api';
import {
  CalendarCheck2,
  CreditCard,
  ArrowDownLeft,
  PiggyBank,
  PlusCircle,
  Loader2,
} from 'lucide-react';

export const App: React.FC = () => {
  const { user, token, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [quickLaunchOpen, setQuickLaunchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('cashbank_theme') === 'dark';
  });

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('cashbank_theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('cashbank_theme', 'light');
    }
  }, [isDark]);

  // Global badges / indicators
  const [pendingFixedCount, setPendingFixedCount] = useState(0);
  const [organizedPct, setOrganizedPct] = useState(0);

  const refreshSidebarBadges = async () => {
    if (!token) return;
    try {
      const now = new Date();
      const res = await api.getFixedExpenses(now.getMonth() + 1, now.getFullYear());
      const pending = res.summary?.pendingAmount > 0
        ? res.expenses.filter((e: any) => !e.isPaid).length
        : 0;
      setPendingFixedCount(pending);
      const total = res.summary?.totalCount || 0;
      const paid = res.summary?.paidCount || 0;
      setOrganizedPct(total > 0 ? Math.round((paid / total) * 100) : 0);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (token) {
      refreshSidebarBadges();
    }
  }, [token, currentTab]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          gap: 12,
        }}
      >
        <Loader2 size={36} className="animate-spin" color="#15803d" />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>Carregando CashBank...</span>
      </div>
    );
  }

  if (!token) {
    return <LoginView />;
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        fixedPendingCount={pendingFixedCount}
        fixedOrganizedPct={organizedPct}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Header
          currentTab={currentTab}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />

        <main style={{ flex: 1, paddingTop: 70, paddingBottom: 40, width: '100%', boxSizing: 'border-box', minWidth: 0 }}>
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigate={(tab) => setCurrentTab(tab)}
              onOpenQuickLaunch={() => setQuickLaunchOpen(true)}
            />
          )}

          {currentTab === 'fixed-expenses' && (
            <FixedExpensesView onDataChanged={refreshSidebarBadges} />
          )}

          {currentTab === 'variable-expenses' && (
            <VariableExpensesView onDataChanged={refreshSidebarBadges} />
          )}

          {currentTab === 'revenues' && (
            <RevenuesView onDataChanged={refreshSidebarBadges} />
          )}

          {currentTab === 'savings' && (
            <SavingsView onDataChanged={refreshSidebarBadges} />
          )}
        </main>
      </div>

      {/* Quick Launch Modal */}
      <Modal
        isOpen={quickLaunchOpen}
        onClose={() => setQuickLaunchOpen(false)}
        title="Novo lançamento"
        subtitle="Escolha o tipo de transação que deseja registrar."
        icon={<PlusCircle size={22} />}
        maxWidth="460px"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginTop: 8 }}>
          <button
            onClick={() => {
              setQuickLaunchOpen(false);
              setCurrentTab('fixed-expenses');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 16px',
              borderRadius: 12,
              border: '1px solid #f1f5f9',
              backgroundColor: '#ffffff',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: '#ffedd5',
                color: '#ea580c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CalendarCheck2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Despesa fixa</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Compromissos recorrentes como aluguel e internet
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              setQuickLaunchOpen(false);
              setCurrentTab('variable-expenses');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 16px',
              borderRadius: 12,
              border: '1px solid #f1f5f9',
              backgroundColor: '#ffffff',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: '#fed7aa',
                color: '#c2410c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CreditCard size={20} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Despesa variável</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Gastos pontuais como lanches, mercado e transporte
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              setQuickLaunchOpen(false);
              setCurrentTab('revenues');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 16px',
              borderRadius: 12,
              border: '1px solid #f1f5f9',
              backgroundColor: '#ffffff',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: '#dcfce7',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ArrowDownLeft size={20} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Receita</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Entradas financeiras como salários e freelas
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              setQuickLaunchOpen(false);
              setCurrentTab('savings');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 16px',
              borderRadius: 12,
              border: '1px solid #f1f5f9',
              backgroundColor: '#ffffff',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: '#ede9fe',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <PiggyBank size={20} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Poupança / Reserva</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Guardar valor para objetivos e reserva de emergência
              </div>
            </div>
          </button>
        </div>
      </Modal>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />
    </div>
  );
};
