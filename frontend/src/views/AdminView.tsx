import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Activity,
  AlertTriangle,
  KeyRound,
  Lock,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Calendar,
  TrendingUp,
  BarChart3,
  Database,
  Server,
  Clock,
  UserCheck,
  UserX,
  UserMinus,
  Shield,
  Eye,
  FileText,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  PiggyBank,
  CreditCard,
  CalendarCheck2,
  HandCoins,
  ArrowDownLeft,
  ShoppingBag,
  ExternalLink,
  Copy,
  AlertCircle,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';

type AdminTab = 'analytics' | 'users' | 'audit' | 'health';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended' | 'pending';
  lastLogin: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // -----------------------------------------------------------
  // 1. ANALYTICS DATA STATE
  // -----------------------------------------------------------
  const [analytics, setAnalytics] = useState<any>(null);

  // -----------------------------------------------------------
  // 2. USERS DATA STATE & FILTERS
  // -----------------------------------------------------------
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [searchUser, setSearchUser] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Modals for user actions
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'active' | 'suspended' | 'pending'>('active');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<'user' | 'admin'>('user');
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string; url?: string } | null>(null);

  // -----------------------------------------------------------
  // 3. AUDIT & SECURITY LOGS STATE
  // -----------------------------------------------------------
  const [auditSubTab, setAuditSubTab] = useState<'audit' | 'security'>('audit');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditSearch, setAuditSearch] = useState('');

  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [securityTotal, setSecurityTotal] = useState(0);
  const [securityPage, setSecurityPage] = useState(1);
  const [securityTotalPages, setSecurityTotalPages] = useState(1);
  const [securitySummary, setSecuritySummary] = useState<any>(null);

  // -----------------------------------------------------------
  // 4. SYSTEM HEALTH & ERROR LOGS STATE
  // -----------------------------------------------------------
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [errorTotal, setErrorTotal] = useState(0);
  const [errorPage, setErrorPage] = useState(1);
  const [errorTotalPages, setErrorTotalPages] = useState(1);
  const [selectedError, setSelectedError] = useState<any | null>(null);
  const [clearErrorModalOpen, setClearErrorModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Format currencies
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Nunca';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // -----------------------------------------------------------
  // FETCHERS
  // -----------------------------------------------------------
  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await api.getAdminAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching admin analytics:', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.getAdminUsers({
        search: searchUser,
        status: statusFilter,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        page: usersPage,
        limit: 12,
      });
      setUsers(res.users || []);
      setUsersTotal(res.pagination?.total || 0);
      setUsersTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Error fetching admin users:', err);
    }
  }, [searchUser, statusFilter, startDateFilter, endDateFilter, usersPage]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await api.getAdminAuditLogs({
        page: auditPage,
        limit: 15,
        search: auditSearch || undefined,
      });
      setAuditLogs(res.logs || []);
      setAuditTotal(res.pagination?.total || 0);
      setAuditTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  }, [auditPage, auditSearch]);

  const fetchSecurityLogs = useCallback(async () => {
    try {
      const res = await api.getAdminSecurityLogs({
        page: securityPage,
        limit: 15,
      });
      setSecurityLogs(res.logs || []);
      setSecurityTotal(res.pagination?.total || 0);
      setSecurityTotalPages(res.pagination?.totalPages || 1);
      setSecuritySummary(res.summary || null);
    } catch (err) {
      console.error('Error fetching security logs:', err);
    }
  }, [securityPage]);

  const fetchErrorLogs = useCallback(async () => {
    try {
      const res = await api.getAdminErrorLogs({
        page: errorPage,
        limit: 15,
      });
      setErrorLogs(res.logs || []);
      setErrorTotal(res.pagination?.total || 0);
      setErrorTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Error fetching error logs:', err);
    }
  }, [errorPage]);

  // Load data according to active tab
  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchAnalytics(),
      fetchUsers(),
      fetchAuditLogs(),
      fetchSecurityLogs(),
      fetchErrorLogs(),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, fetchUsers]);

  useEffect(() => {
    if (activeTab === 'audit') {
      if (auditSubTab === 'audit') fetchAuditLogs();
      if (auditSubTab === 'security') fetchSecurityLogs();
    }
  }, [activeTab, auditSubTab, fetchAuditLogs, fetchSecurityLogs]);

  useEffect(() => {
    if (activeTab === 'health') fetchErrorLogs();
  }, [activeTab, fetchErrorLogs]);

  // -----------------------------------------------------------
  // USER ACTIONS HANDLERS
  // -----------------------------------------------------------
  const handleOpenStatusModal = (user: UserItem) => {
    setSelectedUser(user);
    setTargetStatus(user.status);
    setActionFeedback(null);
    setStatusModalOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      await api.updateAdminUserStatus(selectedUser.id, targetStatus);
      setStatusModalOpen(false);
      setActionFeedback({
        type: 'success',
        message: `Status de ${selectedUser.name} alterado para "${targetStatus}" com sucesso.`,
      });
      await fetchUsers();
      await fetchAnalytics();
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Erro ao alterar status.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRoleModal = (user: UserItem) => {
    setSelectedUser(user);
    setTargetRole(user.role === 'admin' ? 'user' : 'admin');
    setActionFeedback(null);
    setRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      await api.updateAdminUserRole(selectedUser.id, targetRole);
      setRoleModalOpen(false);
      setActionFeedback({
        type: 'success',
        message: `Nível de acesso de ${selectedUser.name} alterado para "${targetRole}".`,
      });
      await fetchUsers();
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Erro ao alterar nível.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenResetModal = (user: UserItem) => {
    setSelectedUser(user);
    setActionFeedback(null);
    setResetModalOpen(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      const res = await api.adminResetPassword(selectedUser.id);
      setResetModalOpen(false);
      setActionFeedback({
        type: 'success',
        message: res.message || `Instruções de redefinição enviadas para ${selectedUser.email}.`,
        url: res.resetUrl,
      });
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Erro ao solicitar redefinição.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDeleteModal = (user: UserItem) => {
    setSelectedUser(user);
    setActionFeedback(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      await api.deleteAdminUser(selectedUser.id);
      setDeleteModalOpen(false);
      setActionFeedback({
        type: 'success',
        message: `Conta de ${selectedUser.email} e todos os seus dados foram excluídos definitivamente (LGPD).`,
      });
      await fetchUsers();
      await fetchAnalytics();
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Erro ao excluir usuário.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearErrors = async () => {
    try {
      setActionLoading(true);
      await api.clearAdminErrorLogs();
      setClearErrorModalOpen(false);
      await fetchErrorLogs();
    } catch (err) {
      console.error('Error clearing logs:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="content-container animate-fade-in" style={{ maxWidth: 1400 }}>
      {/* Top Admin Header */}
      <div className="view-header-row" style={{ alignItems: 'flex-start' }}>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: '#7c3aed',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ShieldCheck size={14} /> PAINEL ADMINISTRATIVO & RBAC
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: 'var(--text-main, #0f172a)',
              letterSpacing: '-0.5px',
              margin: 0,
            }}
          >
            Administração do Sistema
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary, #64748b)', marginTop: 4, margin: 0 }}>
            Gestão segura de usuários, privacidade por design (LGPD), trilha de auditoria e monitoramento do CashBank.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Status Pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              backgroundColor: 'rgba(21, 128, 61, 0.1)',
              color: '#15803d',
              border: '1px solid rgba(21, 128, 61, 0.25)',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e' }} />
            API Online
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              color: '#4f46e5',
              border: '1px solid rgba(99, 102, 241, 0.25)',
            }}
          >
            <Database size={13} />
            Supabase DB
          </div>

          <button
            type="button"
            onClick={refreshAll}
            disabled={refreshing}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Atualizando...' : 'Recarregar'}
          </button>
        </div>
      </div>

      {/* Global Feedback Alert */}
      {actionFeedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            backgroundColor: actionFeedback.type === 'success' ? 'rgba(21, 128, 61, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: actionFeedback.type === 'success' ? 'var(--primary-badge-text, #15803d)' : '#ef4444',
            border: `1px solid ${actionFeedback.type === 'success' ? 'rgba(21, 128, 61, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {actionFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{actionFeedback.message}</span>
          </div>
          {actionFeedback.url && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(actionFeedback.url || '');
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'var(--bg-card, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: 12,
                cursor: 'pointer',
                color: 'var(--text-main, #0f172a)',
              }}
            >
              {copiedLink ? <Check size={14} color="#15803d" /> : <Copy size={14} />}
              {copiedLink ? 'Copiado!' : 'Copiar link'}
            </button>
          )}
        </div>
      )}

      {/* Admin Sub-Tabs Bar */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: '1px solid var(--border-color, #f1f5f9)',
          marginBottom: 24,
          overflowX: 'auto',
          paddingBottom: 2,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            fontSize: 13,
            fontWeight: 700,
            borderRadius: '10px 10px 0 0',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'analytics' ? 'var(--bg-card, #ffffff)' : 'transparent',
            color: activeTab === 'analytics' ? '#7c3aed' : 'var(--text-secondary, #64748b)',
            borderBottom: activeTab === 'analytics' ? '3px solid #7c3aed' : '3px solid transparent',
            transition: 'all 0.15s ease',
          }}
        >
          <BarChart3 size={17} />
          Métricas & Analytics
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            fontSize: 13,
            fontWeight: 700,
            borderRadius: '10px 10px 0 0',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'users' ? 'var(--bg-card, #ffffff)' : 'transparent',
            color: activeTab === 'users' ? '#7c3aed' : 'var(--text-secondary, #64748b)',
            borderBottom: activeTab === 'users' ? '3px solid #7c3aed' : '3px solid transparent',
            transition: 'all 0.15s ease',
          }}
        >
          <Users size={17} />
          Gestão de Usuários
          {usersTotal > 0 && (
            <span
              style={{
                fontSize: 11,
                padding: '1px 7px',
                borderRadius: 10,
                backgroundColor: activeTab === 'users' ? '#ede9fe' : 'var(--border-color, #e2e8f0)',
                color: activeTab === 'users' ? '#7c3aed' : 'var(--text-secondary, #64748b)',
              }}
            >
              {usersTotal}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            fontSize: 13,
            fontWeight: 700,
            borderRadius: '10px 10px 0 0',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'audit' ? 'var(--bg-card, #ffffff)' : 'transparent',
            color: activeTab === 'audit' ? '#7c3aed' : 'var(--text-secondary, #64748b)',
            borderBottom: activeTab === 'audit' ? '3px solid #7c3aed' : '3px solid transparent',
            transition: 'all 0.15s ease',
          }}
        >
          <Shield size={17} />
          Auditoria & Segurança
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('health')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            fontSize: 13,
            fontWeight: 700,
            borderRadius: '10px 10px 0 0',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'health' ? 'var(--bg-card, #ffffff)' : 'transparent',
            color: activeTab === 'health' ? '#7c3aed' : 'var(--text-secondary, #64748b)',
            borderBottom: activeTab === 'health' ? '3px solid #7c3aed' : '3px solid transparent',
            transition: 'all 0.15s ease',
          }}
        >
          <Activity size={17} />
          Monitoramento & Erros
          {errorTotal > 0 && (
            <span
              style={{
                fontSize: 11,
                padding: '1px 7px',
                borderRadius: 10,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                fontWeight: 800,
              }}
            >
              {errorTotal}
            </span>
          )}
        </button>
      </div>

      {/* =========================================================
          TAB 1: MÉTRICAS & NEGÓCIO (ANALYTICS)
          ========================================================= */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* LGPD Banner */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 12,
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <ShieldCheck size={22} color="#3b82f6" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: 'var(--text-main, #0f172a)', lineHeight: 1.5 }}>
              <strong>Privacidade por Design (LGPD):</strong> O painel administrativo exibe exclusivamente{' '}
              <strong>métricas globais agregadas e anonimizadas</strong>. Administradores{' '}
              <strong>não possuem visibilidade nem acesso</strong> aos extratos, nomes de despesas ou transações financeiras individuais dos usuários.
            </div>
          </div>

          {/* Top 4 KPI Cards */}
          <div className="kpi-cards-grid">
            {/* Total Users */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>
                  Usuários Cadastrados
                </span>
                <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} />
                </div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-main, #0f172a)', letterSpacing: '-0.5px' }}>
                {analytics?.users?.total ?? '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#15803d', fontWeight: 700 }}>+{analytics?.users?.newThisMonth ?? 0}</span> no mês atual •{' '}
                <span style={{ color: '#15803d' }}>{analytics?.users?.active ?? 0} ativos</span>
              </div>
            </div>

            {/* DAU & MAU */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>
                  Engajamento (DAU / MAU)
                </span>
                <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(21, 128, 61, 0.1)', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={18} />
                </div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-main, #0f172a)', letterSpacing: '-0.5px' }}>
                {analytics?.users?.dau ?? 0}{' '}
                <span style={{ fontSize: 18, color: 'var(--text-muted, #94a3b8)', fontWeight: 500 }}>
                  / {analytics?.users?.mau ?? 0} MAU
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)', marginTop: 6 }}>
                DAU: acessaram hoje • MAU: ativos nos últimos 30 dias
              </div>
            </div>


            {/* Total System Transactions */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>
                  Lançamentos no Sistema
                </span>
                <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={18} />
                </div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-main, #0f172a)', letterSpacing: '-0.5px' }}>
                {analytics?.system?.totalTransactionsCount ?? '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)', marginTop: 6 }}>
                Registros consolidados de receitas, fixos e variáveis
              </div>
            </div>
          </div>

          {/* Features Adoption & 6-month growth */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Feature Usage Grid */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={18} color="#7c3aed" /> Adoção de Funcionalidades
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: 14, borderRadius: 10, backgroundColor: 'var(--bg-app, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803d', fontSize: 12, fontWeight: 700 }}>
                    <PiggyBank size={16} /> Cofrinhos
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: 'var(--text-main, #0f172a)' }}>
                    {analytics?.system?.features?.piggyBanks ?? 0}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>Cofrinhos com metas criados</div>
                </div>

                <div style={{ padding: 14, borderRadius: 10, backgroundColor: 'var(--bg-app, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7c3aed', fontSize: 12, fontWeight: 700 }}>
                    <CreditCard size={16} /> Cartões
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: 'var(--text-main, #0f172a)' }}>
                    {analytics?.system?.features?.creditCards ?? 0}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>Cartões de crédito ativos</div>
                </div>

                <div style={{ padding: 14, borderRadius: 10, backgroundColor: 'var(--bg-app, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ea580c', fontSize: 12, fontWeight: 700 }}>
                    <CalendarCheck2 size={16} /> Contas a Pagar
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: 'var(--text-main, #0f172a)' }}>
                    {analytics?.system?.features?.fixedExpenses ?? 0}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>Compromissos recorrentes</div>
                </div>

                <div style={{ padding: 14, borderRadius: 10, backgroundColor: 'var(--bg-app, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4338ca', fontSize: 12, fontWeight: 700 }}>
                    <HandCoins size={16} /> A Receber
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: 'var(--text-main, #0f172a)' }}>
                    {analytics?.system?.features?.receivables ?? 0}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>Contas a receber registradas</div>
                </div>
              </div>
            </div>

            {/* Monthly signups trend bar chart */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} color="#15803d" /> Evolução de Novos Cadastros (6 meses)
              </h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, paddingTop: 20, gap: 12 }}>
                {analytics?.users?.monthlySignups?.map((item: any, idx: number) => {
                  const maxCount = Math.max(...(analytics.users.monthlySignups.map((s: any) => s.count) || [1]), 1);
                  const heightPct = Math.max(12, Math.round((item.count / maxCount) * 100));
                  return (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>{item.count}</span>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: 38,
                          height: `${heightPct}%`,
                          backgroundColor: idx === analytics.users.monthlySignups.length - 1 ? '#7c3aed' : 'rgba(124, 58, 237, 0.3)',
                          borderRadius: '6px 6px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>{item.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: GESTÃO DE USUÁRIOS (USER MANAGEMENT)
          ========================================================= */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Filters Bar Card */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 240 }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Buscar por nome ou e-mail..."
                  value={searchUser}
                  onChange={(e) => {
                    setSearchUser(e.target.value);
                    setUsersPage(1);
                  }}
                  className="input-field"
                  style={{ paddingLeft: 38 }}
                />
              </div>

              {/* Status Select */}
              <div style={{ minWidth: 150 }}>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setUsersPage(1);
                  }}
                  className="input-field"
                >
                  <option value="all">Todos os Status</option>
                  <option value="active">Ativas</option>
                  <option value="suspended">Suspensas</option>
                  <option value="pending">Pendentes</option>
                </select>
              </div>

              {/* Date Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>Cadastro:</span>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => {
                    setStartDateFilter(e.target.value);
                    setUsersPage(1);
                  }}
                  className="input-field"
                  style={{ width: 'auto', padding: '8px 10px', fontSize: 12 }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>até</span>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => {
                    setEndDateFilter(e.target.value);
                    setUsersPage(1);
                  }}
                  className="input-field"
                  style={{ width: 'auto', padding: '8px 10px', fontSize: 12 }}
                />
                {(searchUser || statusFilter !== 'all' || startDateFilter || endDateFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchUser('');
                      setStatusFilter('all');
                      setStartDateFilter('');
                      setEndDateFilter('');
                      setUsersPage(1);
                    }}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#ef4444',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 8px',
                    }}
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Users Table Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 850 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)', backgroundColor: 'var(--bg-item, #fafbfc)' }}>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px' }}>
                      USUÁRIO
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px' }}>
                      NÍVEL (RBAC)
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px' }}>
                      STATUS
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px' }}>
                      ÚLTIMO ACESSO
                    </th>
                    <th style={{ padding: '14px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px' }}>
                      DATA DE CADASTRO
                    </th>
                    <th style={{ padding: '14px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.5px', textAlign: 'right' }}>
                      AÇÕES
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                        Nenhum usuário encontrado com os filtros informados.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isSuperAdmin = u.email.toLowerCase() === 'hannowersousa@gmail.com';
                      return (
                        <tr
                          key={u.id}
                          className="data-table-row"
                          style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}
                        >
                          {/* User info */}
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 18,
                                  backgroundColor: u.role === 'admin' ? 'rgba(124, 58, 237, 0.15)' : 'var(--primary-badge, #dcfce7)',
                                  color: u.role === 'admin' ? '#7c3aed' : 'var(--primary, #166534)',
                                  fontWeight: 700,
                                  fontSize: 13,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {getInitials(u.name)}
                              </div>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                                  {u.name}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>{u.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td style={{ padding: '16px 16px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 10px',
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 800,
                                letterSpacing: '0.5px',
                                backgroundColor: u.role === 'admin' ? 'rgba(124, 58, 237, 0.12)' : 'var(--bg-app, #f1f5f9)',
                                color: u.role === 'admin' ? '#7c3aed' : 'var(--text-secondary, #64748b)',
                                border: u.role === 'admin' ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid var(--border-color, #e2e8f0)',
                              }}
                            >
                              {u.role === 'admin' ? <ShieldCheck size={13} /> : <Users size={13} />}
                              {u.role === 'admin' ? 'ADMIN' : 'USUÁRIO'}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td style={{ padding: '16px 16px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '4px 10px',
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 700,
                                backgroundColor:
                                  u.status === 'active'
                                    ? 'rgba(21, 128, 61, 0.1)'
                                    : u.status === 'suspended'
                                    ? 'rgba(239, 68, 68, 0.1)'
                                    : 'rgba(245, 158, 11, 0.1)',
                                color:
                                  u.status === 'active'
                                    ? '#15803d'
                                    : u.status === 'suspended'
                                    ? '#ef4444'
                                    : '#b45309',
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  backgroundColor:
                                    u.status === 'active' ? '#22c55e' : u.status === 'suspended' ? '#ef4444' : '#f59e0b',
                                }}
                              />
                              {u.status === 'active' ? 'Ativa' : u.status === 'suspended' ? 'Suspensa' : 'Pendente'}
                            </span>
                          </td>

                          {/* Last Login */}
                          <td style={{ padding: '16px 16px', fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Clock size={14} color="#94a3b8" />
                              {formatDate(u.lastLogin)}
                            </div>
                          </td>

                          {/* Created At */}
                          <td style={{ padding: '16px 16px', fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>
                            {formatDate(u.createdAt)}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              {/* Reset Password */}
                              <button
                                type="button"
                                onClick={() => handleOpenResetModal(u)}
                                title="Enviar link de redefinição de senha"
                                style={{
                                  padding: 7,
                                  borderRadius: 8,
                                  border: '1px solid var(--border-color, #e2e8f0)',
                                  backgroundColor: 'var(--bg-app, #ffffff)',
                                  color: 'var(--text-secondary, #64748b)',
                                  cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#2563eb')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary, #64748b)')}
                              >
                                <KeyRound size={15} />
                              </button>

                              {/* Change Status */}
                              <button
                                type="button"
                                onClick={() => handleOpenStatusModal(u)}
                                title="Alterar status da conta (Ativar / Suspender)"
                                disabled={isSuperAdmin}
                                style={{
                                  padding: 7,
                                  borderRadius: 8,
                                  border: '1px solid var(--border-color, #e2e8f0)',
                                  backgroundColor: 'var(--bg-app, #ffffff)',
                                  color: 'var(--text-secondary, #64748b)',
                                  cursor: isSuperAdmin ? 'not-allowed' : 'pointer',
                                  opacity: isSuperAdmin ? 0.4 : 1,
                                }}
                                onMouseEnter={(e) => !isSuperAdmin && (e.currentTarget.style.color = '#d97706')}
                                onMouseLeave={(e) => !isSuperAdmin && (e.currentTarget.style.color = 'var(--text-secondary, #64748b)')}
                              >
                                <UserX size={15} />
                              </button>

                              {/* Change Role */}
                              <button
                                type="button"
                                onClick={() => handleOpenRoleModal(u)}
                                title="Alterar nível (Usuário / Admin)"
                                disabled={isSuperAdmin}
                                style={{
                                  padding: 7,
                                  borderRadius: 8,
                                  border: '1px solid var(--border-color, #e2e8f0)',
                                  backgroundColor: 'var(--bg-app, #ffffff)',
                                  color: 'var(--text-secondary, #64748b)',
                                  cursor: isSuperAdmin ? 'not-allowed' : 'pointer',
                                  opacity: isSuperAdmin ? 0.4 : 1,
                                }}
                                onMouseEnter={(e) => !isSuperAdmin && (e.currentTarget.style.color = '#7c3aed')}
                                onMouseLeave={(e) => !isSuperAdmin && (e.currentTarget.style.color = 'var(--text-secondary, #64748b)')}
                              >
                                <Shield size={15} />
                              </button>

                              {/* Delete User (LGPD) */}
                              <button
                                type="button"
                                onClick={() => handleOpenDeleteModal(u)}
                                title="Exclusão definitiva de conta (LGPD Direito ao Esquecimento)"
                                disabled={isSuperAdmin}
                                style={{
                                  padding: 7,
                                  borderRadius: 8,
                                  border: '1px solid var(--border-color, #e2e8f0)',
                                  backgroundColor: 'var(--bg-app, #ffffff)',
                                  color: 'var(--text-secondary, #64748b)',
                                  cursor: isSuperAdmin ? 'not-allowed' : 'pointer',
                                  opacity: isSuperAdmin ? 0.4 : 1,
                                }}
                                onMouseEnter={(e) => !isSuperAdmin && (e.currentTarget.style.color = '#ef4444')}
                                onMouseLeave={(e) => !isSuperAdmin && (e.currentTarget.style.color = 'var(--text-secondary, #64748b)')}
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

            {/* Pagination Controls */}
            {usersTotalPages > 1 && (
              <div
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-color, #f1f5f9)',
                }}
              >
                <div style={{ fontSize: 13, color: 'var(--text-muted, #94a3b8)' }}>
                  Exibindo página <strong>{usersPage}</strong> de <strong>{usersTotalPages}</strong> ({usersTotal} usuários)
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                    disabled={usersPage <= 1}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 12, opacity: usersPage <= 1 ? 0.5 : 1 }}
                  >
                    <ChevronLeft size={14} /> Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))}
                    disabled={usersPage >= usersTotalPages}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 12, opacity: usersPage >= usersTotalPages ? 0.5 : 1 }}
                  >
                    Próxima <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: AUDITORIA & SEGURANÇA (AUDIT & SECURITY LOGS)
          ========================================================= */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Sub Tab Switcher */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => setAuditSubTab('audit')}
              className={auditSubTab === 'audit' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700 }}
            >
              <ShieldCheck size={16} /> Trilha de Auditoria (Ações Admin)
            </button>
            <button
              type="button"
              onClick={() => setAuditSubTab('security')}
              className={auditSubTab === 'security' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700 }}
            >
              <Lock size={16} /> Tentativas de Login & Segurança
            </button>
          </div>

          {/* Audit Sub-view */}
          {auditSubTab === 'audit' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                <div style={{ position: 'relative', maxWidth: 360 }}>
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Buscar em ações ou e-mails..."
                    value={auditSearch}
                    onChange={(e) => {
                      setAuditSearch(e.target.value);
                      setAuditPage(1);
                    }}
                    className="input-field"
                    style={{ paddingLeft: 38 }}
                  />
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)', backgroundColor: 'var(--bg-item, #fafbfc)' }}>
                      <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)' }}>DATA / HORA</th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)' }}>ADMIN</th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)' }}>AÇÃO</th>
                      <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)' }}>USUÁRIO ALVO</th>
                      <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)' }}>DETALHES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                          Nenhum registro de auditoria encontrado.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="data-table-row" style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                          <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--text-secondary, #64748b)', whiteSpace: 'nowrap' }}>
                            {formatDate(log.createdAt)}
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                            {log.adminEmail}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 800,
                                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                                color: '#7c3aed',
                              }}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>
                            {log.targetUserEmail || '—'}
                          </td>
                          <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-main, #0f172a)' }}>
                            {log.details || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Security Sub-view */}
          {auditSubTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Security Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <div style={{ padding: 16, borderRadius: 12, backgroundColor: 'rgba(21, 128, 61, 0.08)', border: '1px solid rgba(21, 128, 61, 0.25)' }}>
                  <div style={{ fontSize: 12, color: '#15803d', fontWeight: 700 }}>Logins com Sucesso</div>
                  <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: '#15803d' }}>
                    {securitySummary?.successCount ?? 0}
                  </div>
                </div>

                <div style={{ padding: 16, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                  <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}>Tentativas Malsucedidas / 2FA</div>
                  <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: '#ef4444' }}>
                    {securitySummary?.failedCount ?? 0}
                  </div>
                </div>

                <div style={{ padding: 16, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  <div style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>Bloqueios / Acesso Não Autorizado</div>
                  <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: '#b45309' }}>
                    {securitySummary?.suspendedCount ?? 0}
                  </div>
                </div>
              </div>

              {/* Security Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 700 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)', backgroundColor: 'var(--bg-item, #fafbfc)' }}>
                        <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)' }}>DATA / HORA</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)' }}>E-MAIL</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)' }}>STATUS</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)' }}>MOTIVO</th>
                        <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)' }}>IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {securityLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                            Nenhum log de segurança registrado.
                          </td>
                        </tr>
                      ) : (
                        securityLogs.map((log) => (
                          <tr key={log.id} className="data-table-row" style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                            <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--text-secondary, #64748b)', whiteSpace: 'nowrap' }}>
                              {formatDate(log.createdAt)}
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                              {log.email}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  backgroundColor:
                                    log.status === 'SUCCESS'
                                      ? 'rgba(21, 128, 61, 0.1)'
                                      : log.status === '2FA_REQUIRED'
                                      ? 'rgba(99, 102, 241, 0.1)'
                                      : 'rgba(239, 68, 68, 0.1)',
                                  color:
                                    log.status === 'SUCCESS'
                                      ? '#15803d'
                                      : log.status === '2FA_REQUIRED'
                                      ? '#4f46e5'
                                      : '#ef4444',
                                }}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>
                              {log.reason || '—'}
                            </td>
                            <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
                              {log.ipAddress || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 4: MONITORAMENTO TÉCNICO & ERROS (SYSTEM HEALTH)
          ========================================================= */}
      {activeTab === 'health' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Health Diagnostics Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#15803d' }}>
                <Server size={18} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Servidor Backend API</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8, color: 'var(--text-main, #0f172a)' }}>
                Online (Porta 5000)
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>Node.js • Express 4.x • TSX</div>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#2563eb' }}>
                <Database size={18} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Banco de Dados Relacional</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8, color: 'var(--text-main, #0f172a)' }}>
                Supabase PostgreSQL
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>Pooler Ativo • Prisma ORM 5.x</div>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#7c3aed' }}>
                <ShieldCheck size={18} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Segurança & RBAC</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8, color: 'var(--text-main, #0f172a)' }}>
                Ativo • 2FA Habilitado
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>JWT Bearer • Auditoria em tempo real</div>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: errorTotal > 0 ? '#ef4444' : '#15803d' }}>
                <AlertTriangle size={18} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Falhas Registradas</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8, color: errorTotal > 0 ? '#ef4444' : '#15803d' }}>
                {errorTotal} {errorTotal === 1 ? 'erro' : 'erros'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>SystemErrorLog persistente</div>
            </div>
          </div>

          {/* Error Logs Table Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-color, #f1f5f9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)' }}>
                  Logs de Erros e Exceções do Sistema
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
                  Falhas de execução capturadas no backend para rápida identificação de bugs.
                </span>
              </div>

              {errorTotal > 0 && (
                <button
                  type="button"
                  onClick={() => setClearErrorModalOpen(true)}
                  className="btn-secondary"
                  style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', borderColor: '#fca5a5' }}
                >
                  <Trash2 size={13} /> Limpar Logs
                </button>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)', backgroundColor: 'var(--bg-item, #fafbfc)' }}>
                    <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)' }}>CÓDIGO</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)' }}>MÉTODO / ENDPOINT</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)' }}>MENSAGEM DE ERRO</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)' }}>DATA / HORA</th>
                    <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textAlign: 'right' }}>DETALHES</th>
                  </tr>
                </thead>
                <tbody>
                  {errorLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: '#15803d' }}>
                        <CheckCircle2 size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
                        <span style={{ fontWeight: 700, fontSize: 14 }}>Tudo limpo!</span>
                        <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', marginTop: 4 }}>
                          Nenhum erro de execução registrado no sistema.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    errorLogs.map((log) => (
                      <tr key={log.id} className="data-table-row" style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                        <td style={{ padding: '14px 20px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              backgroundColor: log.statusCode >= 500 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: log.statusCode >= 500 ? '#ef4444' : '#b45309',
                            }}
                          >
                            HTTP {log.statusCode}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                          <span style={{ color: '#7c3aed', marginRight: 6 }}>{log.method}</span>
                          {log.endpoint}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: '#ef4444', maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.message}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
                          {formatDate(log.createdAt)}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedError(log)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              border: '1px solid var(--border-color, #e2e8f0)',
                              backgroundColor: 'var(--bg-app, #ffffff)',
                              color: 'var(--text-main, #0f172a)',
                              cursor: 'pointer',
                            }}
                          >
                            Ver Stack
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODALS DE AÇÕES ADMINISTRATIVAS
          ========================================================= */}

      {/* Modal: Alterar Status */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Alterar Status da Conta"
        subtitle={`Modifique o status de acesso de ${selectedUser?.name}`}
        icon={<UserX size={22} color="#d97706" />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Selecione o novo status:</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: 10,
                  border: targetStatus === 'active' ? '2px solid #16a34a' : '1px solid var(--border-color, #e2e8f0)',
                  backgroundColor: targetStatus === 'active' ? 'rgba(21, 128, 61, 0.08)' : 'var(--bg-app, #ffffff)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={targetStatus === 'active'}
                  onChange={() => setTargetStatus('active')}
                  style={{ accentColor: '#16a34a' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>Ativa</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>Usuário pode realizar login e usar a plataforma normalmente.</div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: 10,
                  border: targetStatus === 'suspended' ? '2px solid #ef4444' : '1px solid var(--border-color, #e2e8f0)',
                  backgroundColor: targetStatus === 'suspended' ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-app, #ffffff)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="status"
                  value="suspended"
                  checked={targetStatus === 'suspended'}
                  onChange={() => setTargetStatus('suspended')}
                  style={{ accentColor: '#ef4444' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>Suspensa / Banida</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>O acesso à plataforma é bloqueado imediatamente.</div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: 10,
                  border: targetStatus === 'pending' ? '2px solid #f59e0b' : '1px solid var(--border-color, #e2e8f0)',
                  backgroundColor: targetStatus === 'pending' ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-app, #ffffff)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="status"
                  value="pending"
                  checked={targetStatus === 'pending'}
                  onChange={() => setTargetStatus('pending')}
                  style={{ accentColor: '#f59e0b' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#b45309' }}>Pendente</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>Aguardando confirmações adicionais ou revisão manual.</div>
                </div>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={() => setStatusModalOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="button" onClick={handleSaveStatus} disabled={actionLoading} className="btn-primary">
              {actionLoading ? 'Salvando...' : 'Confirmar Alteração'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Alterar Role */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title="Alterar Nível de Acesso (RBAC)"
        subtitle={`Defina as permissões de acesso para ${selectedUser?.name}`}
        icon={<Shield size={22} color="#7c3aed" />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)', margin: 0, lineHeight: 1.5 }}>
            Você está alterando o nível de acesso da conta <strong>{selectedUser?.email}</strong>.
            {targetRole === 'admin'
              ? ' Ao torná-lo administrador, este usuário terá acesso total ao painel administrativo e dados de moderação.'
              : ' Ao torná-lo usuário comum, o acesso ao painel de administração será revogado.'}
          </p>

          <div style={{ padding: 12, borderRadius: 10, backgroundColor: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.25)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>
              Novo nível a ser aplicado: <strong>{targetRole === 'admin' ? 'ADMINISTRADOR' : 'USUÁRIO COMUM'}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={() => setRoleModalOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveRole}
              disabled={actionLoading}
              className="btn-primary"
              style={{ backgroundColor: '#7c3aed' }}
            >
              {actionLoading ? 'Salvando...' : `Confirmar para ${targetRole.toUpperCase()}`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Enviar Redefinição de Senha */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Enviar Redefinição de Senha"
        subtitle={`Disparar link seguro para ${selectedUser?.email}`}
        icon={<KeyRound size={22} color="#2563eb" />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)', margin: 0, lineHeight: 1.5 }}>
            Será gerado um token criptográfico único e enviado para o e-mail <strong>{selectedUser?.email}</strong>.
            O link terá validade de <strong>1 hora</strong> e permite ao usuário redefinir sua senha diretamente.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={() => setResetModalOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="button" onClick={handleConfirmResetPassword} disabled={actionLoading} className="btn-primary">
              {actionLoading ? 'Enviando...' : 'Enviar Link de Redefinição'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Exclusão Definitiva (LGPD) */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Exclusão Definitiva de Conta (LGPD)"
        subtitle="Direito ao Esquecimento e eliminação total dos dados"
        icon={<AlertTriangle size={22} color="#ef4444" />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: 13,
              color: '#ef4444',
              lineHeight: 1.5,
            }}
          >
            <strong>⚠️ Atenção: Ação Irreversível!</strong>
            <br />
            Você está prestes a excluir permanentemente a conta de <strong>{selectedUser?.name}</strong> ({selectedUser?.email}).
            Todos os cofrinhos, cartões, despesas, faturas, receitas e registros associados a este usuário serão{' '}
            <strong>eliminados definitivamente do banco de dados</strong> em conformidade com o Artigo 18 da LGPD.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={() => setDeleteModalOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteUser}
              disabled={actionLoading}
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {actionLoading ? 'Excluindo...' : 'Sim, Excluir Definitivamente'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Visualizar Stack do Erro */}
      <Modal
        isOpen={!!selectedError}
        onClose={() => setSelectedError(null)}
        title="Detalhes do Erro do Sistema"
        subtitle={`${selectedError?.method} ${selectedError?.endpoint} (HTTP ${selectedError?.statusCode})`}
        icon={<AlertTriangle size={22} color="#ef4444" />}
        maxWidth="680px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', marginBottom: 4 }}>
              Mensagem:
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.08)', padding: 12, borderRadius: 8 }}>
              {selectedError?.message}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', marginBottom: 4 }}>
              Stack Trace Técnico:
            </div>
            <pre
              style={{
                fontSize: 11,
                fontFamily: 'Consolas, monospace',
                backgroundColor: '#090e1b',
                color: '#f8fafc',
                padding: 14,
                borderRadius: 10,
                maxHeight: 250,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {selectedError?.stack || 'Nenhum stack trace registrado.'}
            </pre>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setSelectedError(null)} className="btn-secondary">
              Fechar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Limpar Erros */}
      <Modal
        isOpen={clearErrorModalOpen}
        onClose={() => setClearErrorModalOpen(false)}
        title="Limpar Logs de Erros"
        subtitle="Confirme a remoção dos registros de erros do banco de dados"
        icon={<Trash2 size={22} color="#ef4444" />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)', margin: 0 }}>
            Todos os <strong>{errorTotal}</strong> registros de erros serão limpos do histórico de monitoramento. Esta ação será registrada na trilha de auditoria.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={() => setClearErrorModalOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleClearErrors}
              disabled={actionLoading}
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {actionLoading ? 'Limpando...' : 'Confirmar Limpeza'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
