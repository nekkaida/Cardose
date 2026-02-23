import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { InventoryItem } from '@shared/types/inventory';
import Toast from '../components/Toast';
import InventoryFormModal from '../components/inventory/InventoryFormModal';
import StockMovementModal from '../components/inventory/StockMovementModal';
import MovementHistoryModal from '../components/inventory/MovementHistoryModal';
import InventoryStats from '../components/inventory/InventoryStats';
import InventoryTableRow from '../components/inventory/InventoryTableRow';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import { SkeletonRow, SortIcon, Pagination } from '../components/TableHelpers';
import { exportToCSV } from '../utils/formatters';
import {
  type InventoryStats as InventoryStatsType,
  EMPTY_STATS,
  CATEGORIES,
  CATEGORY_I18N,
  PAGE_SIZE_OPTIONS,
  DEFAULT_PAGE_SIZE,
} from '../components/inventory/inventoryHelpers';

const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState<InventoryStatsType>(EMPTY_STATS);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // Stock movement modal
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [movementSaving, setMovementSaving] = useState(false);

  // Movement history modal
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Reorder alerts
  const [reorderAlertCount, setReorderAlertCount] = useState(0);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Spam protection refs
  const saveInFlight = useRef(false);
  const movementInFlight = useRef(false);

  const {
    getInventory,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    bulkDeleteInventoryItems,
    createInventoryMovement,
    getReorderAlerts,
  } = useApi();
  const { user } = useAuth();
  const { t } = useLanguage();

  const canDelete = user?.role === 'owner' || user?.role === 'manager';

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {
        page: String(page),
        limit: String(pageSize),
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const data = await getInventory(params);
      setInventory(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);

      if (data.stats) {
        setStats({
          total: data.stats.total || 0,
          cardboard: data.stats.cardboard || 0,
          fabric: data.stats.fabric || 0,
          ribbon: data.stats.ribbon || 0,
          accessories: data.stats.accessories || 0,
          packaging: data.stats.packaging || 0,
          tools: data.stats.tools || 0,
          lowStock: data.stats.lowStock || 0,
          outOfStock: data.stats.outOfStock || 0,
          totalValue: data.stats.totalValue || 0,
        });
      }
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError(t('inventory.failedLoad'));
    } finally {
      setLoading(false);
    }
  }, [getInventory, page, pageSize, debouncedSearch, categoryFilter, sortBy, sortOrder]);

  // Load reorder alerts count
  const loadReorderAlerts = useCallback(async () => {
    try {
      const data = await getReorderAlerts({ status: 'pending' });
      setReorderAlertCount(data.alerts?.length || 0);
    } catch {
      // Non-critical, silently fail
    }
  }, [getReorderAlerts]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    loadReorderAlerts();
  }, [loadReorderAlerts]);

  // ESC key handler - fixed priority chain (if/else prevents firing all at once)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showBulkDeleteConfirm) {
          setShowBulkDeleteConfirm(false);
        } else if (deleteId) {
          setDeleteId(null);
        } else if (movementItem) {
          setMovementItem(null);
        } else if (historyItem) {
          setHistoryItem(null);
        } else if (showModal) {
          setShowModal(false);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal, movementItem, historyItem, deleteId, showBulkDeleteConfirm]);

  const hasFilters = !!debouncedSearch || categoryFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setCategoryFilter('all');
    setPage(1);
  };

  // ── Create/Edit ────────────────────────────────────────────────

  const openCreate = () => {
    setEditingItem(null);
    setFormKey((k) => k + 1); // Force remount to reset form state
    setShowModal(true);
  };

  const openEdit = useCallback((item: InventoryItem) => {
    setEditingItem(item);
    setFormKey((k) => k + 1);
    setShowModal(true);
  }, []);

  const handleSave = async (payload: Record<string, unknown>) => {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    try {
      setSaving(true);
      if (editingItem) {
        await updateInventoryItem(editingItem.id, payload);
        setToast({ message: t('inventory.updateSuccess'), type: 'success' });
      } else {
        await createInventoryItem(
          payload as Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>
        );
        setToast({ message: t('inventory.createSuccess'), type: 'success' });
      }
      setShowModal(false);
      loadInventory();
    } catch (err: unknown) {
      throw err;
    } finally {
      setSaving(false);
      saveInFlight.current = false;
    }
  };

  // ── Stock movement ─────────────────────────────────────────────

  const openMovement = useCallback((item: InventoryItem) => {
    setMovementItem(item);
  }, []);

  const handleMovement = async (data: { type: string; quantity: number; notes?: string }) => {
    if (!movementItem || movementInFlight.current) return;
    movementInFlight.current = true;
    try {
      setMovementSaving(true);
      await createInventoryMovement({
        item_id: movementItem.id,
        type: data.type as 'purchase' | 'usage' | 'sale' | 'adjustment' | 'waste',
        quantity: data.quantity,
        notes: data.notes || undefined,
      });
      setMovementItem(null);
      setToast({ message: t('inventory.movementSuccess'), type: 'success' });
      loadInventory();
    } catch (err: unknown) {
      throw err;
    } finally {
      setMovementSaving(false);
      movementInFlight.current = false;
    }
  };

  // ── Movement history ───────────────────────────────────────────

  const openHistory = useCallback((item: InventoryItem) => {
    setHistoryItem(item);
  }, []);

  // ── Delete ─────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await deleteInventoryItem(deleteId);
      setDeleteId(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteId);
        return next;
      });
      setToast({ message: t('inventory.deleteSuccess'), type: 'success' });
      loadInventory();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        t('inventory.failedDelete');
      setToast({ message, type: 'error' });
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  // ── Bulk operations ────────────────────────────────────────────

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(inventory.map((i) => i.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [inventory]
  );

  const handleSelectItem = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const handleBulkDeleteConfirmed = async () => {
    if (selectedIds.size === 0 || bulkDeleting) return;
    try {
      setBulkDeleting(true);
      const count = selectedIds.size;
      await bulkDeleteInventoryItems(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      setToast({
        message: t('inventory.bulkDeleteSuccess').replace('{n}', String(count)),
        type: 'success',
      });
      loadInventory();
    } catch (err: unknown) {
      const message = (err as Error)?.message || t('inventory.bulkDeleteError');
      setToast({ message, type: 'error' });
    } finally {
      setBulkDeleting(false);
    }
  };

  // ── CSV export ─────────────────────────────────────────────────

  const handleExportCSV = () => {
    if (inventory.length === 0) return;
    const data = inventory.map((item) => ({
      name: item.name,
      category: item.category,
      unit: item.unit,
      current_stock: item.current_stock,
      reorder_level: item.reorder_level,
      unit_cost: item.unit_cost,
      supplier: item.supplier || '',
      notes: item.notes || '',
    }));
    exportToCSV(data, `inventory-${new Date().toISOString().slice(0, 10)}.csv`);
    setToast({ message: t('inventory.exportSuccess'), type: 'success' });
  };

  // ── Sort ───────────────────────────────────────────────────────

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // ── Stable callback refs for React.memo children ───────────────

  const handleRequestDelete = useCallback((id: string) => {
    setDeleteId(id);
  }, []);

  const allSelected = inventory.length > 0 && selectedIds.size === inventory.length;

  // ── Error full-page state ──────────────────────────────────────

  if (error && !inventory.length) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-700">
        <p className="font-medium">{t('common.error')}</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => {
            setError(null);
            loadInventory();
          }}
          className="mt-2 text-sm text-red-600 underline"
        >
          {t('inventory.tryAgain')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Error banner when data exists */}
      {error && inventory.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={() => {
              setError(null);
              loadInventory();
            }}
            className="ml-4 text-red-600 underline"
          >
            {t('inventory.retry')}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('inventory.title')}</h1>
          <p className="text-sm text-gray-500">
            {totalItems} {t('inventory.materialsTracked')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={inventory.length === 0}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
            title={t('inventory.exportCsv')}
          >
            <svg
              className="mr-1.5 inline-block h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {t('inventory.exportCsv')}
          </button>
          <button
            onClick={openCreate}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            + {t('inventory.addMaterial')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <InventoryStats stats={stats} hasFilters={hasFilters} reorderAlertCount={reorderAlertCount} />

      {/* Filters */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('inventory.searchMaterials')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label={t('inventory.searchMaterials')}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label={t('inventory.allCategories')}
          >
            <option value="all">{t('inventory.allCategories')}</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {t(CATEGORY_I18N[cat] || cat)}
              </option>
            ))}
          </select>
          {/* Page size selector */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label={t('inventory.pageSize')}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} / {t('inventory.page')}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
            >
              {t('inventory.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-primary-200 bg-primary-50 px-4 py-3">
          <span className="text-sm font-medium text-primary-800">
            {selectedIds.size} {t('inventory.itemsSelected')}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t('inventory.deselectAll')}
            </button>
            {canDelete && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {bulkDeleting ? t('inventory.deleting') : t('inventory.deleteSelected')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    aria-label={t('inventory.selectAll')}
                    disabled={loading || inventory.length === 0}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    className="inline-flex cursor-pointer select-none items-center gap-1 bg-transparent font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                  >
                    {t('inventory.material')}
                    <SortIcon column="name" sortBy={sortBy} sortOrder={sortOrder} />
                  </button>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <button
                    type="button"
                    onClick={() => handleSort('category')}
                    className="inline-flex cursor-pointer select-none items-center gap-1 bg-transparent font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                  >
                    {t('inventory.category')}
                    <SortIcon column="category" sortBy={sortBy} sortOrder={sortOrder} />
                  </button>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <button
                    type="button"
                    onClick={() => handleSort('current_stock')}
                    className="inline-flex cursor-pointer select-none items-center gap-1 bg-transparent font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                  >
                    {t('inventory.stock')}
                    <SortIcon column="current_stock" sortBy={sortBy} sortOrder={sortOrder} />
                  </button>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <button
                    type="button"
                    onClick={() => handleSort('reorder_level')}
                    className="inline-flex cursor-pointer select-none items-center gap-1 bg-transparent font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                  >
                    {t('inventory.reorder')}
                    <SortIcon column="reorder_level" sortBy={sortBy} sortOrder={sortOrder} />
                  </button>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <button
                    type="button"
                    onClick={() => handleSort('unit_cost')}
                    className="inline-flex cursor-pointer select-none items-center gap-1 bg-transparent font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                  >
                    {t('inventory.cost')}
                    <SortIcon column="unit_cost" sortBy={sortBy} sortOrder={sortOrder} />
                  </button>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {t('inventory.status')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  {t('inventory.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={8} />)
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
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
                      <p className="mb-1 font-medium text-gray-500">{t('inventory.noItems')}</p>
                      <p className="mb-4 text-sm text-gray-400">
                        {hasFilters ? (
                          <>
                            {t('inventory.adjustFilters')}{' '}
                            <button
                              onClick={clearFilters}
                              className="text-primary-600 underline hover:text-primary-800"
                            >
                              {t('inventory.clearFilters')}
                            </button>
                          </>
                        ) : (
                          t('inventory.createFirst')
                        )}
                      </p>
                      {!hasFilters && (
                        <button
                          onClick={openCreate}
                          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                        >
                          + {t('inventory.addMaterial')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <InventoryTableRow
                    key={item.id}
                    item={item}
                    canDelete={canDelete}
                    selected={selectedIds.has(item.id)}
                    onSelect={handleSelectItem}
                    onEdit={openEdit}
                    onMovement={openMovement}
                    onHistory={openHistory}
                    onDelete={handleRequestDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && inventory.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={totalItems}
            label={t('inventory.items')}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
            prevText={t('inventory.previous')}
            nextText={t('inventory.next')}
            pageInfoText={t('inventory.paginationInfo')
              .replace('{page}', String(page))
              .replace('{totalPages}', String(totalPages))
              .replace('{total}', String(totalItems))
              .replace('{label}', t('inventory.items'))}
          />
        )}
      </div>

      {/* Create/Edit Modal - formKey forces remount to reset state */}
      <InventoryFormModal
        key={formKey}
        open={showModal}
        editingItem={editingItem}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        saving={saving}
      />

      {/* Stock Movement Modal */}
      <StockMovementModal
        key={movementItem ? movementItem.id : 'none'}
        item={movementItem}
        onClose={() => setMovementItem(null)}
        onSubmit={handleMovement}
        saving={movementSaving}
      />

      {/* Movement History Modal */}
      <MovementHistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />

      {/* Delete Confirmation */}
      {deleteId && (
        <ConfirmDeleteDialog
          itemLabel={inventory.find((i) => i.id === deleteId)?.name || deleteId}
          titleKey="inventory.deleteMaterial"
          descriptionKey="inventory.confirmDelete"
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* Bulk Delete Confirmation */}
      {showBulkDeleteConfirm && (
        <ConfirmDeleteDialog
          itemLabel={`${selectedIds.size} ${t('inventory.items')}`}
          titleKey="inventory.deleteSelected"
          description={t('inventory.confirmBulkDelete').replace('{n}', String(selectedIds.size))}
          deleting={bulkDeleting}
          onConfirm={handleBulkDeleteConfirmed}
          onCancel={() => setShowBulkDeleteConfirm(false)}
        />
      )}
    </div>
  );
};

export default InventoryPage;
