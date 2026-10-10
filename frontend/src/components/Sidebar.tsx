import React from 'react';
import {
  LayoutGrid,
  CalendarCheck2,
  ShoppingBag,
  CreditCard,
  ArrowDownLeft,
  PiggyBank,
  Wallet,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavTab =
  | 'dashboard'
  | 'fixed-expenses'
  | 'variable-expenses'
  | 'credit-cards'
  | 'revenues'
  | 'savings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
  fixedPendingCount?: number;
  fixedOrganizedPct?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  fixedPendingCount = 0,
  fixedOrganizedPct = 0,
}) => {
  const { user, logout } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return 'CB';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Visão geral',
      icon: <LayoutGrid size={18} />,
    },
    {
      id: 'fixed-expenses' as NavTab,
      label: 'Despesas fixas',
      icon: <CalendarCheck2 size={18} />,
      badge: fixedPendingCount > 0 ? fixedPendingCount : undefined,
    },
    {
      id: 'variable-expenses' as NavTab,
      label: 'Despesas variáveis',
      icon: <ShoppingBag size={18} />,
    },
    {
      id: 'credit-cards' as NavTab,
      label: 'Cartões de crédito',
      icon: <CreditCard size={18} />,
    },
    {
      id: 'revenues' as NavTab,
      label: 'Receitas',
      icon: <ArrowDownLeft size={18} />,
    },
    {
      id: 'savings' as NavTab,
      label: 'Poupança',
      icon: <PiggyBank size={18} />,
    },
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
                      backgroundColor: '#ffedd5',
                      color: '#c2410c',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: 12,
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

        {/* Bottom Monthly Status Widget */}
        <div style={{ padding: '0 16px 16px' }}>
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #dcfce7',
              borderRadius: 14,
              padding: '14px',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: '#dcfce7',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              <Wallet size={16} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 2 }}>
              Seu mês em ordem
            </div>
            <div style={{ fontSize: 12, color: '#15803d', lineHeight: 1.4 }}>
              {fixedOrganizedPct > 0
                ? `Você já organizou ${fixedOrganizedPct}% das despesas fixas.`
                : 'Cadastre despesas fixas para organizar seu mês.'}
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
