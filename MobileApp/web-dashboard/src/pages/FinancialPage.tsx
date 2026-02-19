import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TX_TYPES = ['income', 'expense'] as const;
const TX_CATEGORIES = ['sales', 'materials', 'labor', 'overhead', 'other'] as const;
const INVOICE_STATUSES = ['unpaid', 'paid', 'overdue', 'cancelled'] as const;

const TX_TYPE_LABELS: Record<string, string> = { income: 'Income', expense: 'Expense' };
const TX_CATEGORY_LABELS: Record<string, string> = {
  sales: 'Sales',
  materials: 'Materials',
  labor: 'Labor',
  overhead: 'Overhead',
  other: 'Other',
};
const INVOICE_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

// Toast notification component
const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({
  message,
  type,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`animate-slide-in fixed right-4 top-4 z-[60] flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
        type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {type === 'success' ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
      {message}
    </div>
  );
};

const FinancialPage: React.FC = () => {
  // Summary state
  const [summary, setSummary] = useState<any>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<'transactions' | 'invoices'>('transactions');

  // Transactions tab state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txSearch, setTxSearch] = useState('');
  const [txDebouncedSearch, setTxDebouncedSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [txCategoryFilter, setTxCategoryFilter] = useState('all');
  const [txSortBy, setTxSortBy] = useState('payment_date');
  const [txSortOrder, setTxSortOrder] = useState<'asc' | 'desc'>('desc');
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txTotal, setTxTotal] = useState(0);

  // Invoices tab state
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invLoading, setInvLoading] = useState(true);
  const [invSearch, setInvSearch] = useState('');
  const [invDebouncedSearch, setInvDebouncedSearch] = useState('');
  const [invStatusFilter, setInvStatusFilter] = useState('all');
  const [invSortBy, setInvSortBy] = useState('issue_date');
  const [invSortOrder, setInvSortOrder] = useState<'asc' | 'desc'>('desc');
  const [invPage, setInvPage] = useState(1);
  const [invTotalPages, setInvTotalPages] = useState(1);
  const [invTotal, setInvTotal] = useState(0);
  const [invStats, setInvStats] = useState<{
    unpaid: number;
    paid: number;
    overdue: number;
    cancelled: number;
  }>({ unpaid: 0, paid: 0, overdue: 0, cancelled: 0 });

  // Transaction modal
  const [showTxModal, setShowTxModal] = useState(false);
  const [savingTx, setSavingTx] = useState(false);
  const [txFormError, setTxFormError] = useState<string | null>(null);
  const [txForm, setTxForm] = useState({
    type: 'income',
    category: 'sales',
    amount: '',
    description: '',
    payment_method: '',
  });

  // Invoice modal
  const [showInvModal, setShowInvModal] = useState(false);
  const [savingInv, setSavingInv] = useState(false);
  const [invFormError, setInvFormError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [invForm, setInvForm] = useState({
    customer_id: '',
    order_id: '',
    items: [{ description: '', quantity: 1, unit_price: 0 }] as {
      description: string;
      quantity: number;
      unit_price: number;
    }[],
    discount: 0,
    notes: '',
    due_date: '',
  });

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const {
    getFinancialSummary,
    getTransactions,
    getInvoices,
    createTransaction,
    createInvoice,
    updateInvoiceStatus,
    getCustomers,
    getOrders,
  } = useApi();
  const { user } = useAuth();
  const { t } = useLanguage();

  // --- Helper functions ---
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatShortCurrency = (amount: number) => {
    if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(0)}M`;
    if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}K`;
    return `Rp ${amount}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // --- Load functions ---
  const loadSummary = useCallback(async () => {
    try {
      const data = await getFinancialSummary();
      setSummary(data.summary || data);
    } catch (err) {
      console.error('Error loading financial summary:', err);
    }
  }, [getFinancialSummary]);

  const loadTransactions = useCallback(async () => {
    try {
      setTxLoading(true);
      const params: Record<string, any> = {
        page: txPage,
        limit: 25,
        sort_by: txSortBy,
        sort_order: txSortOrder,
      };
      if (txDebouncedSearch) params.search = txDebouncedSearch;
      if (txTypeFilter !== 'all') params.type = txTypeFilter;
      if (txCategoryFilter !== 'all') params.category = txCategoryFilter;

      const data = await getTransactions(params);
      setTransactions(data.transactions || []);
      setTxTotal(data.total || 0);
      setTxTotalPages(data.totalPages || 1);
      if (data.categoryBreakdown) {
        setCategoryBreakdown(data.categoryBreakdown);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
      if (!transactions.length) setError('Failed to load transactions. Please try again.');
    } finally {
      setTxLoading(false);
    }
  }, [
    getTransactions,
    txDebouncedSearch,
    txTypeFilter,
    txCategoryFilter,
    txSortBy,
    txSortOrder,
    txPage,
  ]);

  const loadInvoices = useCallback(async () => {
    try {
      setInvLoading(true);
      const params: Record<string, any> = {
        page: invPage,
        limit: 25,
        sort_by: invSortBy,
        sort_order: invSortOrder,
      };
      if (invDebouncedSearch) params.search = invDebouncedSearch;
      if (invStatusFilter !== 'all') params.status = invStatusFilter;

      const data = await getInvoices(params);
      setInvoices(data.invoices || []);
      setInvTotal(data.total || 0);
      setInvTotalPages(data.totalPages || 1);
      if (data.stats) {
        setInvStats({
          unpaid: data.stats.unpaid || 0,
          paid: data.stats.paid || 0,
          overdue: data.stats.overdue || 0,
          cancelled: data.stats.cancelled || 0,
        });
      }
    } catch (err) {
      console.error('Error loading invoices:', err);
      if (!invoices.length) setError('Failed to load invoices. Please try again.');
    } finally {
      setInvLoading(false);
    }
  }, [getInvoices, invDebouncedSearch, invStatusFilter, invSortBy, invSortOrder, invPage]);

  // --- useEffects ---

  // Load summary on mount
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Load transactions when deps change
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Load invoices when deps change
  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // txSearch debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setTxDebouncedSearch(txSearch);
      setTxPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [txSearch]);

  // invSearch debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setInvDebouncedSearch(invSearch);
      setInvPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [invSearch]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTxModal) setShowTxModal(false);
        if (showInvModal) setShowInvModal(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showTxModal, showInvModal]);

  // --- Sort handlers ---
  const handleTxSort = (column: string) => {
    if (txSortBy === column) {
      setTxSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTxSortBy(column);
      setTxSortOrder('asc');
    }
    setTxPage(1);
  };

  const handleInvSort = (column: string) => {
    if (invSortBy === column) {
      setInvSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setInvSortBy(column);
      setInvSortOrder('asc');
    }
    setInvPage(1);
  };

  const TxSortIcon: React.FC<{ column: string }> = ({ column }) => {
    if (txSortBy !== column) return <span className="ml-1 text-gray-300">&#8645;</span>;
    return (
      <span className="ml-1 text-primary-600">{txSortOrder === 'asc' ? '&#8593;' : '&#8595;'}</span>
    );
  };

  const InvSortIcon: React.FC<{ column: string }> = ({ column }) => {
    if (invSortBy !== column) return <span className="ml-1 text-gray-300">&#8645;</span>;
    return (
      <span className="ml-1 text-primary-600">
        {invSortOrder === 'asc' ? '&#8593;' : '&#8595;'}
      </span>
    );
  };

  // --- Chart data ---
  const chartData = useMemo(() => {
    // Build from categoryBreakdown if available, otherwise from transactions
    if (categoryBreakdown && categoryBreakdown.length > 0) {
      const grouped: Record<string, { income: number; expense: number }> = {};
      categoryBreakdown.forEach((item: any) => {
        const cat = item.category || 'other';
        if (!grouped[cat]) grouped[cat] = { income: 0, expense: 0 };
        if (item.type === 'income') grouped[cat].income += item.total || item.amount || 0;
        else grouped[cat].expense += item.total || item.amount || 0;
      });
      return Object.entries(grouped)
        .map(([category, values]) => ({ category, ...values }))
        .sort((a, b) => b.income + b.expense - (a.income + a.expense))
        .slice(0, 8);
    }
    // Fallback: compute from transactions array
    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};
    transactions.forEach((tx: any) => {
      const cat = tx.category || 'other';
      if (tx.type === 'income')
        incomeByCategory[cat] = (incomeByCategory[cat] || 0) + (tx.amount || 0);
      else expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (tx.amount || 0);
    });
    return Array.from(
      new Set([...Object.keys(incomeByCategory), ...Object.keys(expenseByCategory)])
    )
      .map((cat) => ({
        category: cat,
        income: incomeByCategory[cat] || 0,
        expense: expenseByCategory[cat] || 0,
      }))
      .sort((a, b) => b.income + b.expense - (a.income + a.expense))
      .slice(0, 8);
  }, [categoryBreakdown, transactions]);

  // --- KPI computed values ---
  const totalRevenue = summary?.total_revenue || summary?.totalRevenue || 0;
  const totalExpenses = summary?.total_expenses || summary?.totalExpenses || 0;
  const netProfit = summary?.netProfit || summary?.net_profit || totalRevenue - totalExpenses;
  const pendingInvoices = summary?.pending_invoices || summary?.pendingInvoices || 0;

  // --- CSV export ---
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((row) =>
      Object.values(row)
        .map((v) => `"${v}"`)
        .join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Transaction modal handlers ---
  const openTxModal = () => {
    setTxForm({
      type: 'income',
      category: 'sales',
      amount: '',
      description: '',
      payment_method: '',
    });
    setTxFormError(null);
    setShowTxModal(true);
  };

  const handleCreateTx = async () => {
    if (!txForm.amount || Number(txForm.amount) <= 0) {
      setTxFormError('Amount is required and must be greater than 0.');
      return;
    }
    try {
      setSavingTx(true);
      setTxFormError(null);
      await createTransaction({
        type: txForm.type,
        category: txForm.category,
        amount: Number(txForm.amount),
        description: txForm.description.trim() || undefined,
        payment_method: txForm.payment_method.trim() || undefined,
      });
      setShowTxModal(false);
      setToast({
        message: t('financial.txCreateSuccess') || 'Transaction created successfully',
        type: 'success',
      });
      loadTransactions();
      loadSummary();
    } catch (err: any) {
      setTxFormError(
        err?.response?.data?.error || 'Failed to create transaction. Please try again.'
      );
    } finally {
      setSavingTx(false);
    }
  };

  // --- Invoice modal handlers ---
  const openInvoiceModal = async () => {
    setShowInvModal(true);
    setInvForm({
      customer_id: '',
      order_id: '',
      items: [{ description: '', quantity: 1, unit_price: 0 }],
      discount: 0,
      notes: '',
      due_date: '',
    });
    setInvFormError(null);
    try {
      const [custData, ordData] = await Promise.all([getCustomers(), getOrders()]);
      setCustomers(custData.customers || []);
      setOrders(ordData.orders || []);
    } catch (err) {
      console.error('Error loading customers/orders:', err);
    }
  };

  const filteredOrders = invForm.customer_id
    ? orders.filter((o: any) => o.customer_id === invForm.customer_id)
    : orders;

  const invSubtotal = invForm.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const invDiscount = Number(invForm.discount) || 0;
  const invAfterDiscount = invSubtotal - invDiscount;
  const invPPN = Math.round(invAfterDiscount * 0.11);
  const invGrandTotal = invAfterDiscount + invPPN;

  const addLineItem = () => {
    setInvForm({
      ...invForm,
      items: [...invForm.items, { description: '', quantity: 1, unit_price: 0 }],
    });
  };

  const removeLineItem = (index: number) => {
    if (invForm.items.length <= 1) return;
    setInvForm({ ...invForm, items: invForm.items.filter((_, i) => i !== index) });
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = invForm.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setInvForm({ ...invForm, items: updated });
  };

  const handleCreateInvoice = async () => {
    if (!invForm.customer_id) {
      setInvFormError('Customer is required.');
      return;
    }
    if (!invForm.items.some((item) => item.description.trim())) {
      setInvFormError('At least one line item with a description is required.');
      return;
    }
    try {
      setSavingInv(true);
      setInvFormError(null);
      await createInvoice({
        customer_id: invForm.customer_id,
        order_id: invForm.order_id || undefined,
        subtotal: invSubtotal,
        discount: invDiscount,
        due_date: invForm.due_date || undefined,
        notes: invForm.notes.trim() || undefined,
        items: invForm.items.filter((item) => item.description.trim()),
      });
      setShowInvModal(false);
      setToast({
        message: t('financial.invCreateSuccess') || 'Invoice created successfully',
        type: 'success',
      });
      loadInvoices();
      loadSummary();
    } catch (err: any) {
      setInvFormError(err?.response?.data?.error || 'Failed to create invoice. Please try again.');
    } finally {
      setSavingInv(false);
    }
  };

  const handleInvoiceStatus = async (id: string, status: string) => {
    try {
      await updateInvoiceStatus(id, status);
      setToast({
        message: t('financial.invStatusSuccess') || 'Invoice status updated',
        type: 'success',
      });
      loadInvoices();
      loadSummary();
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.error || 'Failed to update invoice status',
        type: 'error',
      });
    }
  };

  // --- Filter checks ---
  const txHasFilters = !!txDebouncedSearch || txTypeFilter !== 'all' || txCategoryFilter !== 'all';
  const invHasFilters = !!invDebouncedSearch || invStatusFilter !== 'all';

  // --- Skeleton rows ---
  const TxSkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 w-3/4 rounded bg-gray-200"></div>
        </td>
      ))}
    </tr>
  );

  const InvSkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 w-3/4 rounded bg-gray-200"></div>
        </td>
      ))}
    </tr>
  );

  // --- Invoice status badge color ---
  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'unpaid':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // --- Error state when no data at all ---
  if (error && !transactions.length && !invoices.length && !summary) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-700">
        <p className="font-medium">{t('common.error') || 'Error'}</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => {
            setError(null);
            loadSummary();
            loadTransactions();
            loadInvoices();
          }}
          className="mt-2 text-sm text-red-600 underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Error banner when data exists */}
      {error && (transactions.length > 0 || invoices.length > 0 || summary) && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={() => {
              setError(null);
              loadTransactions();
              loadInvoices();
            }}
            className="ml-4 text-red-600 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('financial.title') || 'Financial'}
          </h1>
          <p className="text-sm text-gray-500">
            {t('financial.subtitle') || 'Financial overview and transactions'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openTxModal}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            + {t('financial.newTransaction') || 'Transaction'}
          </button>
          <button
            onClick={openInvoiceModal}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            + {t('financial.newInvoice') || 'Invoice'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            {t('financial.totalRevenue') || 'Total Revenue'}
          </p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {formatShortCurrency(totalRevenue)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            {t('financial.totalExpenses') || 'Total Expenses'}
          </p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {formatShortCurrency(totalExpenses)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            {t('financial.netProfit') || 'Net Profit'}
          </p>
          <p
            className={`mt-1 text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {formatShortCurrency(netProfit)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            {t('financial.pendingInvoices') || 'Pending Invoices'}
          </p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">{pendingInvoices}</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            {t('financial.chartTitle') || 'Income vs Expenses by Category'}
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatShortCurrency} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar
                dataKey="income"
                fill="#10b981"
                name={t('financial.income') || 'Income'}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expense"
                fill="#ef4444"
                name={t('financial.expense') || 'Expense'}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tab Container */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {/* Tab Bar */}
        <div className="border-b border-gray-100 px-6">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`border-b-2 py-3 text-sm font-medium transition-colors ${
                activeTab === 'transactions'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('financial.transactions') || 'Transactions'} ({txTotal})
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`border-b-2 py-3 text-sm font-medium transition-colors ${
                activeTab === 'invoices'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('financial.invoices') || 'Invoices'} ({invTotal})
            </button>
          </div>
        </div>

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div>
            {/* Filter bar */}
            <div className="border-b border-gray-100 px-6 py-3">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder={(t('common.search') || 'Search') + ' transactions...'}
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <select
                  value={txTypeFilter}
                  onChange={(e) => {
                    setTxTypeFilter(e.target.value);
                    setTxPage(1);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">{t('financial.allTypes') || 'All Types'}</option>
                  {TX_TYPES.map((tt) => (
                    <option key={tt} value={tt}>
                      {TX_TYPE_LABELS[tt]}
                    </option>
                  ))}
                </select>
                <select
                  value={txCategoryFilter}
                  onChange={(e) => {
                    setTxCategoryFilter(e.target.value);
                    setTxPage(1);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">{t('financial.allCategories') || 'All Categories'}</option>
                  {TX_CATEGORIES.map((tc) => (
                    <option key={tc} value={tc}>
                      {TX_CATEGORY_LABELS[tc]}
                    </option>
                  ))}
                </select>
                {transactions.length > 0 && (
                  <button
                    onClick={() => exportToCSV(transactions, 'transactions.csv')}
                    className="whitespace-nowrap rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    {t('common.export') || 'Export'} CSV
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      onClick={() => handleTxSort('payment_date')}
                      className="cursor-pointer select-none whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    >
                      Date <TxSortIcon column="payment_date" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      {t('financial.description') || 'Description'}
                    </th>
                    <th
                      onClick={() => handleTxSort('type')}
                      className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    >
                      {t('financial.type') || 'Type'} <TxSortIcon column="type" />
                    </th>
                    <th
                      onClick={() => handleTxSort('category')}
                      className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    >
                      {t('financial.category') || 'Category'} <TxSortIcon column="category" />
                    </th>
                    <th
                      onClick={() => handleTxSort('amount')}
                      className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    >
                      {t('financial.amount') || 'Amount'} <TxSortIcon column="amount" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {txLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <TxSkeletonRow key={i} />)
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center">
                          <svg
                            className="mb-4 h-16 w-16 text-gray-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                          </svg>
                          <p className="mb-1 font-medium text-gray-500">
                            {t('financial.noTransactions') || 'No transactions found'}
                          </p>
                          <p className="mb-4 text-sm text-gray-400">
                            {txHasFilters
                              ? t('financial.adjustTxFilters') || 'Try adjusting your filters.'
                              : t('financial.createFirstTx') ||
                                'Record your first transaction to get started.'}
                          </p>
                          {!txHasFilters && (
                            <button
                              onClick={openTxModal}
                              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                            >
                              + {t('financial.newTransaction') || 'Transaction'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx: any) => (
                      <tr key={tx.id} className="transition-colors hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          {formatDate(tx.payment_date || tx.created_at || tx.date)}
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className="max-w-[240px] truncate text-sm text-gray-900"
                            title={tx.description || '-'}
                          >
                            {tx.description || '-'}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              tx.type === 'income'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {TX_TYPE_LABELS[tx.type] || tx.type}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm capitalize text-gray-600">
                          {TX_CATEGORY_LABELS[tx.category] || tx.category || '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right">
                          <span
                            className={`text-sm font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {tx.type === 'income' ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!txLoading && transactions.length > 0 && (
              <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-3">
                <span className="text-sm text-gray-600">
                  Page {txPage} of {txTotalPages} ({txTotal} transactions)
                </span>
                <div className="space-x-2">
                  <button
                    disabled={txPage <= 1}
                    onClick={() => setTxPage((p) => p - 1)}
                    className="rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={txPage >= txTotalPages}
                    onClick={() => setTxPage((p) => p + 1)}
                    className="rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div>
            {/* Filter bar */}
            <div className="border-b border-gray-100 px-6 py-3">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder={(t('common.search') || 'Search') + ' invoices...'}
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <select
                  value={invStatusFilter}
                  onChange={(e) => {
                    setInvStatusFilter(e.target.value);
                    setInvPage(1);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">{t('financial.allStatuses') || 'All Statuses'}</option>
                  {INVOICE_STATUSES.map((is) => (
                    <option key={is} value={is}>
                      {INVOICE_STATUS_LABELS[is]}
                    </option>
                  ))}
                </select>
                {invoices.length > 0 && (
                  <button
                    onClick={() => exportToCSV(invoices, 'invoices.csv')}
                    className="whitespace-nowrap rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    {t('common.export') || 'Export'} CSV
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      onClick={() => handleInvSort('invoice_number')}
                      className="cursor-pointer select-none whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    >
                      {t('financial.invoiceNumber') || 'Invoice #'}{' '}
                      <InvSortIcon column="invoice_number" />
                    </th>
                    <th
                      onClick={() => handleInvSort('customer_name')}
                      className="cursor-pointer select-none whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    >
                      {t('financial.customer') || 'Customer'} <InvSortIcon column="customer_name" />
                    </th>
                    <th
                      onClick={() => handleInvSort('issue_date')}
                      className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    >
                      {t('financial.issueDate') || 'Date'} <InvSortIcon column="issue_date" />
                    </th>
                    <th
                      onClick={() => handleInvSort('due_date')}
                      className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    >
                      {t('financial.dueDate') || 'Due Date'} <InvSortIcon column="due_date" />
                    </th>
                    <th
                      onClick={() => handleInvSort('status')}
                      className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    >
                      {t('financial.status') || 'Status'} <InvSortIcon column="status" />
                    </th>
                    <th
                      onClick={() => handleInvSort('total_amount')}
                      className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    >
                      {t('financial.amount') || 'Amount'} <InvSortIcon column="total_amount" />
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {invLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <InvSkeletonRow key={i} />)
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center">
                          <svg
                            className="mb-4 h-16 w-16 text-gray-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <p className="mb-1 font-medium text-gray-500">
                            {t('financial.noInvoices') || 'No invoices found'}
                          </p>
                          <p className="mb-4 text-sm text-gray-400">
                            {invHasFilters
                              ? t('financial.adjustInvFilters') || 'Try adjusting your filters.'
                              : t('financial.createFirstInv') ||
                                'Create your first invoice to get started.'}
                          </p>
                          {!invHasFilters && (
                            <button
                              onClick={openInvoiceModal}
                              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                            >
                              + {t('financial.newInvoice') || 'Invoice'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv: any) => (
                      <tr key={inv.id} className="transition-colors hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {inv.invoice_number || inv.id}
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className="max-w-[200px] truncate text-sm text-gray-600"
                            title={inv.customer_name || '-'}
                          >
                            {inv.customer_name || '-'}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                          {formatDate(inv.issue_date || inv.created_at || inv.date)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                          {formatDate(inv.due_date)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getInvoiceStatusColor(inv.status || 'unpaid')}`}
                          >
                            {INVOICE_STATUS_LABELS[inv.status] || inv.status || 'Unpaid'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(inv.total_amount || inv.amount)}
                        </td>
                        <td className="space-x-2 whitespace-nowrap px-4 py-4 text-right">
                          {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                            <button
                              onClick={() => handleInvoiceStatus(inv.id, 'paid')}
                              className="text-xs font-medium text-green-600 hover:text-green-800"
                            >
                              {t('financial.markPaid') || 'Mark Paid'}
                            </button>
                          )}
                          {inv.status === 'unpaid' && (
                            <button
                              onClick={() => handleInvoiceStatus(inv.id, 'overdue')}
                              className="text-xs font-medium text-red-600 hover:text-red-800"
                            >
                              {t('financial.markOverdue') || 'Overdue'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!invLoading && invoices.length > 0 && (
              <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-3">
                <span className="text-sm text-gray-600">
                  Page {invPage} of {invTotalPages} ({invTotal} invoices)
                </span>
                <div className="space-x-2">
                  <button
                    disabled={invPage <= 1}
                    onClick={() => setInvPage((p) => p - 1)}
                    className="rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={invPage >= invTotalPages}
                    onClick={() => setInvPage((p) => p + 1)}
                    className="rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {showTxModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTxModal(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('financial.newTransaction') || 'New Transaction'}
              </h2>
              <button
                onClick={() => setShowTxModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-4 p-6">
              {txFormError && (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  {txFormError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t('financial.type') || 'Type'}
                  </label>
                  <select
                    value={txForm.type}
                    onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {TX_TYPES.map((tt) => (
                      <option key={tt} value={tt}>
                        {TX_TYPE_LABELS[tt]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t('financial.category') || 'Category'}
                  </label>
                  <select
                    value={txForm.category}
                    onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {TX_CATEGORIES.map((tc) => (
                      <option key={tc} value={tc}>
                        {TX_CATEGORY_LABELS[tc]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('financial.amount') || 'Amount'} (IDR) *
                </label>
                <input
                  type="number"
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('financial.description') || 'Description'}
                </label>
                <input
                  type="text"
                  value={txForm.description}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Description..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('financial.paymentMethod') || 'Payment Method'}
                </label>
                <input
                  type="text"
                  value={txForm.payment_method}
                  onChange={(e) => setTxForm({ ...txForm, payment_method: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Bank Transfer, Cash..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowTxModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleCreateTx}
                disabled={savingTx || !txForm.amount}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {savingTx ? 'Saving...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Creation Modal */}
      {showInvModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowInvModal(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('financial.newInvoice') || 'New Invoice'}
              </h2>
              <button
                onClick={() => setShowInvModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-4 p-6">
              {invFormError && (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  {invFormError}
                </div>
              )}
              {/* Customer & Order */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t('financial.customer') || 'Customer'} *
                  </label>
                  <select
                    value={invForm.customer_id}
                    onChange={(e) =>
                      setInvForm({ ...invForm, customer_id: e.target.value, order_id: '' })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select customer...</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Order (optional)
                  </label>
                  <select
                    value={invForm.order_id}
                    onChange={(e) => setInvForm({ ...invForm, order_id: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">No linked order</option>
                    {filteredOrders.map((o: any) => (
                      <option key={o.id} value={o.id}>
                        {o.order_number || o.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('financial.dueDate') || 'Due Date'} (optional)
                </label>
                <input
                  type="date"
                  value={invForm.due_date}
                  onChange={(e) => setInvForm({ ...invForm, due_date: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Line Items */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('financial.lineItems') || 'Line Items'}
                  </label>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="text-xs font-medium text-primary-600 hover:text-primary-800"
                  >
                    + {t('financial.addItem') || 'Add Item'}
                  </button>
                </div>
                <div className="space-y-2">
                  {invForm.items.map((item, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                        className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <input
                        type="number"
                        placeholder="Unit Price"
                        min={0}
                        value={item.unit_price || ''}
                        onChange={(e) =>
                          updateLineItem(index, 'unit_price', Number(e.target.value))
                        }
                        className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="w-28 py-2 text-right text-sm text-gray-600">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        disabled={invForm.items.length <= 1}
                        className="px-2 py-2 text-sm text-red-500 hover:text-red-700 disabled:opacity-30"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('financial.discount') || 'Discount'} (Rp, optional)
                </label>
                <input
                  type="number"
                  min={0}
                  value={invForm.discount || ''}
                  onChange={(e) => setInvForm({ ...invForm, discount: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                />
              </div>

              {/* Summary */}
              <div className="space-y-1 rounded-lg bg-gray-50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('financial.subtotal') || 'Subtotal'}</span>
                  <span className="font-medium">{formatCurrency(invSubtotal)}</span>
                </div>
                {invDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('financial.discount') || 'Discount'}</span>
                    <span className="font-medium text-red-600">-{formatCurrency(invDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('financial.ppn') || 'PPN'} (11%)</span>
                  <span className="font-medium">{formatCurrency(invPPN)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-sm font-bold">
                  <span>{t('financial.total') || 'Total'}</span>
                  <span>{formatCurrency(invGrandTotal)}</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notes (optional)
                </label>
                <textarea
                  value={invForm.notes}
                  onChange={(e) => setInvForm({ ...invForm, notes: e.target.value })}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowInvModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={savingInv || !invForm.customer_id}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                {savingInv ? 'Saving...' : t('financial.newInvoice') || 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialPage;
