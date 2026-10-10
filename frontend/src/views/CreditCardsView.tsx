import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Check,
  Clock,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Search,
  AlertCircle,
  TrendingDown,
  Info,
  DollarSign,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { MonthSelector } from '../components/MonthSelector';
import { MonthItem, getInitialMonthItem, MONTH_LABELS } from '../utils/dateUtils';

interface CreditCardInfo {
  id: string;
  name: string;
  limit: number;
  dueDay: number;
  closingDay: number;
  color: string;
  brand: string;
  digits: string | null;
}

interface InstallmentItem {
  id: string;
  purchaseId: string;
  description: string;
  category: string;
  purchaseDate: string;
  totalPurchaseAmount: number;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
}

interface CardOverviewItem {
  card: CreditCardInfo;
  installments: InstallmentItem[];
  installmentsSum: number;
  manualAdjustment: number | null;
  totalAmount: number;
  isPaid: boolean;
  paidAt: string | null;
}

interface InvoicesOverviewResponse {
  month: number;
  year: number;
  summary: {
    totalAllCards: number;
    paidAllCards: number;
    pendingAllCards: number;
    purchasesCount: number;
    cardsCount: number;
  };
  cards: CardOverviewItem[];
}

const CARD_COLORS = [
  { label: 'Roxo Nubank', value: 'linear-gradient(135deg, #820ad1 0%, #4c0677 100%)', badge: '#820ad1' },
  { label: 'Laranja Inter', value: 'linear-gradient(135deg, #ff7a00 0%, #e65100 100%)', badge: '#ff7a00' },
  { label: 'Preto Titanium', value: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', badge: '#1e293b' },
  { label: 'Azul Safira', value: 'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)', badge: '#2563eb' },
  { label: 'Dourado Gold', value: 'linear-gradient(135deg, #d97706 0%, #78350f 100%)', badge: '#d97706' },
  { label: 'Verde Esmeralda', value: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)', badge: '#059669' },
  { label: 'Vermelho Ruby', value: 'linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)', badge: '#dc2626' },
  { label: 'Prata Platinum', value: 'linear-gradient(135deg, #475569 0%, #334155 100%)', badge: '#475569' },
];

const CARD_BRANDS = ['Mastercard', 'Visa', 'Elo', 'American Express', 'Hipercard', 'Outro'];

const CATEGORIES = [
  'Alimentação',
  'Supermercado',
  'Transporte',
  'Lazer',
  'Tecnologia',
  'Vestuário',
  'Saúde',
  'Educação',
  'Viagem',
  'Assinatura',
  'Casa',
  'Outros',
];

export const CreditCardsView: React.FC<{ onDataChanged?: () => void }> = ({ onDataChanged }) => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<MonthItem>(() => getInitialMonthItem(user?.createdAt));
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Overview data
  const [overview, setOverview] = useState<InvoicesOverviewResponse | null>(null);
  const [selectedCardFilter, setSelectedCardFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardInfo | null>(null);
  const [deletingCard, setDeletingCard] = useState<CreditCardInfo | null>(null);
  const [deletingPurchase, setDeletingPurchase] = useState<InstallmentItem | null>(null);
  const [adjustingCardItem, setAdjustingCardItem] = useState<CardOverviewItem | null>(null);

  // Purchase Form State
  const [purchaseCardId, setPurchaseCardId] = useState('');
  const [purchaseDesc, setPurchaseDesc] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseInstallments, setPurchaseInstallments] = useState('1');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [purchaseCategory, setPurchaseCategory] = useState('Alimentação');

  // Card Form State
  const [cardName, setCardName] = useState('');
  const [cardLimit, setCardLimit] = useState('');
  const [cardDueDay, setCardDueDay] = useState('10');
  const [cardClosingDay, setCardClosingDay] = useState('3');
  const [cardBrand, setCardBrand] = useState('Mastercard');
  const [cardColor, setCardColor] = useState(CARD_COLORS[0].value);
  const [cardDigits, setCardDigits] = useState('');

  // Invoice Manual Adjustment Form State
  const [adjustAmountInput, setAdjustAmountInput] = useState('');
  const [adjustType, setAdjustType] = useState<'total' | 'diff'>('total');

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await api.getCreditCardInvoices(selectedMonth.month, selectedMonth.year);
      setOverview(res);
      // Auto select first card for purchase modal if not set
      if (res.cards && res.cards.length > 0 && !purchaseCardId) {
        setPurchaseCardId(res.cards[0].card.id);
      }
    } catch (err) {
      console.error('Failed to load credit cards overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [selectedMonth]);

  // Format currency helper
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // --- Handlers: Card CRUD ---
  const handleOpenNewCardModal = () => {
    setEditingCard(null);
    setCardName('');
    setCardLimit('');
    setCardDueDay('10');
    setCardClosingDay('3');
    setCardBrand('Mastercard');
    setCardColor(CARD_COLORS[0].value);
    setCardDigits('');
    setIsCardModalOpen(true);
  };

  const handleOpenEditCardModal = (card: CreditCardInfo) => {
    setEditingCard(card);
    setCardName(card.name);
    setCardLimit(String(card.limit));
    setCardDueDay(String(card.dueDay));
    setCardClosingDay(String(card.closingDay));
    setCardBrand(card.brand);
    setCardColor(card.color);
    setCardDigits(card.digits || '');
    setIsCardModalOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName || !cardLimit) return;

    try {
      setActionLoading(true);
      const payload = {
        name: cardName.trim(),
        limit: parseFloat(cardLimit.replace(',', '.')),
        dueDay: parseInt(cardDueDay, 10),
        closingDay: parseInt(cardClosingDay, 10),
        brand: cardBrand,
        color: cardColor,
        digits: cardDigits ? cardDigits.trim().slice(-4) : null,
      };

      if (editingCard) {
        await api.updateCreditCard(editingCard.id, payload);
      } else {
        await api.createCreditCard(payload);
      }

      setIsCardModalOpen(false);
      await fetchOverview();
      onDataChanged?.();
    } catch (err) {
      console.error('Error saving credit card:', err);
      alert('Erro ao salvar informações do cartão.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCardConfirm = async () => {
    if (!deletingCard) return;
    try {
      setActionLoading(true);
      await api.deleteCreditCard(deletingCard.id);
      setDeletingCard(null);
      await fetchOverview();
      onDataChanged?.();
    } catch (err) {
      console.error('Error deleting card:', err);
      alert('Erro ao excluir cartão.');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Handlers: Purchase Create & Delete ---
  const handleOpenPurchaseModal = (targetCardId?: string) => {
    if (targetCardId) {
      setPurchaseCardId(targetCardId);
    } else if (overview?.cards?.length) {
      setPurchaseCardId(overview.cards[0].card.id);
    }
    setPurchaseDesc('');
    setPurchaseAmount('');
    setPurchaseInstallments('1');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPurchaseCategory('Alimentação');
    setIsPurchaseModalOpen(true);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseCardId || !purchaseDesc || !purchaseAmount) return;

    try {
      setActionLoading(true);
      const payload = {
        creditCardId: purchaseCardId,
        description: purchaseDesc.trim(),
        totalAmount: parseFloat(purchaseAmount.replace(',', '.')),
        installmentsCount: parseInt(purchaseInstallments, 10) || 1,
        purchaseDate,
        category: purchaseCategory,
      };

      await api.createCreditCardPurchase(payload);
      setIsPurchaseModalOpen(false);
      await fetchOverview();
      onDataChanged?.();
    } catch (err) {
      console.error('Error creating purchase:', err);
      alert('Erro ao registrar compra no cartão.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePurchaseConfirm = async () => {
    if (!deletingPurchase) return;
    try {
      setActionLoading(true);
      await api.deleteCreditCardPurchase(deletingPurchase.purchaseId);
      setDeletingPurchase(null);
      await fetchOverview();
      onDataChanged?.();
    } catch (err) {
      console.error('Error deleting purchase:', err);
      alert('Erro ao remover compra.');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Handlers: Invoice Toggle Payment & Adjustment ---
  const handleToggleInvoicePayment = async (item: CardOverviewItem) => {
    try {
      const nextStatus = !item.isPaid;
      // Optimistic update
      setOverview((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cards: prev.cards.map((c) => (c.card.id === item.card.id ? { ...c, isPaid: nextStatus } : c)),
        };
      });

      await api.toggleCreditCardInvoicePayment(item.card.id, {
        month: selectedMonth.month,
        year: selectedMonth.year,
        isPaid: nextStatus,
      });

      await fetchOverview();
      onDataChanged?.();
    } catch (err) {
      console.error('Error toggling payment status:', err);
      await fetchOverview();
    }
  };

  const handleOpenAdjustModal = (item: CardOverviewItem) => {
    setAdjustingCardItem(item);
    setAdjustAmountInput(String(item.totalAmount));
    setAdjustType('total');
  };

  const handleSaveInvoiceAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingCardItem) return;

    try {
      setActionLoading(true);
      const parsedVal = parseFloat(adjustAmountInput.replace(',', '.'));
      let manualAdjustment: number | null = null;

      if (!isNaN(parsedVal)) {
        if (adjustType === 'total') {
          // manualAdjustment = targetTotal - installmentsSum
          manualAdjustment = Math.round((parsedVal - adjustingCardItem.installmentsSum) * 100) / 100;
        } else {
          manualAdjustment = parsedVal;
        }
      }

      await api.updateCreditCardInvoiceAdjustment(adjustingCardItem.card.id, {
        month: selectedMonth.month,
        year: selectedMonth.year,
        manualAdjustment,
      });

      setAdjustingCardItem(null);
      await fetchOverview();
      onDataChanged?.();
    } catch (err) {
      console.error('Error adjusting invoice:', err);
      alert('Erro ao atualizar ajuste da fatura.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetInvoiceAdjustment = async () => {
    if (!adjustingCardItem) return;

    try {
      setActionLoading(true);
      await api.updateCreditCardInvoiceAdjustment(adjustingCardItem.card.id, {
        month: selectedMonth.month,
        year: selectedMonth.year,
        manualAdjustment: null,
      });

      setAdjustingCardItem(null);
      await fetchOverview();
      onDataChanged?.();
    } catch (err) {
      console.error('Error resetting invoice adjustment:', err);
      alert('Erro ao restaurar ajuste.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered installments across cards
  const allCards = overview?.cards || [];
  const filteredCards =
    selectedCardFilter === 'all' ? allCards : allCards.filter((c) => c.card.id === selectedCardFilter);

  const allFilteredInstallments: Array<{ installment: InstallmentItem; card: CreditCardInfo }> = [];
  filteredCards.forEach((c) => {
    c.installments.forEach((ins) => {
      allFilteredInstallments.push({ installment: ins, card: c.card });
    });
  });

  const searchedInstallments = allFilteredInstallments.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.installment.description.toLowerCase().includes(q) ||
      item.installment.category.toLowerCase().includes(q) ||
      item.card.name.toLowerCase().includes(q)
    );
  });

  // Calculate live preview of installments in purchase modal
  const parsedPreviewAmount = parseFloat(purchaseAmount.replace(',', '.')) || 0;
  const parsedPreviewCount = parseInt(purchaseInstallments, 10) || 1;
  const previewInstallmentValue = parsedPreviewCount > 0 ? parsedPreviewAmount / parsedPreviewCount : 0;

  return (
    <div className="content-container animate-fade-in">
      {/* Top Header */}
      <div className="view-header-row">
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: '#64748b',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            MEIOS DE PAGAMENTO
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
            Cartões de crédito
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted, #64748b)', marginTop: 4, margin: 0 }}>
            Gerencie limites, faturas mensais e compras parceladas com distribuição automática nas despesas fixas.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => handleOpenPurchaseModal()}
            className="btn-primary"
            style={{ gap: 8 }}
            disabled={!allCards.length}
            title={!allCards.length ? 'Cadastre um cartão primeiro' : 'Lançar nova compra'}
          >
            <Plus size={18} /> Nova compra no cartão
          </button>
          <button onClick={handleOpenNewCardModal} className="btn-secondary" style={{ gap: 8 }}>
            <CreditCard size={18} /> Novo cartão
          </button>
        </div>
      </div>

      {/* Month Selector Bar */}
      <div style={{ marginTop: 20 }}>
        <MonthSelector selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />
      </div>

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginTop: 20,
        }}
      >
        {/* KPI 1: Total Faturas do Mês */}
        <div className="card" style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
              Total das faturas ({selectedMonth.label}/{selectedMonth.year})
            </span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CreditCard size={20} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: 12 }}>
            {formatCurrency(overview?.summary?.totalAllCards || 0)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', marginTop: 4 }}>
            {overview?.summary?.cardsCount || 0} cartão(ões) cadastrado(s)
          </div>
        </div>

        {/* KPI 2: Faturas Pagas */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
              Faturas já pagas
            </span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={20} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a', marginTop: 12 }}>
            {formatCurrency(overview?.summary?.paidAllCards || 0)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', marginTop: 4 }}>
            Baixadas e integradas ao fluxo
          </div>
        </div>

        {/* KPI 3: Faturas Pendentes */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
              Faturas em aberto
            </span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: 'rgba(234, 88, 12, 0.1)',
                color: '#ea580c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={20} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#ea580c', marginTop: 12 }}>
            {formatCurrency(overview?.summary?.pendingAllCards || 0)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', marginTop: 4 }}>
            Aparecem como despesas fixas a pagar
          </div>
        </div>

        {/* KPI 4: Parcelas Cobradas */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
              Parcelas no mês
            </span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={20} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: 12 }}>
            {overview?.summary?.purchasesCount || 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', marginTop: 4 }}>
            Itens faturados em {selectedMonth.label}
          </div>
        </div>
      </div>

      {/* Digital Cards Section */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
              Seus cartões de crédito
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted, #64748b)', margin: '2px 0 0' }}>
              Valores a pagar calculados com base nas compras e ajustes do mês.
            </p>
          </div>
          {allCards.length > 0 && (
            <button
              onClick={handleOpenNewCardModal}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#15803d',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Plus size={16} /> Adicionar cartão
            </button>
          )}
        </div>

        {loading ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 10px' }} />
            Carregando cartões e faturas...
          </div>
        ) : allCards.length === 0 ? (
          <div
            className="card"
            style={{
              padding: 40,
              textAlign: 'center',
              border: '2px dashed var(--border-color, #e2e8f0)',
              backgroundColor: 'transparent',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: 'rgba(21, 128, 61, 0.1)',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CreditCard size={30} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-main, #0f172a)' }}>
              Nenhum cartão cadastrado ainda
            </h3>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-muted, #64748b)',
                maxWidth: 420,
                margin: '0 auto 20px',
                lineHeight: 1.5,
              }}
            >
              Cadastre seus cartões de crédito com dia de fechamento e vencimento. Suas faturas mensais e parcelas serão
              calculadas e distribuídas automaticamente.
            </p>
            <button onClick={handleOpenNewCardModal} className="btn-primary">
              <Plus size={18} /> Cadastrar meu primeiro cartão
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 20,
            }}
          >
            {allCards.map((item) => {
              const card = item.card;
              const limitUsedPct =
                card.limit > 0 ? Math.min(Math.round((item.totalAmount / card.limit) * 100), 100) : 0;
              const isSelected = selectedCardFilter === card.id;

              return (
                <div
                  key={card.id}
                  className="card"
                  style={{
                    padding: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    border: isSelected ? '2px solid #16a34a' : '1px solid var(--border-color, #e2e8f0)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Digital Card Graphic Header */}
                  <div
                    style={{
                      background: card.color || CARD_COLORS[0].value,
                      padding: '20px 22px',
                      color: '#ffffff',
                      position: 'relative',
                      minHeight: 150,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: 'inset 0 -10px 20px rgba(0,0,0,0.15)',
                    }}
                  >
                    {/* Card Top Row: Brand & Chip */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Realistic Chip Icon */}
                        <div
                          style={{
                            width: 32,
                            height: 24,
                            borderRadius: 4,
                            background: 'linear-gradient(135deg, #fef08a 0%, #ca8a04 100%)',
                            border: '1px solid rgba(0,0,0,0.2)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          }}
                        />
                        <span
                          style={{
                            fontSize: 10,
                            letterSpacing: '1px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            opacity: 0.85,
                          }}
                        >
                          CASHBANK
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          background: 'rgba(255,255,255,0.2)',
                          padding: '2px 8px',
                          borderRadius: 6,
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        {card.brand}
                      </span>
                    </div>

                    {/* Card Middle: Digits & Name */}
                    <div style={{ marginTop: 14 }}>
                      <div
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 15,
                          letterSpacing: '3px',
                          fontWeight: 700,
                          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                        }}
                      >
                        •••• •••• •••• {card.digits || '••••'}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          marginTop: 4,
                          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        }}
                      >
                        {card.name}
                      </div>
                    </div>

                    {/* Card Bottom: Closing & Due Day */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 12,
                        fontSize: 11,
                        opacity: 0.9,
                      }}
                    >
                      <div>
                        Fecha dia <strong>{card.closingDay}</strong>
                      </div>
                      <div>
                        Vence dia <strong>{card.dueDay}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Card Body: Fatura deste mês, limite, status */}
                  <div style={{ padding: 18, display: 'flex', flexDirection: 'column', flex: 1, gap: 14 }}>
                    {/* Invoice Value & Status */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>
                          Fatura {selectedMonth.label}/{selectedMonth.year}
                        </span>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: 2 }}>
                          {formatCurrency(item.totalAmount)}
                        </div>
                        {item.manualAdjustment !== null && item.manualAdjustment !== 0 && (
                          <div style={{ fontSize: 11, color: '#2563eb', marginTop: 2 }}>
                            Parcelas: {formatCurrency(item.installmentsSum)} {item.manualAdjustment > 0 ? '+' : '-'} {formatCurrency(Math.abs(item.manualAdjustment))}
                          </div>
                        )}
                      </div>

                      <div>
                        <button
                          onClick={() => handleToggleInvoicePayment(item)}
                          className={item.isPaid ? 'badge-paid' : 'badge-pending'}
                          style={{ cursor: 'pointer', fontSize: 11, padding: '4px 10px' }}
                          title="Clique para alternar status pago/pendente"
                        >
                          {item.isPaid ? (
                            <>
                              <Check size={12} /> Fatura Paga
                            </>
                          ) : (
                            <>
                              <Clock size={12} /> Em Aberto
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Limit Progress Bar */}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 11,
                          color: 'var(--text-muted, #64748b)',
                          marginBottom: 5,
                        }}
                      >
                        <span>Limite utilizado ({limitUsedPct}%)</span>
                        <span>Limite total: {formatCurrency(card.limit)}</span>
                      </div>
                      <div
                        style={{
                          height: 7,
                          backgroundColor: 'var(--border-color, #f1f5f9)',
                          borderRadius: 999,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${limitUsedPct}%`,
                            backgroundColor: limitUsedPct > 80 ? '#ef4444' : limitUsedPct > 50 ? '#f59e0b' : '#15803d',
                            borderRadius: 999,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 12,
                        borderTop: '1px solid var(--border-color, #f1f5f9)',
                        marginTop: 'auto',
                      }}
                    >
                      <button
                        onClick={() => handleOpenPurchaseModal(card.id)}
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#15803d',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: 0,
                        }}
                      >
                        <Plus size={14} /> Nova compra
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => handleOpenAdjustModal(item)}
                          title="Ajustar valor da fatura deste mês"
                          style={{
                            color: 'var(--text-muted, #64748b)',
                            padding: 6,
                            borderRadius: 6,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <SlidersHorizontal size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenEditCardModal(card)}
                          title="Editar cartão"
                          style={{
                            color: 'var(--text-muted, #64748b)',
                            padding: 6,
                            borderRadius: 6,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeletingCard(card)}
                          title="Excluir cartão"
                          style={{
                            color: 'var(--text-muted, #64748b)',
                            padding: 6,
                            borderRadius: 6,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoices & Installments Details List Section */}
      <div style={{ marginTop: 40 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: 0 }}>
              Compras faturadas em {selectedMonth.label}/{selectedMonth.year}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted, #64748b)', margin: '2px 0 0' }}>
              Compras à vista ou parceladas que compõem as faturas deste mês.
            </p>
          </div>

          {/* Filter Bar & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Filter by Card Tabs */}
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: 'var(--bg-card, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: 8,
                padding: 3,
                gap: 4,
              }}
            >
              <button
                onClick={() => setSelectedCardFilter('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: selectedCardFilter === 'all' ? '#15803d' : 'transparent',
                  color: selectedCardFilter === 'all' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                  transition: 'all 0.15s ease',
                }}
              >
                Todos ({allCards.length})
              </button>
              {allCards.map((c) => (
                <button
                  key={c.card.id}
                  onClick={() => setSelectedCardFilter(c.card.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: selectedCardFilter === c.card.id ? '#15803d' : 'transparent',
                    color: selectedCardFilter === c.card.id ? '#ffffff' : 'var(--text-secondary, #64748b)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {c.card.name}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Buscar compra..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{
                  paddingLeft: 32,
                  paddingRight: 12,
                  paddingTop: 6,
                  paddingBottom: 6,
                  fontSize: 12,
                  width: 180,
                  height: 34,
                }}
              />
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted, #94a3b8)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="card table-desktop-wrapper" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', backgroundColor: 'var(--bg-app, #f8fafc)' }}>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #64748b)' }}>
                    COMPRA / DESCRIÇÃO
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #64748b)' }}>
                    CARTÃO
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #64748b)' }}>
                    CATEGORIA
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #64748b)' }}>
                    DATA COMPRA
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #64748b)' }}>
                    PARCELA
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #64748b)', textAlign: 'right' }}>
                    VALOR PARCELA
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #64748b)', textAlign: 'right' }}>
                    VALOR TOTAL
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #64748b)', textAlign: 'right' }}>
                    AÇÕES
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
                      <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 6px' }} />
                      Carregando compras do mês...
                    </td>
                  </tr>
                ) : searchedInstallments.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      Nenhuma compra faturada para este mês com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  searchedInstallments.map(({ installment: ins, card }) => {
                    const isInstallment = ins.totalInstallments > 1;
                    const dateObj = new Date(ins.purchaseDate);
                    const formattedDate = !isNaN(dateObj.getTime())
                      ? `${String(dateObj.getUTCDate()).padStart(2, '0')}/${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}/${dateObj.getUTCFullYear()}`
                      : '-';

                    return (
                      <tr key={ins.id} className="data-table-row">
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                          {ins.description}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--text-main, #0f172a)',
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: card.color || '#15803d',
                              }}
                            />
                            {card.name}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor: 'var(--bg-app, #f1f5f9)',
                              color: 'var(--text-secondary, #475569)',
                            }}
                          >
                            {ins.category}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>
                          {formattedDate}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              backgroundColor: isInstallment ? 'rgba(37, 99, 235, 0.1)' : 'rgba(21, 128, 61, 0.1)',
                              color: isInstallment ? '#2563eb' : '#15803d',
                            }}
                          >
                            {isInstallment ? `${ins.installmentNumber} de ${ins.totalInstallments}` : 'À vista (1x)'}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '14px 20px',
                            fontWeight: 700,
                            color: 'var(--text-main, #0f172a)',
                            textAlign: 'right',
                          }}
                        >
                          {formatCurrency(ins.amount)}
                        </td>
                        <td
                          style={{
                            padding: '14px 20px',
                            color: 'var(--text-muted, #64748b)',
                            textAlign: 'right',
                            fontSize: 13,
                          }}
                        >
                          {formatCurrency(ins.totalPurchaseAmount)}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <button
                            onClick={() => setDeletingPurchase(ins)}
                            title="Excluir compra e parcelas"
                            style={{
                              color: '#94a3b8',
                              padding: 6,
                              borderRadius: 6,
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards (Responsive View) */}
        <div className="mobile-cards-wrapper">
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
              Carregando compras...
            </div>
          ) : searchedInstallments.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Nenhuma compra faturada para este mês.
            </div>
          ) : (
            searchedInstallments.map(({ installment: ins, card }) => {
              const isInstallment = ins.totalInstallments > 1;
              const dateObj = new Date(ins.purchaseDate);
              const formattedDate = !isNaN(dateObj.getTime())
                ? `${String(dateObj.getUTCDate()).padStart(2, '0')}/${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}`
                : '-';

              return (
                <div key={ins.id} className="expense-mobile-item">
                  <div className="expense-mobile-header">
                    <div className="expense-mobile-main">
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: card.color || '#15803d',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <CreditCard size={18} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span className="expense-mobile-title">{ins.description}</span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              backgroundColor: 'var(--bg-item, #f1f5f9)',
                              color: 'var(--text-muted, #475569)',
                            }}
                          >
                            {card.name}
                          </span>
                        </div>
                        <div className="expense-mobile-subtitle">
                          <span>
                            {formattedDate} • {ins.category} •{' '}
                            <strong>{isInstallment ? `${ins.installmentNumber} de ${ins.totalInstallments}` : '1x'}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                        {formatCurrency(ins.amount)}
                      </div>
                      {isInstallment && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted, #64748b)', marginTop: 2 }}>
                          Total: {formatCurrency(ins.totalPurchaseAmount)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="expense-mobile-footer" style={{ justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setDeletingPurchase(ins)}
                      title="Excluir compra"
                      style={{
                        color: '#ef4444',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        padding: '4px 8px',
                      }}
                    >
                      <Trash2 size={14} /> Excluir compra
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* =========================================================
         MODAL 1: NOVA COMPRA NO CARTÃO
         ========================================================= */}
      <Modal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        title="Nova compra no cartão"
        subtitle="Informe os dados da compra e as parcelas serão distribuídas automaticamente."
        icon={<CreditCard size={22} />}
        maxWidth="500px"
      >
        <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Card Selection */}
          <div>
            <label className="form-label">Cartão utilizado</label>
            <select
              value={purchaseCardId}
              onChange={(e) => setPurchaseCardId(e.target.value)}
              required
              className="input-field"
            >
              {allCards.map((c) => (
                <option key={c.card.id} value={c.card.id}>
                  {c.card.name} (Fecha dia {c.card.closingDay} • Vence dia {c.card.dueDay})
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Descrição da compra</label>
            <input
              type="text"
              required
              placeholder="Ex: Passagens aéreas, Celular, Supermercado"
              value={purchaseDesc}
              onChange={(e) => setPurchaseDesc(e.target.value)}
              className="input-field"
              autoFocus
            />
          </div>

          {/* Amount & Installments */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Valor total da compra</label>
              <div className="currency-input-wrapper">
                <span className="currency-input-prefix">R$</span>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  className="currency-input-field"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Quantidade de parcelas</label>
              <select
                value={purchaseInstallments}
                onChange={(e) => setPurchaseInstallments(e.target.value)}
                className="input-field"
              >
                <option value="1">1x à vista</option>
                {Array.from({ length: 47 }, (_, i) => i + 2).map((num) => (
                  <option key={num} value={num}>
                    {num}x parcelado
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Installment Preview Pill */}
          {parsedPreviewAmount > 0 && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                fontSize: 12,
                color: '#1e40af',
                lineHeight: 1.5,
              }}
            >
              ✨ <strong>Previsão das parcelas:</strong>{' '}
              {parsedPreviewCount === 1 ? (
                <>Cobrança única de {formatCurrency(parsedPreviewAmount)} à vista na fatura.</>
              ) : (
                <>
                  {parsedPreviewCount}x parcelas de aproximadamente{' '}
                  <strong>{formatCurrency(previewInstallmentValue)}</strong> distribuídas mês a mês.
                </>
              )}
            </div>
          )}

          {/* Purchase Date & Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Data da compra</label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="form-label">Categoria</label>
              <select
                value={purchaseCategory}
                onChange={(e) => setPurchaseCategory(e.target.value)}
                className="input-field"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" className="btn-secondary" onClick={() => setIsPurchaseModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Salvando...' : 'Salvar compra'}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
         MODAL 2: NOVO CARTÃO / EDITAR CARTÃO
         ========================================================= */}
      <Modal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        title={editingCard ? 'Editar cartão de crédito' : 'Cadastrar novo cartão'}
        subtitle="Defina o nome, limite, bandeira e dias de fechamento e vencimento."
        icon={<CreditCard size={22} />}
        maxWidth="500px"
      >
        <form onSubmit={handleSaveCard} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Card Name */}
          <div>
            <label className="form-label">Nome do cartão</label>
            <input
              type="text"
              required
              placeholder="Ex: Nubank Ultravioleta, Inter Black, C6 Carbon"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              className="input-field"
              autoFocus
            />
          </div>

          {/* Limit & Digits */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
            <div>
              <label className="form-label">Limite total do cartão</label>
              <div className="currency-input-wrapper">
                <span className="currency-input-prefix">R$</span>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={cardLimit}
                  onChange={(e) => setCardLimit(e.target.value)}
                  className="currency-input-field"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Últimos 4 dígitos <span style={{ color: '#94a3b8' }}>(opc.)</span></label>
              <input
                type="text"
                maxLength={4}
                placeholder="Ex: 4321"
                value={cardDigits}
                onChange={(e) => setCardDigits(e.target.value.replace(/\D/g, ''))}
                className="input-field"
              />
            </div>
          </div>

          {/* Closing Day & Due Day */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Dia de fechamento</label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={cardClosingDay}
                onChange={(e) => setCardClosingDay(e.target.value)}
                className="input-field"
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted, #64748b)', marginTop: 2, display: 'block' }}>
                Compras após este dia caem no próximo mês
              </span>
            </div>

            <div>
              <label className="form-label">Dia de vencimento</label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={cardDueDay}
                onChange={(e) => setCardDueDay(e.target.value)}
                className="input-field"
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted, #64748b)', marginTop: 2, display: 'block' }}>
                Dia limite de pagamento da fatura
              </span>
            </div>
          </div>

          {/* Brand */}
          <div>
            <label className="form-label">Bandeira</label>
            <select
              value={cardBrand}
              onChange={(e) => setCardBrand(e.target.value)}
              className="input-field"
            >
              {CARD_BRANDS.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          {/* Color Presets */}
          <div>
            <label className="form-label">Tema visual do cartão</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 4 }}>
              {CARD_COLORS.map((c) => {
                const isSelected = cardColor === c.value;
                return (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setCardColor(c.value)}
                    style={{
                      height: 42,
                      borderRadius: 8,
                      background: c.value,
                      border: isSelected ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.1)',
                      outline: isSelected ? '2px solid #16a34a' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 700,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    }}
                    title={c.label}
                  >
                    {isSelected && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" className="btn-secondary" onClick={() => setIsCardModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Salvando...' : editingCard ? 'Atualizar cartão' : 'Cadastrar cartão'}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
         MODAL 3: AJUSTE MANUAL DA FATURA DO MÊS
         ========================================================= */}
      <Modal
        isOpen={!!adjustingCardItem}
        onClose={() => setAdjustingCardItem(null)}
        title="Ajustar valor da fatura"
        subtitle={`Defina o valor a pagar de ${selectedMonth.label}/${selectedMonth.year} para o cartão ${adjustingCardItem?.card.name}.`}
        icon={<SlidersHorizontal size={22} />}
        maxWidth="460px"
      >
        <form onSubmit={handleSaveInvoiceAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              backgroundColor: 'var(--bg-app, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            <div>
              Soma das parcelas registradas neste mês:{' '}
              <strong>{formatCurrency(adjustingCardItem?.installmentsSum || 0)}</strong>
            </div>
            {adjustingCardItem?.manualAdjustment !== null && adjustingCardItem?.manualAdjustment !== undefined && adjustingCardItem.manualAdjustment !== 0 && (
              <div style={{ color: '#2563eb', marginTop: 4 }}>
                Ajuste manual atual:{' '}
                <strong>
                  {adjustingCardItem.manualAdjustment > 0 ? '+' : ''}
                  {formatCurrency(adjustingCardItem.manualAdjustment)}
                </strong>
              </div>
            )}
          </div>

          <div>
            <label className="form-label">Valor total final da fatura deste mês</label>
            <div className="currency-input-wrapper">
              <span className="currency-input-prefix">R$</span>
              <input
                type="text"
                required
                value={adjustAmountInput}
                onChange={(e) => setAdjustAmountInput(e.target.value)}
                className="currency-input-field"
                style={{ fontSize: 18, fontWeight: 700 }}
                autoFocus
              />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted, #64748b)', marginTop: 4, display: 'block' }}>
              💡 Você pode informar o valor fechado exato da fatura para este mês. Este valor será refletido
              automaticamente na tela de Despesas Fixas.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            {adjustingCardItem?.manualAdjustment !== null && adjustingCardItem?.manualAdjustment !== undefined && adjustingCardItem.manualAdjustment !== 0 ? (
              <button
                type="button"
                onClick={handleResetInvoiceAdjustment}
                disabled={actionLoading}
                style={{
                  fontSize: 12,
                  color: '#dc2626',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #fecaca',
                  backgroundColor: '#fef2f2',
                }}
              >
                Restaurar soma real
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-secondary" onClick={() => setAdjustingCardItem(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={actionLoading}>
                {actionLoading ? 'Salvando...' : 'Salvar fatura'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Card Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingCard}
        onClose={() => setDeletingCard(null)}
        onConfirm={handleDeleteCardConfirm}
        title="Excluir cartão de crédito"
        itemDescription={deletingCard?.name}
        loading={actionLoading}
      />

      {/* Delete Purchase Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingPurchase}
        onClose={() => setDeletingPurchase(null)}
        onConfirm={handleDeletePurchaseConfirm}
        title="Excluir compra no cartão"
        itemDescription={deletingPurchase?.description}
        loading={actionLoading}
      />
    </div>
  );
};
