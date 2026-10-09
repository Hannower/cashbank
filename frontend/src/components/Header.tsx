import React from 'react';
import { Settings, Moon, Sun, Menu } from 'lucide-react';
import { NavTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavTab;
  onOpenMobileSidebar: () => void;
  onOpenSettings: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const TAB_TITLES: Record<NavTab, { title: string; breadcrumb: string }> = {
  dashboard: { title: 'Visão geral', breadcrumb: 'CashBank / Visão geral' },
  'fixed-expenses': { title: 'Despesas fixas', breadcrumb: 'CashBank / Despesas fixas' },
  'variable-expenses': { title: 'Despesas variáveis', breadcrumb: 'CashBank / Despesas variáveis' },
  revenues: { title: 'Receitas', breadcrumb: 'CashBank / Receitas' },
  savings: { title: 'Poupança', breadcrumb: 'CashBank / Poupança' },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileSidebar,
  onOpenSettings,
  isDark,
  onToggleTheme,
}) => {
  const current = TAB_TITLES[currentTab];

  return (
    <header
      className="app-header"
      style={{
        height: 70,
        backgroundColor: 'var(--bg-sidebar, #ffffff)',
        borderBottom: '1px solid var(--border-color, #f1f5f9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 36px',
        position: 'fixed',
        top: 0,
        right: 0,
        left: 250,
        zIndex: 30,
        boxSizing: 'border-box',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={onOpenMobileSidebar}
          style={{
            display: 'none',
            color: 'var(--text-secondary, #475569)',
            padding: 6,
            borderRadius: 6,
          }}
          className="header-mobile-toggle"
        >
          <Menu size={22} />
        </button>

        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
            {current.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>
            {current.breadcrumb}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Dark Mode Toggle Button */}
        <button
          onClick={onToggleTheme}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            border: '1px solid var(--border-input, #e2e8f0)',
            backgroundColor: 'var(--bg-card, #ffffff)',
            color: isDark ? '#f59e0b' : 'var(--text-secondary, #64748b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          aria-label={isDark ? 'Tema Claro' : 'Tema Escuro'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            border: '1px solid var(--border-input, #e2e8f0)',
            backgroundColor: 'var(--bg-card, #ffffff)',
            color: 'var(--text-secondary, #64748b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="Configurações da conta"
          aria-label="Configurações da conta"
        >
          <Settings size={18} />
        </button>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .app-header {
            left: 0 !important;
            padding: 0 16px !important;
          }
          .header-mobile-toggle {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
};
