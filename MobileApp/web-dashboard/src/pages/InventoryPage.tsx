import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  reorder_level: number;
  unit_cost: number;
  unit: string;
  supplier: string;
  notes: string;
  created_at: string;
}

interface InventoryStats {
  total: number;
  cardboard: number;
  fabric: number;
  ribbon: number;
  accessories: number;
  packaging: number;
  tools: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}

const CATEGORIES = ['cardboard', 'fabric', 'ribbon', 'accessories', 'packaging', 'tools'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  cardboard: 'Cardboard',
  fabric: 'Fabric',
  ribbon: 'Ribbon',
  accessories: 'Accessories',
  packaging: 'Packaging',
  tools: 'Tools',
};

const MOVEMENT_TYPES = ['purchase', 'usage', 'sale', 'adjustment', 'waste'] as const;

const MOVEMENT_LABELS: Record<string, string> = {
  purchase: 'Purchase (add stock)',
  usage: 'Usage (reduce stock)',
  sale: 'Sale (reduce stock)',
  adjustment: 'Adjustment (set stock)',
  waste: 'Waste (reduce stock)',
};

// Toast notification component
const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-slide-in ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {type === 'success' ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      )}
      {message}
    </div>
  );
};

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
  const [stats, setStats] = useState<InventoryStats>({ total: 0, cardboard: 0, fabric: 0, ribbon: 0, accessories: 0, packaging: 0, tools: 0, lowStock: 0, outOfStock: 0, totalValue: 0 });
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const pageSize = 25;

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', category: 'cardboard', unit: 'pcs', unit_cost: '', reorder_level: '', current_stock: '', supplier: '', notes: '',
  });

  // Stock movement modal
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [movementData, setMovementData] = useState({ type: 'purchase', quantity: '', notes: '' });
  const [movementError, setMovementError] = useState<string | null>(null);
  const [movementSaving, setMovementSaving] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem, createInventoryMovement } = useApi();
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
      const params: Record<string, any> = { page, limit: pageSize, sort_by: sortBy, sort_order: sortOrder };
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
      setError('Failed to load inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [getInventory, page, debouncedSearch, categoryFilter, sortBy, sortOrder]);

  useEffect(() => { loadInventory(); }, [loadInventory]);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
  };

  const isLowStock = (item: InventoryItem) => item.current_stock > 0 && item.current_stock <= item.reorder_level;
  const isOutOfStock = (item: InventoryItem) => item.current_stock <= 0;

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ name: '', category: 'cardboard', unit: 'pcs', unit_cost: '', reorder_level: '', current_stock: '', supplier: '', notes: '' });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category || 'cardboard',
      unit: item.unit || 'pcs',
      unit_cost: String(item.unit_cost || ''),
      reorder_level: String(item.reorder_level || ''),
      current_stock: String(item.current_stock || ''),
      supplier: item.supplier || '',
      notes: item.notes || '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Material name is required.';
    if (!formData.category) return 'Category is required.';
    if (formData.unit_cost && isNaN(Number(formData.unit_cost))) return 'Unit cost must be a valid number.';
    if (formData.reorder_level && isNaN(Number(formData.reorder_level))) return 'Reorder level must be a valid number.';
    if (formData.current_stock && isNaN(Number(formData.current_stock))) return 'Current stock must be a valid number.';
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    try {
      setSaving(true);
      setFormError(null);
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        unit: formData.unit.trim() || 'pcs',
        unit_cost: Number(formData.unit_cost) || 0,
        reorder_level: Number(formData.reorder_level) || 0,
        current_stock: Number(formData.current_stock) || 0,
        supplier: formData.supplier.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };
      if (editingItem) {
        await updateInventoryItem(editingItem.id, payload);
        setToast({ message: t('inventory.updateSuccess'), type: 'success' });
      } else {
        await createInventoryItem(payload);
        setToast({ message: t('inventory.createSuccess'), type: 'success' });
      }
      setShowModal(false);
      loadInventory();
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Failed to save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openMovement = (item: InventoryItem) => {
    setMovementItem(item);
    setMovementData({ type: 'purchase', quantity: '', notes: '' });
    setMovementError(null);
  };

  const handleMovement = async () => {
    if (!movementItem) return;
    if (!movementData.quantity || isNaN(Number(movementData.quantity)) || Number(movementData.quantity) <= 0) {
      setMovementError('Quantity must be a positive number.');
      return;
    }
    try {
      setMovementSaving(true);
      setMovementError(null);
      await createInventoryMovement({
        item_id: movementItem.id,
        type: movementData.type,
        quantity: Number(movementData.quantity),
        notes: movementData.notes.trim() || undefined,
      });
      setMovementItem(null);
      setToast({ message: t('inventory.movementSuccess'), type: 'success' });
      loadInventory();
    } catch (err: any) {
      setMovementError(err?.response?.data?.error || 'Failed to record movement.');
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
    } catch (err: any) {
      setToast({ message: err?.response?.data?.error || 'Failed to delete item', type: 'error' });
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const SortIcon: React.FC<{ column: string }> = ({ column }) => {
    if (sortBy !== column) return <span className="text-gray-300 ml-1">&#8645;</span>;
    return <span className="text-primary-600 ml-1">{sortOrder === 'asc' ? '&#8593;' : '&#8595;'}</span>;
  };

  const getStockStatusBadge = (item: InventoryItem) => {
    if (isOutOfStock(item)) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">{t('inventory.outOfStock')}</span>;
    }
    if (isLowStock(item)) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">{t('inventory.lowStock')}</span>;
    }
    return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">{t('inventory.inStock')}</span>;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cardboard': return 'bg-amber-50 text-amber-700';
      case 'fabric': return 'bg-purple-50 text-purple-700';
      case 'ribbon': return 'bg-pink-50 text-pink-700';
      case 'accessories': return 'bg-blue-50 text-blue-700';
      case 'packaging': return 'bg-teal-50 text-teal-700';
      case 'tools': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const hasFilters = !!debouncedSearch || categoryFilter !== 'all';

  // Skeleton loader
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-3/4"></div></td>
      ))}
    </tr>
  );

  if (error && !inventory.length) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
        <p className="font-medium">{t('common.error')}</p>
        <p className="text-sm">{error}</p>
        <button onClick={() => { setError(null); loadInventory(); }} className="mt-2 text-sm text-red-600 underline">
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
      {error && inventory.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => { setError(null); loadInventory(); }} className="text-red-600 underline ml-4">Retry</button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('inventory.title')}</h1>
          <p className="text-gray-500 text-sm">{totalItems} {t('inventory.materialsTracked')}</p>
        </div>
        <button onClick={openCreate} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
          + {t('inventory.addMaterial')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">{t('inventory.totalItems')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">{t('inventory.lowStock')}</p>
          <p className={`text-2xl font-bold mt-1 ${stats.lowStock > 0 ? 'text-orange-600' : 'text-green-600'}`}>{stats.lowStock}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">{t('inventory.outOfStock')}</p>
          <p className={`text-2xl font-bold mt-1 ${stats.outOfStock > 0 ? 'text-red-600' : 'text-green-600'}`}>{stats.outOfStock}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">{t('inventory.totalValue')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalValue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('common.search') + ' materials...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="all">{t('inventory.allCategories')}</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th onClick={() => handleSort('name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">
                  Material <SortIcon column="name" />
                </th>
                <th onClick={() => handleSort('category')} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap">
                  Category <SortIcon column="category" />
                </th>
                <th onClick={() => handleSort('current_stock')} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap">
                  Stock <SortIcon column="current_stock" />
                </th>
                <th onClick={() => handleSort('reorder_level')} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap">
                  Reorder <SortIcon column="reorder_level" />
                </th>
                <th onClick={() => handleSort('unit_cost')} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap">
                  Cost <SortIcon column="unit_cost" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <p className="text-gray-500 font-medium mb-1">{t('inventory.noItems')}</p>
                      <p className="text-gray-400 text-sm mb-4">
                        {hasFilters ? t('inventory.adjustFilters') : t('inventory.createFirst')}
                      </p>
                      {!hasFilters && (
                        <button onClick={openCreate} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm font-medium">
                          + {t('inventory.addMaterial')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : inventory.map((item) => (
                <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${isOutOfStock(item) ? 'bg-red-50/50' : isLowStock(item) ? 'bg-yellow-50/50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="max-w-[240px]">
                      <div className="text-sm font-medium text-gray-900 truncate" title={item.name}>{item.name}</div>
                      {item.supplier && <div className="text-xs text-gray-400 truncate" title={item.supplier}>{item.supplier}</div>}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(item.category)}`}>
                      {CATEGORY_LABELS[item.category] || item.category || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${isOutOfStock(item) ? 'text-red-600' : isLowStock(item) ? 'text-orange-600' : 'text-gray-900'}`}>
                      {item.current_stock} {item.unit || ''}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{item.reorder_level} {item.unit || ''}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(item.unit_cost)}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {getStockStatusBadge(item)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right space-x-2">
                    <button onClick={() => openMovement(item)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium">Stock</button>
                    <button onClick={() => openEdit(item)} className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                      {t('common.edit')}
                    </button>
                    {canDelete && (
                      <button onClick={() => setDeleteId(item.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">
                        {t('common.delete')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && inventory.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50">
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages} ({totalItems} items)
            </span>
            <div className="space-x-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-colors">
                Previous
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editingItem ? t('inventory.editMaterial') : t('inventory.addMaterial')}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm" role="alert">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.name')} *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" placeholder="Material name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.category')} *</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.unit')}</label>
                  <input type="text" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" placeholder="pcs, kg, m..." />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.unitCost')}</label>
                  <input type="number" value={formData.unit_cost} onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" placeholder="0" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.reorderLevel')}</label>
                  <input type="number" value={formData.reorder_level} onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" placeholder="0" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.currentStock')}</label>
                  <input type="number" value={formData.current_stock} onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" placeholder="0" min="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.supplier')}</label>
                <input type="text" value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" placeholder="Supplier name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.notes')}</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none" placeholder="Optional notes..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                {t('common.cancel')}
              </button>
              <button onClick={handleSave} disabled={saving || !formData.name.trim()}
                className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Movement Modal */}
      {movementItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setMovementItem(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('inventory.stockMovement')}</h2>
                <p className="text-sm text-gray-500">{movementItem.name} ({t('inventory.current')}: {movementItem.current_stock} {movementItem.unit})</p>
              </div>
              <button onClick={() => setMovementItem(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {movementError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm" role="alert">
                  {movementError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.movementType')}</label>
                <select value={movementData.type} onChange={(e) => setMovementData({ ...movementData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                  {MOVEMENT_TYPES.map(mt => <option key={mt} value={mt}>{MOVEMENT_LABELS[mt]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.quantity')} *</label>
                <input type="number" value={movementData.quantity} onChange={(e) => setMovementData({ ...movementData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" placeholder="0" min="1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('inventory.notes')}</label>
                <input type="text" value={movementData.notes} onChange={(e) => setMovementData({ ...movementData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" placeholder="Optional notes..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setMovementItem(null)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                {t('common.cancel')}
              </button>
              <button onClick={handleMovement} disabled={movementSaving || !movementData.quantity}
                className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                {movementSaving ? 'Recording...' : t('inventory.record')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setDeleteId(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('inventory.deleteMaterial')}</h3>
              <p className="text-sm text-gray-500">{t('inventory.confirmDelete')}</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                {t('common.cancel')}
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting...' : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
