import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginView } from './views/LoginView';
import { ResetPasswordView } from './views/ResetPasswordView';
import { DashboardView } from './views/DashboardView';
import { FixedExpensesView } from './views/FixedExpensesView';
import { VariableExpensesView } from './views/VariableExpensesView';
import { CreditCardsView } from './views/CreditCardsView';
import { ReceivablesView } from './views/ReceivablesView';
import { RevenuesView } from './views/RevenuesView';
import { SavingsView } from './views/SavingsView';
import { AdminView } from './views/AdminView';
import { BankAccountsView } from './views/BankAccountsView';
import { Modal } from './components/Modal';
import { SettingsModal } from './components/SettingsModal';
import { AiAssistantWidget } from './components/AiAssistantWidget';
import { api } from './services/api';
import {
  CalendarCheck2,
  ShoppingBag,
  CreditCard,
  ArrowDownLeft,
  PiggyBank,
  HandCoins,
  PlusCircle,
  Loader2,
} from 'lucide-react';

export const App: React.FC = () => {
  const { user, token, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [quickLaunchOpen, setQuickLaunchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  const handleDataChanged = () => {
    refreshSidebarBadges();
    setDataVersion((v) => v + 1);
  };

  // Security guard for admin tab
  useEffect(() => {
    if ((currentTab === 'admin' || currentTab === 'bank-accounts') && user?.role !== 'admin') {
      setCurrentTab('dashboard');
    }
  }, [currentTab, user]);

  // Check if URL contains a password reset token
  const [activeResetToken, setActiveResetToken] = useState<string | null>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const qToken = searchParams.get('resetToken') || searchParams.get('token');
      if (qToken) return qToken;

      if (window.location.hash) {
        const hashPart = window.location.hash.includes('?')
          ? window.location.hash.split('?')[1]
          : window.location.hash.replace(/^#\/?/, '');
        const hashParams = new URLSearchParams(hashPart);
        const hToken = hashParams.get('resetToken') || hashParams.get('token');
        if (hToken) return hToken;
      }
    } catch (_) {}
    return null;
  });

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
  const [pendingReceivablesCount, setPendingReceivablesCount] = useState(0);

  const refreshSidebarBadges = async () => {
    if (!token) return;
    try {
      const now = new Date();
      const [res, recRes] = await Promise.all([
        api.getFixedExpenses(now.getMonth() + 1, now.getFullYear()).catch(() => null),
        api.getReceivables({ status: 'pending' }).catch(() => null),
      ]);

      if (res) {
        const pending = res.summary?.pendingAmount > 0
          ? res.expenses.filter((e: any) => !e.isPaid).length
          : 0;
        setPendingFixedCount(pending);
        const total = res.summary?.totalCount || 0;
        const paid = res.summary?.paidCount || 0;
        setOrganizedPct(total > 0 ? Math.round((paid / total) * 100) : 0);
      }

      if (recRes && recRes.summary) {
        setPendingReceivablesCount(recRes.summary.pendingCount || 0);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (token) {
      refreshSidebarBadges();
    }
  }, [token, currentTab]);

  // Dedicated Password Reset Page when user arrives from email link
  if (activeResetToken) {
    return (
      <ResetPasswordView
        token={activeResetToken}
        onFinished={() => {
          try {
            window.history.replaceState({}, document.title, window.location.pathname.replace(/\/reset-password\/?$/, '/') || '/');
          } catch (_) {}
          setActiveResetToken(null);
        }}
      />
    );
  }

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
        receivablesPendingCount={pendingReceivablesCount}
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
            <FixedExpensesView key={dataVersion} onDataChanged={handleDataChanged} />
          )}

          {currentTab === 'variable-expenses' && (
            <VariableExpensesView key={dataVersion} onDataChanged={handleDataChanged} />
          )}

          {currentTab === 'credit-cards' && (
            <CreditCardsView key={dataVersion} onDataChanged={handleDataChanged} />
          )}

          {currentTab === 'receivables' && (
            <ReceivablesView key={dataVersion} onDataChanged={handleDataChanged} />
          )}

          {currentTab === 'revenues' && (
            <RevenuesView key={dataVersion} onDataChanged={handleDataChanged} />
          )}

          {currentTab === 'savings' && (
            <SavingsView key={dataVersion} onDataChanged={handleDataChanged} />
          )}

          {currentTab === 'bank-accounts' && user?.role === 'admin' && (
            <BankAccountsView />
          )}

          {currentTab === 'admin' && user?.role === 'admin' && (
            <AdminView />
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
            type="button"
            onClick={() => {
              setQuickLaunchOpen(false);
              setCurrentTab('fixed-expenses');
            }}
            className="quick-action-item"
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
              <div className="quick-action-title">Conta a pagar</div>
              <div className="quick-action-desc">
                Compromissos recorrentes como aluguel e internet
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickLaunchOpen(false);
              setCurrentTab('variable-expenses');
            }}
            className="quick-action-item"
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
              <ShoppingBag size={20} />
            </div>
            <div>
              <div className="quick-action-title">Gasto variável</div>
              <div className="quick-action-desc">
                Gastos pontuais como lanches, mercado e transporte
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickLaunchOpen(false);
              setCurrentTab('credit-cards');
            }}
            className="quick-action-item"
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CreditCard size={20} />
            </div>
            <div>
              <div className="quick-action-title">Compra no cartão de crédito</div>
              <div className="quick-action-desc">
                Lançamento parcelado ou à vista faturado no cartão
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickLaunchOpen(false);
              setCurrentTab('receivables');
            }}
            className="quick-action-item"
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: '#e0e7ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <HandCoins size={20} />
            </div>
            <div>
              <div className="quick-action-title">Conta a receber</div>
              <div className="quick-action-desc">
                Cobranças, empréstimos ou compras de terceiros no cartão
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickLaunchOpen(false);
              setCurrentTab('revenues');
            }}
            className="quick-action-item"
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
              <div className="quick-action-title">Minha renda</div>
              <div className="quick-action-desc">
                Entradas financeiras como salários, freelas e vendas
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickLaunchOpen(false);
              setCurrentTab('savings');
            }}
            className="quick-action-item"
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
              <div className="quick-action-title">Cofrinhos / Poupança</div>
              <div className="quick-action-desc">
                Guardar valor em cofrinhos por objetivos e metas
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

      {/* Floating AI Assistant Widget (RAG + MCP) */}
      <AiAssistantWidget onDataChanged={handleDataChanged} />
    </div>
  );
};
