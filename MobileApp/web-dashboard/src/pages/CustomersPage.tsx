import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import type {
  Customer,
  BusinessType,
  CustomerStatsResponse,
  CustomerCreatePayload,
  CustomerUpdatePayload,
} from '@shared/types/customers';
import Toast from '../components/Toast';
import { formatCurrency, formatDate, exportToCSV } from '../utils/formatters';
import { SkeletonRow, SortIcon } from '../components/TableHelpers';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import CustomerFormModal from '../components/customers/CustomerFormModal';
import { getLoyaltyColor, getBusinessColor } from '../utils/customerStyles';
import {
  BUSINESS_TYPES,
  LOYALTY_STATUSES,
  BUSINESS_TYPE_I18N,
  LOYALTY_I18N,
} from '@shared/types/customerConstants';

const STAT_COLORS: Record<BusinessType, string> = {
  corporate: 'text-blue-600',
  individual: 'text-gray-600',
  wedding: 'text-pink-600',
  trading: 'text-amber-600',
  event: 'text-purple-600',
};

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loyaltyFilter, setLoyaltyFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [stats, setStats] = useState<CustomerStatsResponse>({
    corporate: 0,
    wedding: 0,
    trading: 0,
    individual: 0,
    event: 0,
    totalValue: 0,
    loyalty_new: 0,
    loyalty_regular: 0,
    loyalty_vip: 0,
  });
  const [exporting, setExporting] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const pageSize = 25;

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { getCustomers, createCustomer, updateCustomer, deleteCustomer } = useApi();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const canDelete = user?.role === 'owner' || user?.role === 'manager';
  const location = useLocation();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Show toast from navigation state (e.g. after delete on detail page)
  useEffect(() => {
    const state = location.state as {
      toast?: { message: string; type: 'success' | 'error' };
    } | null;
    if (state?.toast) {
      setToast(state.toast);
      // Clear the state so it doesn't re-show on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadCustomers = useCallback(async () => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = {
        page,
        limit: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (typeFilter !== 'all') params.business_type = typeFilter;
      if (loyaltyFilter !== 'all') params.loyalty_status = loyaltyFilter;

      const data = await getCustomers(params);
      setCustomers(data.customers || []);
      setTotalPages(data.totalPages || 1);
      setTotalCustomers(data.total || 0);

      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(t('customers.loadError'));
    } finally {
      setLoading(false);
    }
  }, [getCustomers, page, debouncedSearch, typeFilter, loyaltyFilter, sortBy, sortOrder, t]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const openCreate = () => {
    setEditingCustomer(null);
    setShowModal(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowModal(true);
  };

  const handleModalSave = async (payload: CustomerCreatePayload) => {
    setSaving(true);
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload as CustomerUpdatePayload);
        setToast({ message: t('customers.updateSuccess'), type: 'success' });
      } else {
        await createCustomer(payload);
        setToast({ message: t('customers.createSuccess'), type: 'success' });
      }
      setShowModal(false);
      setSaving(false);
      loadCustomers();
    } catch (err) {
      setSaving(false);
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await deleteCustomer(deleteId);
      setDeleteId(null);
      setToast({ message: t('customers.deleteSuccess'), type: 'success' });
      loadCustomers();
    } catch {
      setToast({ message: t('customers.deleteError'), type: 'error' });
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const data = await getCustomers({
        page: 1,
        limit: 10000,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(typeFilter !== 'all' ? { business_type: typeFilter } : {}),
        ...(loyaltyFilter !== 'all' ? { loyalty_status: loyaltyFilter } : {}),
      });
      const rows = (data.customers || []).map((c: Customer) => ({
        name: c.name,
        email: c.email || '',
        phone: c.phone || '',
        business_type: c.business_type,
        loyalty_status: c.loyalty_status,
        total_orders: c.total_orders,
        total_spent: c.total_spent,
        address: c.address || '',
        notes: c.notes || '',
        created_at: c.created_at,
      }));
      exportToCSV(rows, `customers-${new Date().toISOString().slice(0, 10)}.csv`);
      setToast({ message: t('customers.exportSuccess'), type: 'success' });
    } catch {
      setToast({ message: t('customers.exportError'), type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setTypeFilter('all');
    setLoyaltyFilter('all');
    setPage(1);
  };

  const hasFilters = !!debouncedSearch || typeFilter !== 'all' || loyaltyFilter !== 'all';

  if (error && !customers.length) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-700">
        <p className="font-medium">{t('common.error')}</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => {
            setError(null);
            loadCustomers();
          }}
          className="mt-2 text-sm text-red-600 underline"
        >
          {t('customers.tryAgain')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Error banner when data exists */}
      {error && customers.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={() => {
              setError(null);
              loadCustomers();
            }}
            className="ml-4 text-red-600 underline"
          >
            {t('customers.retry')}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('customers.title')}</h1>
          <p className="text-sm text-gray-500">
            {t('customers.totalCustomersCount').replace('{n}', String(totalCustomers))}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={exporting || loading || totalCustomers === 0}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
          >
            {exporting ? t('customers.exporting') : t('customers.exportCsv')}
          </button>
          <button
            onClick={openCreate}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            + {t('customers.new')}
          </button>
        </div>
      </div>

      {/* Stats - All business types + VIP + Revenue */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">{t('customers.total')}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalCustomers}</p>
          <p className="mt-0.5 text-xs text-gray-400">
            {t('customers.loyaltyVip')}: {stats.loyalty_vip}
          </p>
        </div>
        {BUSINESS_TYPES.map((bt) => (
          <div key={bt} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-gray-500">
              {t(BUSINESS_TYPE_I18N[bt])}
            </p>
            <p className={`mt-1 text-2xl font-bold ${STAT_COLORS[bt]}`}>
              {stats[bt as keyof CustomerStatsResponse] as number}
            </p>
          </div>
        ))}
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            {t('customers.totalRevenue')}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatCurrency(stats.totalValue)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1">
            <input
              type="text"
              aria-label={t('customers.searchPlaceholder')}
              placeholder={t('customers.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            aria-label={t('customers.filterByType')}
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">{t('customers.allTypes')}</option>
            {BUSINESS_TYPES.map((bt) => (
              <option key={bt} value={bt}>
                {t(BUSINESS_TYPE_I18N[bt])}
              </option>
            ))}
          </select>
          <select
            aria-label={t('customers.filterByLoyalty')}
            value={loyaltyFilter}
            onChange={(e) => {
              setLoyaltyFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">{t('customers.allLoyalty')}</option>
            {LOYALTY_STATUSES.map((ls) => (
              <option key={ls} value={ls}>
                {t(LOYALTY_I18N[ls])}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
            >
              {t('customers.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort('name');
                    }
                  }}
                  tabIndex={0}
                  role="columnheader"
                  aria-sort={
                    sortBy === 'name' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  {t('customers.customer')}{' '}
                  <SortIcon column="name" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th
                  onClick={() => handleSort('email')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort('email');
                    }
                  }}
                  tabIndex={0}
                  role="columnheader"
                  aria-sort={
                    sortBy === 'email' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  {t('customers.contact')}{' '}
                  <SortIcon column="email" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th
                  onClick={() => handleSort('business_type')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort('business_type');
                    }
                  }}
                  tabIndex={0}
                  role="columnheader"
                  aria-sort={
                    sortBy === 'business_type'
                      ? sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  {t('customers.type')}{' '}
                  <SortIcon column="business_type" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th
                  onClick={() => handleSort('loyalty_status')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort('loyalty_status');
                    }
                  }}
                  tabIndex={0}
                  role="columnheader"
                  aria-sort={
                    sortBy === 'loyalty_status'
                      ? sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  {t('customers.status')}{' '}
                  <SortIcon column="loyalty_status" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th
                  onClick={() => handleSort('total_orders')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort('total_orders');
                    }
                  }}
                  tabIndex={0}
                  role="columnheader"
                  aria-sort={
                    sortBy === 'total_orders'
                      ? sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  {t('customers.ordersCol')}{' '}
                  <SortIcon column="total_orders" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th
                  onClick={() => handleSort('total_spent')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort('total_spent');
                    }
                  }}
                  tabIndex={0}
                  role="columnheader"
                  aria-sort={
                    sortBy === 'total_spent'
                      ? sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  {t('customers.spent')}{' '}
                  <SortIcon column="total_spent" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  {t('customers.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={7} />)
              ) : customers.length === 0 ? (
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
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <p className="mb-1 font-medium text-gray-500">{t('customers.noCustomers')}</p>
                      <p className="mb-4 text-sm text-gray-400">
                        {hasFilters ? t('customers.adjustFilters') : t('customers.createFirst')}
                      </p>
                      {hasFilters ? (
                        <button
                          onClick={clearFilters}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          {t('customers.clearFilters')}
                        </button>
                      ) : (
                        <button
                          onClick={openCreate}
                          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                        >
                          + {t('customers.new')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex max-w-[260px] items-center">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                          {(customer.name || '?')[0].toUpperCase()}
                        </div>
                        <div className="ml-3 min-w-0">
                          <button
                            onClick={() => navigate(`/customers/${customer.id}`)}
                            className="truncate text-sm font-medium text-primary-700 hover:text-primary-900 hover:underline"
                            title={customer.name}
                          >
                            {customer.name}
                          </button>
                          <div className="text-xs text-gray-500">
                            {formatDate(customer.created_at)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[180px] truncate text-sm text-gray-600">
                        {customer.email || '-'}
                      </div>
                      <div className="text-xs text-gray-400">{customer.phone || '-'}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getBusinessColor(customer.business_type)}`}
                      >
                        {BUSINESS_TYPE_I18N[customer.business_type as BusinessType]
                          ? t(BUSINESS_TYPE_I18N[customer.business_type as BusinessType])
                          : customer.business_type || '-'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getLoyaltyColor(customer.loyalty_status)}`}
                      >
                        {LOYALTY_I18N[customer.loyalty_status]
                          ? t(LOYALTY_I18N[customer.loyalty_status])
                          : customer.loyalty_status || t('customers.loyaltyNew')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {customer.total_orders}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(customer.total_spent)}
                      </div>
                    </td>
                    <td className="space-x-2 whitespace-nowrap px-4 py-4 text-right">
                      <button
                        onClick={() => openEdit(customer)}
                        className="text-sm font-medium text-primary-600 hover:text-primary-800"
                      >
                        {t('common.edit')}
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => setDeleteId(customer.id)}
                          className="text-sm font-medium text-red-600 hover:text-red-800"
                        >
                          {t('common.delete')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && customers.length > 0 && (
          <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-3">
            <span className="text-sm text-gray-600">
              {t('customers.pageInfo')
                .replace('{page}', String(page))
                .replace('{totalPages}', String(totalPages))
                .replace('{total}', String(totalCustomers))}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(1)}
                className="rounded-lg border px-2.5 py-1.5 text-sm transition-colors hover:bg-gray-100 disabled:opacity-40"
                title={t('customers.firstPage')}
              >
                &laquo;
              </button>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 disabled:opacity-40"
              >
                {t('customers.previous')}
              </button>
              {totalPages <= 7
                ? Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      aria-current={p === page ? 'page' : undefined}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        p === page
                          ? 'border-primary-500 bg-primary-50 font-semibold text-primary-700'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))
                : (() => {
                    const pages: (number | string)[] = [];
                    pages.push(1);
                    if (page > 3) pages.push('...');
                    for (
                      let i = Math.max(2, page - 1);
                      i <= Math.min(totalPages - 1, page + 1);
                      i++
                    ) {
                      pages.push(i);
                    }
                    if (page < totalPages - 2) pages.push('...');
                    pages.push(totalPages);
                    return pages.map((p, idx) =>
                      typeof p === 'string' ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-sm text-gray-400">
                          {p}
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          aria-current={p === page ? 'page' : undefined}
                          className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                            p === page
                              ? 'border-primary-500 bg-primary-50 font-semibold text-primary-700'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    );
                  })()}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 disabled:opacity-40"
              >
                {t('customers.next')}
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                className="rounded-lg border px-2.5 py-1.5 text-sm transition-colors hover:bg-gray-100 disabled:opacity-40"
                title={t('customers.lastPage')}
              >
                &raquo;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <CustomerFormModal
        open={showModal}
        editingCustomer={editingCustomer}
        onClose={() => setShowModal(false)}
        onSave={handleModalSave}
        saving={saving}
      />

      {/* Delete Confirmation */}
      {deleteId && (
        <ConfirmDeleteDialog
          itemLabel={customers.find((c) => c.id === deleteId)?.name || ''}
          titleKey="customers.deleteCustomer"
          descriptionKey="customers.confirmDelete"
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
};

export default CustomersPage;
