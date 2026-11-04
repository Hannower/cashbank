import React, { useState, useEffect, useRef } from 'react';
import {
  Landmark,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Search,
  Plus,
  Clock,
  Trash2,
  Edit3,
  UploadCloud,
  HelpCircle,
  Check,
  X,
  FileCode,
  FileType,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';

interface BankAccount {
  id: string;
  bankKey: string;
  name: string;
  accountType: string;
  agency?: string;
  accountNumber?: string;
  color: string;
  balance: number;
  initialBalance: number;
  currency: string;
  status: string;
  lastSyncAt?: string;
  _count?: {
    transactions: number;
  };
}

interface BankTransaction {
  id: string;
  bankAccountId: string;
  bankAccount?: {
    id: string;
    name: string;
    bankKey: string;
    color: string;
  };
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
  paymentMethod?: string;
}

const SUPPORTED_BANKS = [
  { key: 'nubank', name: 'Nubank', color: '#820AD1' },
  { key: 'inter', name: 'Banco Inter', color: '#FF7A00' },
  { key: 'mercadopago', name: 'Mercado Pago', color: '#009EE3' },
  { key: 'picpay', name: 'PicPay', color: '#11C76F' },
  { key: 'itau', name: 'Itaú', color: '#EC7000' },
  { key: 'bradesco', name: 'Bradesco', color: '#CC092F' },
  { key: 'santander', name: 'Santander', color: '#CC0000' },
  { key: 'caixa', name: 'Caixa Econômica', color: '#005CA9' },
  { key: 'c6', name: 'C6 Bank', color: '#242424' },
  { key: 'other', name: 'Outro Banco', color: '#15803d' },
];

interface BankAccountsViewProps {
  showValues?: boolean;
}

export const BankAccountsView: React.FC<BankAccountsViewProps> = ({ showValues: propShowValues }) => {
  const showBalance = propShowValues !== undefined
    ? propShowValues
    : (typeof window !== 'undefined' && localStorage.getItem('cashbank_show_balance') !== 'false');
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [summary, setSummary] = useState({
    totalBalance: 0,
    totalIncomeMonth: 0,
    totalExpenseMonth: 0,
    accountsCount: 0,
  });

  // Filters
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [selectedAccountForImport, setSelectedAccountForImport] = useState<BankAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for creating an account
  const [formBankKey, setFormBankKey] = useState('nubank');
  const [formName, setFormName] = useState('Nubank');
  const [formAccountType, setFormAccountType] = useState('Conta Corrente');
  const [formAgency, setFormAgency] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formInitialBalance, setFormInitialBalance] = useState('');
  const [formStatementContent, setFormStatementContent] = useState<string | null>(null);
  const [formStatementFileName, setFormStatementFileName] = useState<string | null>(null);
  const [formStatementFileType, setFormStatementFileType] = useState<'ofx' | 'csv' | 'pdf'>('ofx');
  const [submitting, setSubmitting] = useState(false);

  // Edit Account state
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [editName, setEditName] = useState('');
  const [editAccountType, setEditAccountType] = useState('Conta Corrente');
  const [editAgency, setEditAgency] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Import Statement modal states
  const [importStatementContent, setImportStatementContent] = useState<string | null>(null);
  const [importStatementFileName, setImportStatementFileName] = useState<string | null>(null);
  const [importStatementFileType, setImportStatementFileType] = useState<'ofx' | 'csv' | 'pdf'>('ofx');
  const [importing, setImporting] = useState(false);

  // Manual modal tabs
  const [manualTab, setManualTab] = useState<'banks' | 'formats' | 'faq'>('banks');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accRes, txRes] = await Promise.all([
        api.getBankAccounts(),
        api.getBankTransactions({ limit: 100 }),
      ]);

      if (accRes) {
        setAccounts(accRes.accounts || []);
        setSummary(
          accRes.summary || {
            totalBalance: 0,
            totalIncomeMonth: 0,
            totalExpenseMonth: 0,
            accountsCount: 0,
          }
        );
      }
      if (txRes && Array.isArray(txRes)) {
        setTransactions(txRes);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados bancários:', err);
      setActionMessage({ type: 'error', text: 'Erro ao carregar dados: ' + (err.message || 'Tente novamente') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update default name when bankKey changes in create form
  useEffect(() => {
    const bank = SUPPORTED_BANKS.find((b) => b.key === formBankKey);
    if (bank) {
      setFormName(bank.name);
    }
  }, [formBankKey]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setActionMessage({ type: 'error', text: 'Informe um nome para a conta.' });
      return;
    }

    try {
      setSubmitting(true);
      const bank = SUPPORTED_BANKS.find((b) => b.key === formBankKey);

      const res = await api.createBankAccount({
        bankKey: formBankKey,
        name: formName.trim(),
        accountType: formAccountType,
        agency: formAgency.trim(),
        accountNumber: formAccountNumber.trim(),
        color: bank ? bank.color : '#15803d',
        initialBalance: parseFloat(formInitialBalance) || 0,
        statementContent: formStatementContent || undefined,
        ofxContent: formStatementContent || undefined,
        fileType: formStatementFileType,
      });

      setCreateModalOpen(false);
      resetCreateForm();
      setActionMessage({
        type: 'success',
        text: res?.message || 'Conta bancária cadastrada com sucesso!',
      });
      setTimeout(() => setActionMessage(null), 4000);
      await fetchData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Erro ao cadastrar conta: ' + (err.message || 'Tente novamente') });
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setFormBankKey('nubank');
    setFormName('Nubank');
    setFormAccountType('Conta Corrente');
    setFormAgency('');
    setFormAccountNumber('');
    setFormInitialBalance('');
    setFormStatementContent(null);
    setFormStatementFileName(null);
    setFormStatementFileType('ofx');
  };

  const handleOpenEditModal = (acc: BankAccount) => {
    setEditingAccount(acc);
    setEditName(acc.name);
    setEditAccountType(acc.accountType || 'Conta Corrente');
    setEditAgency(acc.agency || '');
    setEditAccountNumber(acc.accountNumber || '');
    setEditBalance(String(acc.balance || 0));
    setEditModalOpen(true);
  };

  const handleSaveEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    try {
      setSavingEdit(true);
      await api.updateBankAccount(editingAccount.id, {
        name: editName.trim(),
        accountType: editAccountType,
        agency: editAgency.trim(),
        accountNumber: editAccountNumber.trim(),
        balance: parseFloat(editBalance) || 0,
      });

      setEditModalOpen(false);
      setEditingAccount(null);
      setActionMessage({ type: 'success', text: 'Conta e saldo atualizados com sucesso!' });
      setTimeout(() => setActionMessage(null), 4000);
      await fetchData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Erro ao atualizar conta: ' + (err.message || 'Tente novamente') });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleStatementFileSelect = (file: File, isModal = false) => {
    if (!file) return;
    const nameLower = file.name.toLowerCase();
    const detectedType: 'ofx' | 'csv' | 'pdf' = nameLower.endsWith('.pdf')
      ? 'pdf'
      : nameLower.endsWith('.csv')
      ? 'csv'
      : 'ofx';

    const reader = new FileReader();

    if (detectedType === 'pdf') {
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (isModal) {
          setImportStatementContent(base64);
          setImportStatementFileName(file.name);
          setImportStatementFileType(detectedType);
        } else {
          setFormStatementContent(base64);
          setFormStatementFileName(file.name);
          setFormStatementFileType(detectedType);
        }
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (isModal) {
          setImportStatementContent(text);
          setImportStatementFileName(file.name);
          setImportStatementFileType(detectedType);
        } else {
          setFormStatementContent(text);
          setFormStatementFileName(file.name);
          setFormStatementFileType(detectedType);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImportStatementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountForImport || !importStatementContent) {
      setActionMessage({ type: 'error', text: 'Por favor, selecione um arquivo de extrato válido (.ofx, .csv ou .pdf).' });
      return;
    }

    try {
      setImporting(true);
      const res = await api.importBankStatement(
        selectedAccountForImport.id,
        importStatementContent,
        importStatementFileType
      );
      setImportModalOpen(false);
      setImportStatementContent(null);
      setImportStatementFileName(null);
      setSelectedAccountForImport(null);
      setActionMessage({
        type: 'success',
        text: res.message || 'Extrato importado e processado com sucesso!',
      });
      setTimeout(() => setActionMessage(null), 5000);
      await fetchData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Erro ao importar extrato: ' + (err.message || 'Verifique o formato do arquivo') });
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    try {
      await api.deleteBankAccount(accountToDelete.id);
      setActionMessage({ type: 'success', text: `Conta ${accountToDelete.name} excluída com sucesso.` });
      setAccountToDelete(null);
      setTimeout(() => setActionMessage(null), 4000);
      await fetchData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Erro ao excluir conta: ' + (err.message || 'Tente novamente') });
    }
  };

  const handleDeleteTx = async (id: string) => {
    try {
      await api.deleteBankTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setActionMessage({ type: 'success', text: 'Transação excluída com sucesso.' });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Erro ao excluir transação: ' + err.message });
    }
  };

  const formatCurrency = (val: number) => {
    if (!showBalance) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesBank = selectedBankFilter === 'all' || tx.bankAccountId === selectedBankFilter;
    const matchesType = selectedTypeFilter === 'all' || tx.type === selectedTypeFilter;
    const matchesSearch =
      !searchTerm.trim() ||
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesBank && matchesType && matchesSearch;
  });

  return (
    <div className="content-container animate-fade-in bank-accounts-container">
      {/* Top Header */}
      <div className="bank-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            className="kpi-icon-income"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Landmark size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.4px', color: 'var(--text-main, #0f172a)' }}>
              Contas Bancárias
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>
              Gerencie seus saldos e extratos via importação direta de arquivos OFX, CSV e PDF.
            </p>
          </div>
        </div>

        <div className="bank-header-actions">
          <button
            onClick={() => setManualModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 10,
              backgroundColor: 'var(--bg-card, #ffffff)',
              color: 'var(--text-main, #0f172a)',
              border: '1px solid var(--border-color, #cbd5e1)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <HelpCircle size={16} color="#15803d" />
            <span>Manual & Formatos</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              backgroundColor: '#15803d',
              backgroundImage: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(21, 128, 61, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={18} />
            <span>Adicionar Conta</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            backgroundColor: actionMessage.type === 'success' ? 'rgba(21, 128, 61, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${actionMessage.type === 'success' ? '#15803d' : '#ef4444'}`,
            color: actionMessage.type === 'success' ? '#15803d' : '#ef4444',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Summary KPI Cards (Responsive 2x2 on Mobile & Tablet) */}
      <div className="bank-kpis-grid">
        <div className="bank-kpi-card">
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>
              Saldo Total
            </span>
            <div
              className="bank-kpi-val"
              style={{ color: summary.totalBalance >= 0 ? 'var(--kpi-income-color, #16a34a)' : 'var(--kpi-expense-color, #ea580c)' }}
            >
              {formatCurrency(summary.totalBalance)}
            </div>
          </div>
          <div className="bank-kpi-icon kpi-icon-income">
            <Wallet size={20} />
          </div>
        </div>

        <div className="bank-kpi-card">
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>
              Entradas no Mês
            </span>
            <div className="bank-kpi-val" style={{ color: 'var(--kpi-income-color, #16a34a)' }}>
              {formatCurrency(summary.totalIncomeMonth)}
            </div>
          </div>
          <div className="bank-kpi-icon kpi-icon-income">
            <ArrowDownLeft size={20} />
          </div>
        </div>

        <div className="bank-kpi-card">
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>
              Saídas no Mês
            </span>
            <div className="bank-kpi-val" style={{ color: 'var(--kpi-expense-color, #ea580c)' }}>
              {formatCurrency(summary.totalExpenseMonth)}
            </div>
          </div>
          <div className="bank-kpi-icon kpi-icon-expense">
            <ArrowUpRight size={20} />
          </div>
        </div>

        <div className="bank-kpi-card">
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>
              Contas
            </span>
            <div className="bank-kpi-val" style={{ color: 'var(--text-main, #0f172a)' }}>
              {summary.accountsCount} {summary.accountsCount === 1 ? 'conta' : 'contas'}
            </div>
          </div>
          <div className="bank-kpi-icon kpi-icon-bank">
            <Building2 size={20} />
          </div>
        </div>
      </div>

      {/* Connected Accounts Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-0.3px', color: 'var(--text-main, #0f172a)' }}>
            Suas Contas Bancárias
          </h2>
          <span style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>
            {accounts.length} {accounts.length === 1 ? 'conta configurada' : 'contas configuradas'}
          </span>
        </div>

        {accounts.length === 0 ? (
          <div
            style={{
              padding: '36px 20px',
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: 16,
              border: '1px dashed var(--border-color, #cbd5e1)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                backgroundColor: 'rgba(21, 128, 61, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#15803d',
              }}
            >
              <Landmark size={26} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-main, #0f172a)' }}>
                Nenhuma conta bancária cadastrada ainda
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)', margin: 0, maxWidth: 520, lineHeight: 1.5 }}>
                Importe extratos em <strong>OFX, CSV ou PDF</strong> do Nubank, PicPay, Banco Inter, Mercado Pago e qualquer outro banco.
              </p>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 8,
                backgroundColor: '#15803d',
                color: '#ffffff',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 6,
              }}
            >
              <Plus size={16} />
              <span>Cadastrar Minha Primeira Conta</span>
            </button>
          </div>
        ) : (
          <div className="bank-cards-grid">
            {accounts.map((acc) => {
              return (
                <div
                  key={acc.id}
                  style={{
                    backgroundColor: 'var(--bg-card, #ffffff)',
                    borderRadius: 16,
                    border: '1px solid var(--border-color, #e2e8f0)',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          backgroundColor: `${acc.color || '#15803d'}20`,
                          color: acc.color || '#15803d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 16,
                          flexShrink: 0,
                        }}
                      >
                        <Building2 size={22} />
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: 'var(--text-main, #0f172a)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {acc.name}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)', display: 'block' }}>
                          {acc.accountType} {acc.agency ? `• Ag: ${acc.agency}` : ''} {acc.accountNumber ? `• CC: ${acc.accountNumber}` : ''}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          backgroundColor: 'rgba(21, 128, 61, 0.12)',
                          color: '#15803d',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <FileCode size={12} />
                        OFX / CSV / PDF
                      </span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase' }}>
                      Saldo Atual
                    </span>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: acc.balance >= 0 ? 'var(--text-main, #0f172a)' : '#ef4444',
                        letterSpacing: '-0.3px',
                      }}
                    >
                      {formatCurrency(acc.balance)}
                    </div>
                    {acc.lastSyncAt && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Clock size={12} />
                        Atualizado em {new Date(acc.lastSyncAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid var(--border-color, #f1f5f9)',
                      paddingTop: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <button
                      onClick={() => {
                        setSelectedAccountForImport(acc);
                        setImportModalOpen(true);
                      }}
                      title="Importar novo extrato (OFX, CSV ou PDF) para esta conta"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 14px',
                        borderRadius: 8,
                        backgroundColor: 'rgba(21, 128, 61, 0.08)',
                        color: '#15803d',
                        border: '1px solid rgba(21, 128, 61, 0.25)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <UploadCloud size={14} />
                      <span>Importar Extrato</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => handleOpenEditModal(acc)}
                        title="Editar conta ou ajustar saldo"
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: 'var(--text-muted, #94a3b8)',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#15803d')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted, #94a3b8)')}
                      >
                        <Edit3 size={16} />
                      </button>

                      <button
                        onClick={() => setAccountToDelete(acc)}
                        title="Remover conta bancária"
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: 'var(--text-muted, #94a3b8)',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted, #94a3b8)')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unified Bank Transactions (Extrato) */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          borderRadius: 16,
          border: '1px solid var(--border-color, #e2e8f0)',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.3px', color: 'var(--text-main, #0f172a)' }}>
              Extrato Consolidado
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>
              Histórico unificado de movimentações das suas contas bancárias
            </span>
          </div>

          <div className="bank-filters-wrapper">
            {/* Search */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 8,
                backgroundColor: 'var(--bg-input, #f8fafc)',
                border: '1px solid var(--border-input, #cbd5e1)',
              }}
            >
              <Search size={14} color="#64748b" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar movimentação..."
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontSize: 12,
                  color: 'var(--text-main, #0f172a)',
                  width: 140,
                }}
              />
            </div>

            {/* Bank Filter */}
            <select
              value={selectedBankFilter}
              onChange={(e) => setSelectedBankFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid var(--border-input, #cbd5e1)',
                backgroundColor: 'var(--bg-input, #ffffff)',
                color: 'var(--text-main, #0f172a)',
                fontSize: 12,
                outline: 'none',
              }}
            >
              <option value="all">Todos os bancos</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid var(--border-input, #cbd5e1)',
                backgroundColor: 'var(--bg-input, #ffffff)',
                color: 'var(--text-main, #0f172a)',
                fontSize: 12,
                outline: 'none',
              }}
            >
              <option value="all">Todas as transações</option>
              <option value="income">Apenas Entradas</option>
              <option value="expense">Apenas Saídas</option>
            </select>
          </div>
        </div>

        {/* Transactions Table / List */}
        {filteredTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-secondary, #64748b)', fontSize: 13 }}>
            Nenhuma transação encontrada para os filtros selecionados.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="bank-table-desktop" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-secondary, #64748b)' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Data</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Banco</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Descrição</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Categoria</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Método</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Valor</th>
                    <th style={{ padding: '10px 12px', width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => {
                    const isIncome = tx.type === 'income';
                    return (
                      <tr
                        key={tx.id}
                        style={{
                          borderBottom: '1px solid var(--border-color, #f1f5f9)',
                          transition: 'background-color 0.1s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-item-hover, #f8fafc)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '12px 12px', whiteSpace: 'nowrap', color: 'var(--text-secondary, #64748b)' }}>
                          {formatDate(tx.date)}
                        </td>
                        <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              backgroundColor: `${tx.bankAccount?.color || '#15803d'}20`,
                              color: tx.bankAccount?.color || '#15803d',
                            }}
                          >
                            {tx.bankAccount?.name || 'Banco'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 12px', fontWeight: 500, color: 'var(--text-main, #0f172a)' }}>
                          {tx.description}
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 6,
                              backgroundColor: 'var(--bg-app, #f1f5f9)',
                              color: 'var(--text-secondary, #475569)',
                            }}
                          >
                            {tx.category || 'Geral'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 12px', fontSize: 11, color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
                          {tx.paymentMethod || 'PIX'}
                        </td>
                        <td
                          style={{
                            padding: '12px 12px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: isIncome ? 'var(--kpi-income-color, #16a34a)' : 'var(--kpi-expense-color, #ea580c)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isIncome ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(tx.amount)}`}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteTx(tx.id)}
                            title="Excluir lançamento"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted, #94a3b8)',
                              cursor: 'pointer',
                              padding: 4,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted, #94a3b8)')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="bank-tx-mobile-list">
              {filteredTransactions.map((tx) => {
                const isIncome = tx.type === 'income';
                return (
                  <div
                    key={tx.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: '1px solid var(--border-color, #e2e8f0)',
                      backgroundColor: 'var(--bg-card, #ffffff)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: `${tx.bankAccount?.color || '#15803d'}20`,
                            color: tx.bankAccount?.color || '#15803d',
                          }}
                        >
                          {tx.bankAccount?.name || 'Banco'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary, #64748b)' }}>
                          {formatDate(tx.date)}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: isIncome ? 'var(--kpi-income-color, #16a34a)' : 'var(--kpi-expense-color, #ea580c)',
                        }}
                      >
                        {isIncome ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(tx.amount)}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-main, #0f172a)' }}>
                        {tx.description}
                      </span>
                      <button
                        onClick={() => handleDeleteTx(tx.id)}
                        title="Excluir lançamento"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted, #94a3b8)',
                          cursor: 'pointer',
                          padding: 2,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted, #94a3b8)')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-muted, #94a3b8)' }}>
                      <span>{tx.category || 'Geral'}</span>
                      <span>•</span>
                      <span>{tx.paymentMethod || 'PIX'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ========================================================
          MODAL: Cadastrar Nova Conta Bancária (100% Arquivos)
         ======================================================== */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Cadastrar Conta Bancária"
        subtitle="Escolha sua instituição e envie o arquivo de extrato (OFX, CSV ou PDF)."
        icon={<Landmark size={22} color="#15803d" />}
        maxWidth="560px"
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Bank Selector */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-main, #0f172a)' }}>
              Selecione a Instituição:
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: 8,
              }}
            >
              {SUPPORTED_BANKS.map((b) => {
                const isSelected = formBankKey === b.key;
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setFormBankKey(b.key)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: `2px solid ${isSelected ? b.color : 'var(--border-input, #e2e8f0)'}`,
                      backgroundColor: isSelected ? `${b.color}15` : 'var(--bg-input, #ffffff)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        backgroundColor: `${b.color}20`,
                        color: b.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Building2 size={14} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: isSelected ? 700 : 500, color: 'var(--text-main, #0f172a)' }}>
                      {b.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Common Info */}
          <div className="bank-form-row-2">
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-main, #0f172a)' }}>
                Nome da Conta *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Nubank Principal, Inter Corrente"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-input, #cbd5e1)',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  color: 'var(--text-main, #0f172a)',
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-main, #0f172a)' }}>
                Tipo
              </label>
              <select
                value={formAccountType}
                onChange={(e) => setFormAccountType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-input, #cbd5e1)',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  color: 'var(--text-main, #0f172a)',
                  fontSize: 13,
                }}
              >
                <option value="Conta Corrente">Conta Corrente</option>
                <option value="Conta Pagamento">Conta Pagamento</option>
                <option value="Poupança">Poupança</option>
                <option value="Salário">Conta Salário</option>
              </select>
            </div>
          </div>

          <div className="bank-form-row-3">
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-main, #0f172a)' }}>
                Agência (opcional)
              </label>
              <input
                type="text"
                value={formAgency}
                onChange={(e) => setFormAgency(e.target.value)}
                placeholder="0001"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-input, #cbd5e1)',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  color: 'var(--text-main, #0f172a)',
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-main, #0f172a)' }}>
                Conta (opcional)
              </label>
              <input
                type="text"
                value={formAccountNumber}
                onChange={(e) => setFormAccountNumber(e.target.value)}
                placeholder="1234567-8"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-input, #cbd5e1)',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  color: 'var(--text-main, #0f172a)',
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-main, #0f172a)' }}>
                Saldo Inicial (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formInitialBalance}
                onChange={(e) => setFormInitialBalance(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-input, #cbd5e1)',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  color: 'var(--text-main, #0f172a)',
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          {/* Statement Upload Box */}
          <div
            style={{
              padding: '16px',
              borderRadius: 12,
              backgroundColor: 'rgba(21, 128, 61, 0.04)',
              border: '1px dashed #15803d',
              textAlign: 'center',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".ofx,.OFX,.csv,.CSV,.pdf,.PDF"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleStatementFileSelect(file, false);
              }}
            />
            <UploadCloud size={28} color="#15803d" style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
              {formStatementFileName ? (
                <span style={{ color: '#15803d' }}>
                  Arquivo selecionado ({formStatementFileType.toUpperCase()}): {formStatementFileName}
                </span>
              ) : (
                'Importar primeiro extrato (OFX, CSV ou PDF - Opcional)'
              )}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary, #64748b)', margin: '4px 0 8px 0' }}>
              Aceita arquivos <strong>.OFX</strong>, <strong>.CSV</strong> ou <strong>.PDF</strong>. As movimentações e o saldo serão calculados automaticamente.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                backgroundColor: '#15803d',
                color: '#ffffff',
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {formStatementFileName ? 'Trocar Arquivo' : 'Escolher Arquivo do Dispositivo'}
            </button>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                border: '1px solid var(--border-color, #cbd5e1)',
                backgroundColor: 'var(--bg-card, #ffffff)',
                color: 'var(--text-main, #0f172a)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '9px 20px',
                borderRadius: 8,
                backgroundColor: '#15803d',
                color: '#ffffff',
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
              <span>{submitting ? 'Cadastrando...' : 'Cadastrar Conta'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL: Editar Conta Bancária / Ajustar Saldo
         ======================================================== */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingAccount(null);
        }}
        title={`Editar Conta - ${editingAccount?.name || ''}`}
        subtitle="Altere os dados da conta ou ajuste o saldo atual diretamente."
        icon={<Edit3 size={22} color="#15803d" />}
        maxWidth="500px"
      >
        <form onSubmit={handleSaveEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="bank-form-row-2">
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-main, #0f172a)' }}>
                Nome da Conta *
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-input, #cbd5e1)',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  color: 'var(--text-main, #0f172a)',
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-main, #0f172a)' }}>
                Tipo
              </label>
              <select
                value={editAccountType}
                onChange={(e) => setEditAccountType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-input, #cbd5e1)',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  color: 'var(--text-main, #0f172a)',
                  fontSize: 13,
                }}
              >
                <option value="Conta Corrente">Conta Corrente</option>
                <option value="Conta Pagamento">Conta Pagamento</option>
                <option value="Poupança">Poupança</option>
                <option value="Salário">Conta Salário</option>
              </select>
            </div>
          </div>

          <div className="bank-form-row-3">
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-main, #0f172a)' }}>
                Agência
              </label>
              <input
                type="text"
                value={editAgency}
                onChange={(e) => setEditAgency(e.target.value)}
                placeholder="0001"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-input, #cbd5e1)',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  color: 'var(--text-main, #0f172a)',
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-main, #0f172a)' }}>
                Conta
              </label>
              <input
                type="text"
                value={editAccountNumber}
                onChange={(e) => setEditAccountNumber(e.target.value)}
                placeholder="1234567-8"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-input, #cbd5e1)',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  color: 'var(--text-main, #0f172a)',
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4, color: '#15803d' }}>
                Saldo Atual (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={editBalance}
                onChange={(e) => setEditBalance(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '2px solid #15803d',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  color: 'var(--text-main, #0f172a)',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => {
                setEditModalOpen(false);
                setEditingAccount(null);
              }}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                border: '1px solid var(--border-color, #cbd5e1)',
                backgroundColor: 'var(--bg-card, #ffffff)',
                color: 'var(--text-main, #0f172a)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              style={{
                padding: '9px 20px',
                borderRadius: 8,
                backgroundColor: '#15803d',
                color: '#ffffff',
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: savingEdit ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {savingEdit ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
              <span>{savingEdit ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL: Importar Extrato (OFX, CSV ou PDF)
         ======================================================== */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setSelectedAccountForImport(null);
          setImportStatementContent(null);
          setImportStatementFileName(null);
        }}
        title={`Importar Extrato - ${selectedAccountForImport?.name || 'Conta'}`}
        subtitle="Envie o extrato em formato .OFX, .CSV ou .PDF baixado no app do seu banco."
        icon={<UploadCloud size={22} color="#15803d" />}
        maxWidth="500px"
      >
        <form onSubmit={handleImportStatementSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              padding: '24px 16px',
              borderRadius: 12,
              backgroundColor: 'rgba(21, 128, 61, 0.04)',
              border: '2px dashed #15803d',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <input
              ref={modalFileInputRef}
              type="file"
              accept=".ofx,.OFX,.csv,.CSV,.pdf,.PDF"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleStatementFileSelect(file, true);
              }}
            />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span title="Extrato OFX"><FileCode size={26} color="#15803d" /></span>
              <span title="Planilha CSV"><FileSpreadsheet size={26} color="#0284c7" /></span>
              <span title="Extrato em PDF"><FileType size={26} color="#ea580c" /></span>
            </div>

            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
              {importStatementFileName ? (
                <span style={{ color: '#15803d' }}>
                  {importStatementFileName} ({importStatementFileType.toUpperCase()})
                </span>
              ) : (
                'Clique para selecionar o arquivo (.OFX, .CSV ou .PDF)'
              )}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>
              Compatível com Nubank, Inter, PicPay, Mercado Pago, Itaú, Bradesco, Santander e qualquer banco.
            </span>
            <button
              type="button"
              onClick={() => modalFileInputRef.current?.click()}
              style={{
                marginTop: 6,
                padding: '8px 18px',
                borderRadius: 8,
                backgroundColor: '#15803d',
                color: '#ffffff',
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {importStatementFileName ? 'Trocar Arquivo' : 'Escolher Arquivo do Dispositivo'}
            </button>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)', lineHeight: 1.5 }}>
            💡 <strong>Anti-duplicação inteligente:</strong> O CashBank detecta automaticamente transações que já foram importadas e insere apenas as novidades, evitando valores duplicados!
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => {
                setImportModalOpen(false);
                setSelectedAccountForImport(null);
                setImportStatementContent(null);
                setImportStatementFileName(null);
              }}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                border: '1px solid var(--border-color, #cbd5e1)',
                backgroundColor: 'var(--bg-card, #ffffff)',
                color: 'var(--text-main, #0f172a)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!importStatementContent || importing}
              style={{
                padding: '9px 20px',
                borderRadius: 8,
                backgroundColor: importStatementContent && !importing ? '#15803d' : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: importStatementContent && !importing ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {importing ? <RefreshCw size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              <span>{importing ? 'Processando Extrato...' : 'Confirmar Importação'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL: Confirmar Exclusão de Conta
         ======================================================== */}
      <Modal
        isOpen={Boolean(accountToDelete)}
        onClose={() => setAccountToDelete(null)}
        title="Excluir Conta Bancária"
        subtitle="Tem certeza de que deseja remover esta conta?"
        icon={<Trash2 size={22} color="#ef4444" />}
        maxWidth="440px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #64748b)', lineHeight: 1.5 }}>
            Ao excluir a conta <strong>{accountToDelete?.name}</strong>, todo o histórico de movimentações bancárias importadas desta conta também será removido.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setAccountToDelete(null)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid var(--border-color, #cbd5e1)',
                backgroundColor: 'var(--bg-card, #ffffff)',
                color: 'var(--text-main, #0f172a)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sim, Excluir Conta
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================
          MODAL: Manual de Extratos Bancários (100% Arquivos)
         ======================================================== */}
      <Modal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        title="Manual de Extratos Bancários"
        subtitle="Aprenda como exportar seus extratos em OFX, CSV ou PDF no app do seu banco."
        icon={<HelpCircle size={22} color="#15803d" />}
        maxWidth="680px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              gap: 8,
              overflowX: 'auto',
            }}
          >
            <button
              type="button"
              onClick={() => setManualTab('banks')}
              style={{
                padding: '8px 14px',
                border: 'none',
                backgroundColor: 'transparent',
                fontWeight: manualTab === 'banks' ? 700 : 500,
                color: manualTab === 'banks' ? '#15803d' : 'var(--text-secondary, #64748b)',
                borderBottom: `2px solid ${manualTab === 'banks' ? '#15803d' : 'transparent'}`,
                cursor: 'pointer',
                fontSize: 13,
                whiteSpace: 'nowrap',
              }}
            >
              📲 Como Exportar no Seu Banco
            </button>
            <button
              type="button"
              onClick={() => setManualTab('formats')}
              style={{
                padding: '8px 14px',
                border: 'none',
                backgroundColor: 'transparent',
                fontWeight: manualTab === 'formats' ? 700 : 500,
                color: manualTab === 'formats' ? '#15803d' : 'var(--text-secondary, #64748b)',
                borderBottom: `2px solid ${manualTab === 'formats' ? '#15803d' : 'transparent'}`,
                cursor: 'pointer',
                fontSize: 13,
                whiteSpace: 'nowrap',
              }}
            >
              📁 Formatos (OFX, CSV, PDF)
            </button>
            <button
              type="button"
              onClick={() => setManualTab('faq')}
              style={{
                padding: '8px 14px',
                border: 'none',
                backgroundColor: 'transparent',
                fontWeight: manualTab === 'faq' ? 700 : 500,
                color: manualTab === 'faq' ? '#15803d' : 'var(--text-secondary, #64748b)',
                borderBottom: `2px solid ${manualTab === 'faq' ? '#15803d' : 'transparent'}`,
                cursor: 'pointer',
                fontSize: 13,
                whiteSpace: 'nowrap',
              }}
            >
              💡 Dúvidas Frequentes
            </button>
          </div>

          {/* Tab Content: Como exportar nos bancos */}
          {manualTab === 'banks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, lineHeight: 1.5, color: 'var(--text-main, #0f172a)' }}>
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(130, 10, 209, 0.08)',
                  borderRadius: 10,
                  border: '1px solid rgba(130, 10, 209, 0.25)',
                }}
              >
                <div style={{ fontWeight: 700, color: '#820AD1', marginBottom: 4 }}>
                  🟣 Nubank
                </div>
                <ol style={{ paddingLeft: 18, margin: 0 }}>
                  <li>Abra o app do Nubank e toque na sua <strong>Conta</strong>.</li>
                  <li>Toque no botão <strong>"Pedir extrato"</strong>.</li>
                  <li>Selecione o mês desejado e escolha <strong>OFX</strong> (ou CSV / PDF).</li>
                  <li>O arquivo será enviado para o seu e-mail em segundos. Salve e envie no CashBank!</li>
                </ol>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(17, 199, 111, 0.08)',
                  borderRadius: 10,
                  border: '1px solid rgba(17, 199, 111, 0.25)',
                }}
              >
                <div style={{ fontWeight: 700, color: '#11C76F', marginBottom: 4 }}>
                  🟢 PicPay
                </div>
                <ol style={{ paddingLeft: 18, margin: 0 }}>
                  <li>Abra o aplicativo do PicPay e acesse a aba <strong>Extrato</strong>.</li>
                  <li>Toque no ícone de exportar/compartilhar extrato no topo.</li>
                  <li>Escolha <strong>OFX</strong>, <strong>CSV</strong> ou <strong>PDF</strong>.</li>
                  <li>Envie o arquivo no CashBank para computar movimentações e saldo automaticamente.</li>
                </ol>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(255, 122, 0, 0.08)',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 122, 0, 0.25)',
                }}
              >
                <div style={{ fontWeight: 700, color: '#FF7A00', marginBottom: 4 }}>
                  🟠 Banco Inter
                </div>
                <ol style={{ paddingLeft: 18, margin: 0 }}>
                  <li>Acesse o app ou Internet Banking do Banco Inter e vá em <strong>Extrato</strong>.</li>
                  <li>Escolha o período e toque em <strong>Exportar</strong>.</li>
                  <li>Selecione <strong>OFX</strong>, <strong>PDF</strong> ou <strong>CSV</strong>.</li>
                </ol>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(0, 158, 227, 0.08)',
                  borderRadius: 10,
                  border: '1px solid rgba(0, 158, 227, 0.25)',
                }}
              >
                <div style={{ fontWeight: 700, color: '#009EE3', marginBottom: 4 }}>
                  🔵 Mercado Pago
                </div>
                <ol style={{ paddingLeft: 18, margin: 0 }}>
                  <li>No app ou site do Mercado Pago, vá em <strong>Seu dinheiro</strong> ou <strong>Extrato</strong>.</li>
                  <li>Clique em <strong>Baixar extrato</strong> e escolha o período em PDF, CSV ou OFX.</li>
                  <li>Importe o arquivo no CashBank!</li>
                </ol>
              </div>

              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-app, #f8fafc)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--text-secondary, #64748b)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                }}
              >
                🏦 <strong>Outros bancos (Itaú, Bradesco, Santander, Caixa, C6, BB):</strong> Basta acessar o Internet Banking pelo computador ou app, ir em Extrato, escolher o período e clicar em <em>Exportar para Money/OFX</em>, <em>PDF</em> ou <em>CSV</em>.
              </div>
            </div>
          )}

          {/* Tab Content: Formatos */}
          {manualTab === 'formats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13, lineHeight: 1.5, color: 'var(--text-main, #0f172a)' }}>
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(21, 128, 61, 0.08)',
                  borderRadius: 10,
                  border: '1px solid rgba(21, 128, 61, 0.25)',
                }}
              >
                <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileCode size={16} /> Arquivos OFX (.ofx) - Mais Recomendado
                </div>
                <p style={{ margin: '0 0 4px 0' }}>
                  O OFX é o padrão bancário universal. Ele traz as datas, descrições e identificadores únicos de cada transação com 100% de precisão.
                </p>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(2, 132, 199, 0.08)',
                  borderRadius: 10,
                  border: '1px solid rgba(2, 132, 199, 0.25)',
                }}
              >
                <div style={{ fontWeight: 700, color: '#0284c7', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileSpreadsheet size={16} /> Planilhas CSV (.csv)
                </div>
                <p style={{ margin: '0 0 4px 0' }}>
                  Se o seu banco só disponibiliza planilhas em CSV, o CashBank analisa o separador e as colunas de data, histórico, saldo e valor automaticamente.
                </p>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(234, 88, 12, 0.08)',
                  borderRadius: 10,
                  border: '1px solid rgba(234, 88, 12, 0.25)',
                }}
              >
                <div style={{ fontWeight: 700, color: '#ea580c', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileType size={16} /> Extratos em PDF (.pdf) - Leitura por IA
                </div>
                <p style={{ margin: '0 0 4px 0' }}>
                  Baixou o extrato em PDF? O CashBank utiliza IA (Google Gemini) para ler as tabelas e linhas do documento, extraindo as transações e o saldo com perfeição.
                </p>
              </div>
            </div>
          )}

          {/* Tab Content: FAQ */}
          {manualTab === 'faq' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, lineHeight: 1.5, color: 'var(--text-main, #0f172a)' }}>
              <div>
                <strong>Como ajustar o saldo de uma conta diretamente?</strong>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary, #64748b)' }}>
                  Basta clicar no botão de lápis (<strong>Editar Conta</strong>) no card do banco e digitar seu saldo real no campo "Saldo Atual (R$)". O sistema salvará instantaneamente!
                </p>
              </div>

              <div>
                <strong>O que acontece se eu importar o mesmo extrato mais de uma vez?</strong>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary, #64748b)' }}>
                  O sistema possui <strong>anti-duplicação inteligente</strong>. Ele compara o código identificador bancário (FITID) e a assinatura da movimentação. Nenhuma despesa ou receita será duplicada!
                </p>
              </div>

              <div>
                <strong>Meus dados bancários estão seguros?</strong>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary, #64748b)' }}>
                  Sim, 100%! Como não há conexão por API ou senhas, você não expõe credenciais de acesso ao seu banco. O CashBank apenas lê os arquivos de extrato que você decide importar.
                </p>
              </div>
            </div>
          )}

          {/* Close button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setManualModalOpen(false)}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                backgroundColor: '#15803d',
                color: '#ffffff',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
