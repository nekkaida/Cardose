import React, { useState } from 'react';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import ToastQueue from '../components/ToastQueue';
import OrderFormModal from '../components/orders/OrderFormModal';
import StatusUpdateModal from '../components/orders/StatusUpdateModal';
import OrderStats from '../components/orders/OrderStats';
import { SkeletonRow, SortIcon, Pagination } from '../components/TableHelpers';
import {
  STATUSES,
  PRIORITIES,
  STATUS_I18N_KEYS,
  PRIORITY_I18N_KEYS,
  getStatusColor,
  getPriorityColor,
  isOverdue,
} from '../components/orders/orderHelpers';
import type { OrderStatus } from '../components/orders/orderHelpers';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useOrdersPage } from '../hooks/useOrdersPage';

const OrdersPage: React.FC = () => {
  const {
    orders,
    customers,
    stats,
    initialLoading,
    refreshing,
    error,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    amountMin,
    setAmountMin,
    amountMax,
    setAmountMax,
    clearFilters,
    hasActiveFilters,
    page,
    setPage,
    totalPages,
    totalOrders,
    sortBy,
    sortOrder,
    handleSort,
    selectedIds,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    allSelected,
    showModal,
    formOrder,
    openCreate,
    openEdit,
    closeModal,
    deleteId,
    deleting,
    deleteError,
    setDeleteId,
    handleDelete,
    cancelDelete,
    statusUpdateId,
    statusUpdating,
    setStatusUpdateId,
    handleStatusUpdate,
    statusUpdateOrder,
    handleSave,
    handleBulkDelete,
    handleBulkStatusUpdate,
    bulkDeleting,
    bulkUpdating,
    toasts,
    removeToast,
    handleExport,
    loadOrders,
    canDelete,
    t,
  } = useOrdersPage();

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<OrderStatus | ''>('');
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // ── Error state (full page) ───────────────────────────────────────────

  if (error && !orders.length && !initialLoading) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-700">
        <p className="font-medium">{t('common.error')}</p>
        <p className="text-sm">{error}</p>
        <button onClick={() => loadOrders()} className="mt-2 text-sm text-red-600 underline">
          {t('orders.tryAgain')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Queue */}
      <ToastQueue toasts={toasts} onRemove={removeToast} dismissLabel={t('common.dismiss')} />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('orders.title')}</h1>
          <p className="text-sm text-gray-500">
            {t('orders.totalOrders').replace('{n}', String(totalOrders))}
            {stats.overdue > 0 && (
              <span className="ml-2 font-medium text-red-600">
                {t('orders.overdueCount').replace('{n}', String(stats.overdue))}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={orders.length === 0}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
          >
            {t('orders.exportCsv')}
          </button>
          <button
            onClick={openCreate}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            + {t('orders.new')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <OrderStats stats={stats} loading={initialLoading} t={t} />

      {/* Filters */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('orders.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label={t('orders.searchPlaceholder')}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label={t('orders.allStatus')}
          >
            <option value="all">{t('orders.allStatus')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(STATUS_I18N_KEYS[s])}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label={t('orders.allPriority')}
          >
            <option value="all">{t('orders.allPriority')}</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {t(PRIORITY_I18N_KEYS[p])}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowAdvancedFilters((v) => !v)}
            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
              showAdvancedFilters || hasActiveFilters
                ? 'border-primary-300 bg-primary-50 text-primary-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t('orders.advancedFilters')}
          </button>
        </div>

        {/* Advanced filters (collapsible) */}
        {showAdvancedFilters && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <label htmlFor="filter-date-from" className="mb-1 block text-xs text-gray-500">
                  {t('orders.dateFrom')}
                </label>
                <input
                  id="filter-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="filter-date-to" className="mb-1 block text-xs text-gray-500">
                  {t('orders.dateTo')}
                </label>
                <input
                  id="filter-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="filter-amount-min" className="mb-1 block text-xs text-gray-500">
                  {t('orders.amountMin')}
                </label>
                <input
                  id="filter-amount-min"
                  type="number"
                  placeholder="0"
                  value={amountMin}
                  onChange={(e) => {
                    setAmountMin(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="0"
                />
              </div>
              <div>
                <label htmlFor="filter-amount-max" className="mb-1 block text-xs text-gray-500">
                  {t('orders.amountMax')}
                </label>
                <input
                  id="filter-amount-max"
                  type="number"
                  placeholder="0"
                  value={amountMax}
                  onChange={(e) => {
                    setAmountMax(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="0"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-800"
              >
                {t('orders.clearFilters')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 z-30 flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 p-3 shadow-lg">
          <span className="text-sm font-medium text-primary-800">
            {t('orders.selected').replace('{n}', String(selectedIds.size))}
          </span>
          <div className="flex flex-1 items-center gap-2">
            <select
              value={bulkStatusValue}
              onChange={(e) => setBulkStatusValue(e.target.value as OrderStatus | '')}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              aria-label={t('orders.bulkUpdateStatus')}
            >
              <option value="">{t('orders.bulkUpdateStatus')}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(STATUS_I18N_KEYS[s])}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (bulkStatusValue) {
                  handleBulkStatusUpdate(bulkStatusValue as OrderStatus);
                  setBulkStatusValue('');
                }
              }}
              disabled={!bulkStatusValue || bulkUpdating}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {bulkUpdating ? t('orders.updating') : t('orders.update')}
            </button>
          </div>
          {canDelete && (
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              disabled={bulkDeleting}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              {bulkDeleting ? t('orders.deleting') : t('orders.bulkDelete')}
            </button>
          )}
          <button onClick={clearSelection} className="text-sm text-gray-600 hover:text-gray-800">
            &times;
          </button>
        </div>
      )}

      {/* ── Desktop Table ────────────────────────────────────────────────── */}
      <div className="relative hidden overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm md:block">
        {/* Loading overlay for subsequent loads */}
        {refreshing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* Checkbox column */}
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected && orders.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    aria-label={allSelected ? t('orders.deselectAll') : t('orders.selectAll')}
                  />
                </th>
                {(
                  [
                    ['order_number', 'orders.colOrder'],
                    ['customer_name', 'orders.colCustomer'],
                    ['status', 'orders.colStatus'],
                    ['priority', 'orders.colPriority'],
                    ['total_amount', 'orders.colAmount'],
                    ['due_date', 'orders.colDueDate'],
                  ] as const
                ).map(([col, key]) => (
                  <th
                    key={col}
                    role="columnheader"
                    tabIndex={0}
                    onClick={() => handleSort(col)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSort(col);
                      }
                    }}
                    className="cursor-pointer select-none px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                    aria-sort={
                      sortBy === col
                        ? sortOrder === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    {t(key)} <SortIcon column={col} sortBy={sortBy} sortOrder={sortOrder} />
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  {t('orders.colActions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {initialLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={8} />)
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <svg
                        className="mb-4 h-16 w-16 text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="mb-1 font-medium text-gray-500">{t('orders.noOrders')}</p>
                      <p className="mb-4 text-sm text-gray-400">
                        {searchTerm || hasActiveFilters
                          ? t('orders.adjustFilters')
                          : t('orders.createFirst')}
                      </p>
                      {!searchTerm && !hasActiveFilters && (
                        <button
                          onClick={openCreate}
                          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                        >
                          + {t('orders.createOrder')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className={`transition-colors hover:bg-gray-50 ${isOverdue(order) ? 'bg-red-50' : ''} ${selectedIds.has(order.id) ? 'bg-primary-50' : ''}`}
                  >
                    <td className="w-10 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        onChange={() => toggleSelection(order.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        aria-label={t('orders.selectOrder').replace('{order}', order.orderNumber)}
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                      <div className="text-xs text-gray-500">{formatDate(order.createdAt)}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                      {order.boxType && (
                        <div className="text-xs capitalize text-gray-500">
                          {order.boxType} {t('orders.box')}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <button
                        onClick={() => setStatusUpdateId(order.id)}
                        className={`inline-flex cursor-pointer rounded-full px-2 py-1 text-xs font-semibold hover:opacity-80 ${getStatusColor(order.status)}`}
                      >
                        {t(STATUS_I18N_KEYS[order.status]) || order.status}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getPriorityColor(order.priority)}`}
                      >
                        {t(PRIORITY_I18N_KEYS[order.priority]) || order.priority}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(order.totalAmount)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div
                        className={`text-sm ${isOverdue(order) ? 'font-semibold text-red-600' : 'text-gray-900'}`}
                      >
                        {formatDate(order.dueDate)}
                        {isOverdue(order) && (
                          <span className="block text-xs text-red-500">
                            {t('orders.overdueLabel')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="space-x-2 whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={() => openEdit(order)}
                        className="text-sm font-medium text-primary-600 hover:text-primary-800"
                      >
                        {t('common.edit')}
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => setDeleteId(order.id)}
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
        {!initialLoading && orders.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={totalOrders}
            label={t('nav.orders').toLowerCase()}
            onPrev={() => setPage(page - 1)}
            onNext={() => setPage(page + 1)}
            prevText={t('orders.previous')}
            nextText={t('orders.next')}
          />
        )}
      </div>

      {/* ── Mobile Card View ─────────────────────────────────────────────── */}
      <div className="space-y-3 md:hidden">
        {/* Loading overlay for subsequent loads */}
        {refreshing && (
          <div className="flex justify-center py-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        )}

        {initialLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 h-4 w-1/3 rounded bg-gray-200" />
              <div className="mb-1 h-3 w-2/3 rounded bg-gray-200" />
              <div className="h-3 w-1/2 rounded bg-gray-200" />
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
            <p className="mb-1 font-medium text-gray-500">{t('orders.noOrders')}</p>
            <p className="mb-4 text-sm text-gray-400">
              {searchTerm || hasActiveFilters ? t('orders.adjustFilters') : t('orders.createFirst')}
            </p>
            {!searchTerm && !hasActiveFilters && (
              <button
                onClick={openCreate}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                + {t('orders.createOrder')}
              </button>
            )}
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className={`rounded-xl border bg-white p-4 shadow-sm ${isOverdue(order) ? 'border-red-200 bg-red-50' : 'border-gray-100'} ${selectedIds.has(order.id) ? 'ring-2 ring-primary-300' : ''}`}
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(order.id)}
                    onChange={() => toggleSelection(order.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    aria-label={t('orders.selectOrder').replace('{order}', order.orderNumber)}
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">{order.customerName}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setStatusUpdateId(order.id)}
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusColor(order.status)}`}
                  >
                    {t(STATUS_I18N_KEYS[order.status])}
                  </button>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getPriorityColor(order.priority)}`}
                  >
                    {t(PRIORITY_I18N_KEYS[order.priority])}
                  </span>
                </div>
              </div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900">
                  {formatCurrency(order.totalAmount)}
                </span>
                <span className={isOverdue(order) ? 'font-semibold text-red-600' : 'text-gray-500'}>
                  {formatDate(order.dueDate)}
                  {isOverdue(order) && (
                    <span className="ml-1 text-xs text-red-500">{t('orders.overdueLabel')}</span>
                  )}
                </span>
              </div>
              {order.boxType && (
                <p className="mb-2 text-xs capitalize text-gray-400">
                  {order.boxType} {t('orders.box')}
                </p>
              )}
              <div className="flex gap-3 border-t border-gray-100 pt-2">
                <button
                  onClick={() => openEdit(order)}
                  className="text-sm font-medium text-primary-600"
                >
                  {t('common.edit')}
                </button>
                {canDelete && (
                  <button
                    onClick={() => setDeleteId(order.id)}
                    className="text-sm font-medium text-red-600"
                  >
                    {t('common.delete')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        {/* Mobile pagination */}
        {!initialLoading && orders.length > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              {t('orders.previous')}
            </button>
            <span className="text-xs text-gray-500">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              {t('orders.next')}
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}

      <OrderFormModal
        open={showModal}
        order={formOrder}
        customers={customers}
        onClose={closeModal}
        onSave={handleSave}
      />

      <StatusUpdateModal
        open={!!statusUpdateId}
        currentStatus={(statusUpdateOrder?.status || 'pending') as OrderStatus}
        orderNumber={statusUpdateOrder?.orderNumber}
        customerName={statusUpdateOrder?.customerName}
        onClose={() => setStatusUpdateId(null)}
        onUpdate={handleStatusUpdate}
        updating={statusUpdating}
      />

      {/* Single delete confirmation */}
      {deleteId && (
        <ConfirmDeleteDialog
          itemLabel={orders.find((o) => o.id === deleteId)?.orderNumber || deleteId}
          titleKey="orders.deleteOrder"
          descriptionKey="orders.confirmDelete"
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={cancelDelete}
          error={deleteError}
        />
      )}

      {/* Bulk delete confirmation */}
      {showBulkDeleteConfirm && (
        <ConfirmDeleteDialog
          itemLabel={t('orders.selected').replace('{n}', String(selectedIds.size))}
          titleKey="orders.bulkDelete"
          descriptionKey="orders.bulkDeleteConfirm"
          deleting={bulkDeleting}
          onConfirm={async () => {
            await handleBulkDelete();
            setShowBulkDeleteConfirm(false);
          }}
          onCancel={() => setShowBulkDeleteConfirm(false)}
        />
      )}
    </div>
  );
};

export default OrdersPage;
