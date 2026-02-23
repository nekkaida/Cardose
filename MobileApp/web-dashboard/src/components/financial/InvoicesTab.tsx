import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../contexts/ApiContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDebounce } from '../../hooks/useDebounce';
import { SkeletonRow, SortIcon, Pagination } from '../../components/TableHelpers';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/formatters';
import Toast from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import CreateInvoiceModal from '../../components/CreateInvoiceModal';
import { getApiErrorMessage } from '../../utils/apiError';
import type { Invoice, InvoiceStatus } from '@shared/types/financial';

const INVOICE_STATUSES = ['unpaid', 'paid', 'overdue', 'cancelled', 'partial'] as const;

const INVOICE_STATUS_KEYS: Record<string, string> = {
  unpaid: 'financial.statusUnpaid',
  paid: 'financial.statusPaid',
  overdue: 'financial.statusOverdue',
  cancelled: 'financial.statusCancelled',
  partial: 'financial.statusPartial',
};

const INVOICE_STATUS_FALLBACKS: Record<string, string> = {
  unpaid: 'Unpaid',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  partial: 'Partial',
};

interface InvoicesTabProps {
  onDataChange: () => void;
}

const getInvoiceStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'overdue':
      return 'bg-red-100 text-red-800';
    case 'unpaid':
      return 'bg-yellow-100 text-yellow-800';
    case 'partial':
      return 'bg-blue-100 text-blue-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const InvoicesTab: React.FC<InvoicesTabProps> = ({ onDataChange }) => {
  const { getInvoices, updateInvoiceStatus } = useApi();
  const { t } = useLanguage();

  // i18n-aware status label
  const statusLabel = (status: string) =>
    t(INVOICE_STATUS_KEYS[status] || '') || INVOICE_STATUS_FALLBACKS[status] || status;

  // State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('issue_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Confirm dialog state
  const [confirmAction, setConfirmAction] = useState<{
    invoiceId: string;
    invoiceNumber: string;
    newStatus: InvoiceStatus;
    amount: number;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, startDate, endDate]);

  // Load invoices
  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page,
        limit: 25,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await getInvoices(params);
      setInvoices(data.invoices || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setLoadError(false);
    } catch (err) {
      console.error('Error loading invoices:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [getInvoices, debouncedSearch, statusFilter, startDate, endDate, sortBy, sortOrder, page]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

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

  // Invoice create success
  const handleCreateSuccess = () => {
    setToast({
      message: t('financial.invCreateSuccess') || 'Invoice created successfully',
      type: 'success',
    });
    loadInvoices();
    onDataChange();
  };

  // Request confirmation before status change
  const requestStatusChange = (inv: Invoice, newStatus: InvoiceStatus) => {
    setConfirmAction({
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number || inv.id,
      newStatus,
      amount: inv.total_amount,
    });
  };

  // Execute confirmed status change
  const executeStatusChange = async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    try {
      await updateInvoiceStatus(confirmAction.invoiceId, confirmAction.newStatus);
      setToast({
        message: t('financial.invStatusSuccess') || 'Invoice status updated',
        type: 'success',
      });
      loadInvoices();
      onDataChange();
    } catch (err: unknown) {
      setToast({
        message: getApiErrorMessage(err, 'Failed to update invoice status'),
        type: 'error',
      });
    } finally {
      setConfirmLoading(false);
      setConfirmAction(null);
    }
  };

  const hasFilters = !!debouncedSearch || statusFilter !== 'all' || !!startDate || !!endDate;

  // Build confirm dialog message
  const confirmMessage = confirmAction
    ? confirmAction.newStatus === 'paid'
      ? `${t('financial.confirmPaidMessage') || 'This will mark invoice'} ${confirmAction.invoiceNumber} (${formatCurrency(confirmAction.amount)}) ${t('financial.confirmPaidSuffix') || 'as paid and create an income transaction record.'}`
      : confirmAction.newStatus === 'cancelled'
        ? `${t('financial.confirmCancelMessage') || 'This will permanently cancel invoice'} ${confirmAction.invoiceNumber}. ${t('financial.confirmCancelWarning') || 'This action cannot be undone.'}`
        : `${t('financial.confirmStatusPrefix') || 'This will mark invoice'} ${confirmAction.invoiceNumber} ${t('financial.confirmStatusAs') || 'as'} ${statusLabel(confirmAction.newStatus).toLowerCase()}.`
    : '';

  const confirmVariant =
    confirmAction?.newStatus === 'paid'
      ? 'primary'
      : confirmAction?.newStatus === 'cancelled'
        ? 'danger'
        : confirmAction?.newStatus === 'overdue'
          ? 'warning'
          : 'primary';

  return (
    <div>
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        title={t('financial.confirmStatusChange') || 'Confirm Status Change'}
        message={confirmMessage}
        confirmLabel={
          confirmAction?.newStatus === 'paid'
            ? t('financial.markAsPaid') || 'Mark as Paid'
            : confirmAction?.newStatus === 'overdue'
              ? t('financial.markAsOverdue') || 'Mark as Overdue'
              : confirmAction?.newStatus === 'cancelled'
                ? t('financial.cancelInvoice') || 'Cancel Invoice'
                : t('common.confirm') || 'Confirm'
        }
        variant={confirmVariant}
        loading={confirmLoading}
        onConfirm={executeStatusChange}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Toolbar */}
      <div className="border-b border-gray-100 px-6 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder={(t('common.search') || 'Search') + ' invoices...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t('common.search') || 'Search invoices'}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label={t('financial.filterByStatus') || 'Filter by status'}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">{t('financial.allStatuses') || 'All Statuses'}</option>
            {INVOICE_STATUSES.map((is) => (
              <option key={is} value={is}>
                {statusLabel(is)}
              </option>
            ))}
          </select>
          {/* Date range filters */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label={t('financial.startDate') || 'Start date'}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label={t('financial.endDate') || 'End date'}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {/* Action bar */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-2">
            {invoices.length > 0 && (
              <button
                onClick={() =>
                  exportToCSV(
                    invoices as object[],
                    `invoices-${new Date().toISOString().split('T')[0]}.csv`
                  )
                }
                className="whitespace-nowrap rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                {t('common.export') || 'Export'} CSV
              </button>
            )}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
          >
            + {t('financial.newInvoice') || 'New Invoice'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort('invoice_number')}
                className="cursor-pointer select-none whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
              >
                {t('financial.invoiceNumber') || 'Invoice #'}{' '}
                <SortIcon column="invoice_number" sortBy={sortBy} sortOrder={sortOrder} />
              </th>
              <th
                onClick={() => handleSort('customer_name')}
                className="cursor-pointer select-none whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
              >
                {t('financial.customer') || 'Customer'}{' '}
                <SortIcon column="customer_name" sortBy={sortBy} sortOrder={sortOrder} />
              </th>
              <th
                onClick={() => handleSort('issue_date')}
                className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
              >
                {t('financial.issueDate') || 'Date'}{' '}
                <SortIcon column="issue_date" sortBy={sortBy} sortOrder={sortOrder} />
              </th>
              <th
                onClick={() => handleSort('due_date')}
                className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
              >
                {t('financial.dueDate') || 'Due Date'}{' '}
                <SortIcon column="due_date" sortBy={sortBy} sortOrder={sortOrder} />
              </th>
              <th
                onClick={() => handleSort('status')}
                className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
              >
                {t('financial.status') || 'Status'}{' '}
                <SortIcon column="status" sortBy={sortBy} sortOrder={sortOrder} />
              </th>
              <th
                onClick={() => handleSort('total_amount')}
                className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
              >
                {t('financial.amount') || 'Amount'}{' '}
                <SortIcon column="total_amount" sortBy={sortBy} sortOrder={sortOrder} />
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('common.actions') || 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={7} />)
            ) : loadError ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center">
                    <svg
                      className="mb-4 h-12 w-12 text-red-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                      />
                    </svg>
                    <p className="mb-1 font-medium text-red-600">
                      {t('financial.loadError') || 'Failed to load invoices'}
                    </p>
                    <p className="mb-3 text-sm text-gray-400">
                      {t('financial.loadErrorHint') ||
                        'Please check your connection and try again.'}
                    </p>
                    <button
                      onClick={loadInvoices}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {t('common.retry') || 'Retry'}
                    </button>
                  </div>
                </td>
              </tr>
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
                      {hasFilters
                        ? t('financial.adjustInvFilters') || 'Try adjusting your filters.'
                        : t('financial.createFirstInv') ||
                          'Create your first invoice to get started.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
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
                    {formatDate(inv.issue_date || inv.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                    {formatDate(inv.due_date || '')}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getInvoiceStatusColor(inv.status || 'unpaid')}`}
                    >
                      {statusLabel(inv.status || 'unpaid')}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(inv.total_amount)}
                  </td>
                  <td className="space-x-2 whitespace-nowrap px-4 py-4 text-right">
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <>
                        <button
                          onClick={() => requestStatusChange(inv, 'paid')}
                          className="text-xs font-medium text-green-600 hover:text-green-800"
                        >
                          {t('financial.markAsPaid') || 'Mark as Paid'}
                        </button>
                        {(inv.status === 'unpaid' || inv.status === 'partial') && (
                          <button
                            onClick={() => requestStatusChange(inv, 'overdue')}
                            className="text-xs font-medium text-yellow-600 hover:text-yellow-800"
                          >
                            {t('financial.markAsOverdue') || 'Overdue'}
                          </button>
                        )}
                        <button
                          onClick={() => requestStatusChange(inv, 'cancelled')}
                          className="text-xs font-medium text-red-600 hover:text-red-800"
                        >
                          {t('financial.cancelInvoice') || 'Cancel'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && invoices.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          label="invoices"
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {/* Invoice Creation Modal */}
      <CreateInvoiceModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default InvoicesTab;
