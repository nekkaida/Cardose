import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { InventoryItem } from '@shared/types/inventory';
import Toast from '../components/Toast';
import InventoryFormModal from '../components/inventory/InventoryFormModal';
import StockMovementModal from '../components/inventory/StockMovementModal';
import InventoryStats from '../components/inventory/InventoryStats';
import InventoryTableRow from '../components/inventory/InventoryTableRow';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import { SkeletonRow, SortIcon, Pagination } from '../components/TableHelpers';
import {
  type InventoryStats as InventoryStatsType,
  EMPTY_STATS,
  CATEGORIES,
  CATEGORY_I18N,
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
  const pageSize = 25;

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Stock movement modal
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [movementSaving, setMovementSaving] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const {
    getInventory,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    createInventoryMovement,
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
      const items = (data.items || data.inventory || []).map((item: any) => ({
        id: item.id,
        name: item.name || '',
        category: item.category || '',
        current_stock: item.current_stock || 0,
        reorder_level: item.reorder_level || 0,
        unit_cost: item.unit_cost || 0,
        unit: item.unit || 'pcs',
        supplier: item.supplier || '',
        notes: item.notes || '',
        created_at: item.created_at || '',
        updated_at: item.updated_at || '',
      }));
      setInventory(items);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || items.length);

      // Use backend stats
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
  }, [getInventory, page, debouncedSearch, categoryFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // ESC key handler for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showModal) setShowModal(false);
        if (movementItem) setMovementItem(null);
        if (deleteId) setDeleteId(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal, movementItem, deleteId]);

  const openCreate = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleSave = async (payload: Record<string, unknown>) => {
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
      // Re-throw so the modal can display the error
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const openMovement = (item: InventoryItem) => {
    setMovementItem(item);
  };

  const handleMovement = async (data: { type: string; quantity: number; notes?: string }) => {
    if (!movementItem) return;
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
      // Re-throw so the modal can display the error
      throw err;
    } finally {
      setMovementSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await deleteInventoryItem(deleteId);
      setDeleteId(null);
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

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const hasFilters = !!debouncedSearch || categoryFilter !== 'all';

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
        <button
          onClick={openCreate}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          + {t('inventory.addMaterial')}
        </button>
      </div>

      {/* Stats */}
      <InventoryStats stats={stats} />

      {/* Filters */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('inventory.searchMaterials')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">{t('inventory.allCategories')}</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {t(CATEGORY_I18N[cat] || cat)}
              </option>
            ))}
          </select>
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
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  {t('inventory.material')}{' '}
                  <SortIcon column="name" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  {t('inventory.category')}{' '}
                  <SortIcon column="category" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th
                  onClick={() => handleSort('current_stock')}
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  {t('inventory.stock')}{' '}
                  <SortIcon column="current_stock" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th
                  onClick={() => handleSort('reorder_level')}
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  {t('inventory.reorder')}{' '}
                  <SortIcon column="reorder_level" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th
                  onClick={() => handleSort('unit_cost')}
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  {t('inventory.cost')}{' '}
                  <SortIcon column="unit_cost" sortBy={sortBy} sortOrder={sortOrder} />
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
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={7} />)
              ) : inventory.length === 0 ? (
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
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                      <p className="mb-1 font-medium text-gray-500">{t('inventory.noItems')}</p>
                      <p className="mb-4 text-sm text-gray-400">
                        {hasFilters ? t('inventory.adjustFilters') : t('inventory.createFirst')}
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
                    onEdit={openEdit}
                    onMovement={openMovement}
                    onDelete={setDeleteId}
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
            label="items"
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
            prevText={t('inventory.previous')}
            nextText={t('inventory.next')}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      <InventoryFormModal
        key={editingItem ? editingItem.id : 'create'}
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
    </div>
  );
};

export default InventoryPage;
