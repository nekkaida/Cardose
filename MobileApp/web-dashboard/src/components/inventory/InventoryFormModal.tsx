import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const CATEGORIES = ['cardboard', 'fabric', 'ribbon', 'accessories', 'packaging', 'tools'] as const;

const CATEGORY_I18N: Record<string, string> = {
  cardboard: 'inventory.catCardboard',
  fabric: 'inventory.catFabric',
  ribbon: 'inventory.catRibbon',
  accessories: 'inventory.catAccessories',
  packaging: 'inventory.catPackaging',
  tools: 'inventory.catTools',
};

interface InventoryFormModalProps {
  open: boolean;
  editingItem: {
    name: string;
    category: string;
    unit: string;
    unit_cost: number;
    reorder_level: number;
    current_stock: number;
    supplier?: string;
    notes?: string;
  } | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

const InventoryFormModal: React.FC<InventoryFormModalProps> = ({
  open,
  editingItem,
  onClose,
  onSave,
  saving,
}) => {
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    name: editingItem?.name || '',
    category: editingItem?.category || 'cardboard',
    unit: editingItem?.unit || 'pcs',
    unit_cost: editingItem ? String(editingItem.unit_cost || '') : '',
    reorder_level: editingItem ? String(editingItem.reorder_level || '') : '',
    current_stock: editingItem ? String(editingItem.current_stock || '') : '',
    supplier: editingItem?.supplier || '',
    notes: editingItem?.notes || '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  if (!open) return null;

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return t('inventory.nameRequired');
    if (!formData.category) return t('inventory.categoryRequired');
    if (formData.unit_cost !== '') {
      const cost = Number(formData.unit_cost);
      if (isNaN(cost)) return t('inventory.invalidUnitCost');
      if (cost < 0) return t('inventory.negativeNumber');
    }
    if (formData.reorder_level !== '') {
      const level = Number(formData.reorder_level);
      if (isNaN(level)) return t('inventory.invalidReorderLevel');
      if (level < 0) return t('inventory.negativeNumber');
    }
    if (formData.current_stock !== '') {
      const stock = Number(formData.current_stock);
      if (isNaN(stock)) return t('inventory.invalidStock');
      if (stock < 0) return t('inventory.negativeNumber');
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    try {
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
      await onSave(payload);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        t('inventory.failedSave');
      setFormError(message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={editingItem ? t('inventory.editMaterial') : t('inventory.addMaterial')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingItem ? t('inventory.editMaterial') : t('inventory.addMaterial')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label={t('common.cancel')}
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
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {formError && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {formError}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('inventory.name')} *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={t('inventory.materialName')}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('inventory.category')} *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(CATEGORY_I18N[c] || c)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('inventory.unit')}
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={t('inventory.unitPlaceholder')}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('inventory.unitCost')}
              </label>
              <input
                type="number"
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('inventory.reorderLevel')}
              </label>
              <input
                type="number"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('inventory.currentStock')}
              </label>
              <input
                type="number"
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0"
                min="0"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('inventory.supplier')}
            </label>
            <input
              type="text"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={t('inventory.supplierName')}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('inventory.notes')}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={t('inventory.optionalNotes')}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !formData.name.trim()}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving
              ? t('inventory.saving')
              : editingItem
                ? t('inventory.update')
                : t('inventory.create')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryFormModal;
