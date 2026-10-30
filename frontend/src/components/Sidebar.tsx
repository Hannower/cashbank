import React from 'react';
import {
  LayoutGrid,
  CalendarCheck2,
  ShoppingBag,
  CreditCard,
  ArrowDownLeft,
  PiggyBank,
  Wallet,
  HandCoins,
  LogOut,
  X,
  ShieldCheck,
  Landmark,
  Download,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePwaInstall } from '../hooks/usePwaInstall';

export type NavTab =
  | 'dashboard'
  | 'fixed-expenses'
  | 'variable-expenses'
  | 'credit-cards'
  | 'receivables'
  | 'revenues'
  | 'savings'
  | 'bank-accounts'
  | 'admin';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
  fixedPendingCount?: number;
  fixedOrganizedPct?: number;
  receivablesPendingCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  fixedPendingCount = 0,
  fixedOrganizedPct = 0,
  receivablesPendingCount = 0,
}) => {
  const { user, logout } = useAuth();
  const { canInstall, installApp } = usePwaInstall();

  const getInitials = (name?: string) => {
    if (!name) return 'CB';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
  }> = [
    {
      id: 'dashboard',
      label: 'Visão geral',
      icon: <LayoutGrid size={18} />,
    },
    {
      id: 'fixed-expenses',
      label: 'Contas a pagar',
      icon: <CalendarCheck2 size={18} />,
      badge: fixedPendingCount > 0 ? fixedPendingCount : undefined,
    },
    {
      id: 'variable-expenses',
      label: 'Gastos do dia a dia',
      icon: <ShoppingBag size={18} />,
    },
    {
      id: 'credit-cards',
      label: 'Cartões de crédito',
      icon: <CreditCard size={18} />,
    },
    {
      id: 'receivables',
      label: 'Contas a receber',
      icon: <HandCoins size={18} />,
      badge: receivablesPendingCount > 0 ? receivablesPendingCount : undefined,
    },
    {
      id: 'revenues',
      label: 'Minha renda',
      icon: <ArrowDownLeft size={18} />,
    },
    {
      id: 'savings',
      label: 'Poupança',
      icon: <PiggyBank size={18} />,
    },
    ...(user?.role === 'admin'
      ? [
          {
            id: 'bank-accounts' as NavTab,
            label: 'Contas bancárias',
            icon: <Landmark size={18} />,
          },
          {
            id: 'admin' as NavTab,
            label: 'Painel Admin',
            icon: <ShieldCheck size={18} />,
            badge: 'ADMIN',
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            zIndex: 35,
          }}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div
          style={{
            padding: '24px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 5px rgba(21, 128, 61, 0.3)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="14" width="3.5" height="6" rx="1.5" fill="white" />
                <rect x="10.25" y="9" width="3.5" height="11" rx="1.5" fill="white" />
                <rect x="16.5" y="4" width="3.5" height="16" rx="1.5" fill="white" />
              </svg>
            </div>
            <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-main, #0f172a)', letterSpacing: '-0.3px' }}>
              CashBank
            </span>
          </div>

          <button
            onClick={onClose}
            className="mobile-close-btn"
            style={{
              display: isOpen ? 'block' : 'none',
              color: '#64748b',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Section title */}
        <div style={{ padding: '8px 24px 8px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.6px' }}>
          PRINCIPAL
        </div>

        {/* Nav Links */}
        <nav style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#15803d' : 'var(--text-secondary, #475569)',
                  backgroundColor: isActive ? 'var(--primary-light, #ecfdf5)' : 'transparent',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'var(--border-color, #f8fafc)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: isActive ? '#15803d' : '#64748b', display: 'flex', alignItems: 'center' }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    style={{
                      backgroundColor:
                        typeof item.badge === 'string'
                          ? 'rgba(124, 58, 237, 0.15)'
                          : '#ffedd5',
                      color: typeof item.badge === 'string' ? '#7c3aed' : '#c2410c',
                      fontSize: typeof item.badge === 'string' ? 10 : 11,
                      fontWeight: 800,
                      padding: typeof item.badge === 'string' ? '2px 7px' : '1px 7px',
                      borderRadius: 12,
                      letterSpacing: typeof item.badge === 'string' ? '0.5px' : 'normal',
                      border:
                        typeof item.badge === 'string'
                          ? '1px solid rgba(124, 58, 237, 0.3)'
                          : 'none',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {canInstall && (
          <div style={{ padding: '0 16px 12px' }}>
            <button
              onClick={async () => {
                await installApp();
                onClose();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 14px',
                backgroundColor: '#15803d',
                color: '#ffffff',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              <Download size={16} />
              <span>Instalar Aplicativo</span>
            </button>
          </div>
        )}

        {/* Bottom Monthly Status Widget */}
        <div style={{ padding: '0 16px 16px' }}>
          <div className="sidebar-status-widget">
            <div className="status-widget-icon">
              <Wallet size={16} />
            </div>
            <div className="status-widget-title">
              Seu mês em ordem
            </div>
            <div className="status-widget-desc">
              {fixedOrganizedPct > 0
                ? `Você já organizou ${fixedOrganizedPct}% das contas a pagar.`
                : 'Cadastre contas a pagar para organizar seu mês.'}
            </div>
          </div>
        </div>

        {/* User profile footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border-color, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'var(--primary-badge, #dcfce7)',
                color: 'var(--primary, #166534)',
                fontWeight: 700,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {getInitials(user?.name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text-main, #0f172a)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.name || 'Minha Conta'}
                </div>
                {user?.role === 'admin' && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      backgroundColor: '#7c3aed',
                      color: '#ffffff',
                      padding: '1px 5px',
                      borderRadius: 4,
                      letterSpacing: '0.5px',
                    }}
                  >
                    ADMIN
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: '#94a3b8',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.email || ''}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sair da conta"
            style={{
              color: '#94a3b8',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
};
