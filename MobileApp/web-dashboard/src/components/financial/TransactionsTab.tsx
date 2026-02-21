import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../contexts/ApiContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDebounce } from '../../hooks/useDebounce';
import { SkeletonRow, SortIcon, Pagination } from '../../components/TableHelpers';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';
import Toast from '../../components/Toast';
import CreateTransactionModal from '../../components/CreateTransactionModal';
import type { Transaction } from '@shared/types/financial';

const TX_TYPES = ['income', 'expense'] as const;
const TX_CATEGORIES = ['sales', 'materials', 'labor', 'overhead', 'other'] as const;

const TX_TYPE_LABELS: Record<string, string> = { income: 'Income', expense: 'Expense' };
const TX_CATEGORY_LABELS: Record<string, string> = {
  sales: 'Sales',
  materials: 'Materials',
  labor: 'Labor',
  overhead: 'Overhead',
  other: 'Other',
};

interface TransactionsTabProps {
  onDataChange: () => void;
}

export interface TransactionsCategoryBreakdown {
  categoryBreakdown: Array<{ category: string; type: string; total?: number; amount?: number }>;
}

const TransactionsTab: React.FC<TransactionsTabProps> = ({ onDataChange }) => {
  const { getTransactions } = useApi();
  const { t } = useLanguage();

  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('payment_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, categoryFilter]);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page,
        limit: 25,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (typeFilter !== 'all') params.type = typeFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const data = await getTransactions(params);
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [getTransactions, debouncedSearch, typeFilter, categoryFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Sort handler
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // Transaction create success
  const handleCreateSuccess = () => {
    setToast({
      message: t('financial.txCreateSuccess') || 'Transaction created successfully',
      type: 'success',
    });
    loadTransactions();
    onDataChange();
  };

  const hasFilters = !!debouncedSearch || typeFilter !== 'all' || categoryFilter !== 'all';

  return (
    <div>
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Filter bar */}
      <div className="border-b border-gray-100 px-6 py-3">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1">
            <input
              type="text"
              placeholder={(t('common.search') || 'Search') + ' transactions...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
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
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
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
              onClick={() =>
                exportToCSV(
                  transactions as unknown as Record<string, unknown>[],
                  'transactions.csv'
                )
              }
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
                onClick={() => handleSort('payment_date')}
                className="cursor-pointer select-none whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
              >
                Date <SortIcon column="payment_date" sortBy={sortBy} sortOrder={sortOrder} />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('financial.description') || 'Description'}
              </th>
              <th
                onClick={() => handleSort('type')}
                className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
              >
                {t('financial.type') || 'Type'}{' '}
                <SortIcon column="type" sortBy={sortBy} sortOrder={sortOrder} />
              </th>
              <th
                onClick={() => handleSort('category')}
                className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
              >
                {t('financial.category') || 'Category'}{' '}
                <SortIcon column="category" sortBy={sortBy} sortOrder={sortOrder} />
              </th>
              <th
                onClick={() => handleSort('amount')}
                className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
              >
                {t('financial.amount') || 'Amount'}{' '}
                <SortIcon column="amount" sortBy={sortBy} sortOrder={sortOrder} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={5} />)
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
                      {hasFilters
                        ? t('financial.adjustTxFilters') || 'Try adjusting your filters.'
                        : t('financial.createFirstTx') ||
                          'Record your first transaction to get started.'}
                    </p>
                    {!hasFilters && (
                      <button
                        onClick={() => setShowModal(true)}
                        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                      >
                        + {t('financial.newTransaction') || 'Transaction'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="transition-colors hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {formatDate(tx.payment_date || tx.created_at)}
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
      {!loading && transactions.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          label="transactions"
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {/* Transaction Modal */}
      <CreateTransactionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default TransactionsTab;
