import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const MOVEMENT_TYPES = ['purchase', 'usage', 'sale', 'adjustment', 'waste'] as const;

const MOVEMENT_I18N: Record<string, string> = {
  purchase: 'inventory.movePurchase',
  usage: 'inventory.moveUsage',
  sale: 'inventory.moveSale',
  adjustment: 'inventory.moveAdjustment',
  waste: 'inventory.moveWaste',
};

interface StockMovementModalProps {
  item: { id: string; name: string; current_stock: number; unit: string } | null;
  onClose: () => void;
  onSubmit: (data: { type: string; quantity: number; notes?: string }) => Promise<void>;
  saving: boolean;
}

const getNewStock = (currentStock: number, type: string, quantity: number): number => {
  if (type === 'purchase') return currentStock + quantity;
  if (type === 'usage' || type === 'sale' || type === 'waste') return currentStock - quantity;
  if (type === 'adjustment') return quantity;
  return currentStock;
};

const StockMovementModal: React.FC<StockMovementModalProps> = ({
  item,
  onClose,
  onSubmit,
  saving,
}) => {
  const { t } = useLanguage();

  const [movementData, setMovementData] = useState({ type: 'purchase', quantity: '', notes: '' });
  const [movementError, setMovementError] = useState<string | null>(null);

  if (!item) return null;

  const qty = Number(movementData.quantity) || 0;
  const previewStock = qty > 0 ? getNewStock(item.current_stock, movementData.type, qty) : null;
  const wouldGoNegative = previewStock !== null && previewStock < 0;
  const isWaste = movementData.type === 'waste';

  const handleMovement = async () => {
    const parsedQty = Number(movementData.quantity);
    if (!movementData.quantity || isNaN(parsedQty) || parsedQty <= 0) {
      setMovementError(t('inventory.positiveQuantity'));
      return;
    }
    const newStock = getNewStock(item.current_stock, movementData.type, parsedQty);
    if (newStock < 0) {
      setMovementError(
        t('inventory.insufficientStock')
          .replace('{n}', String(item.current_stock))
          .replace('{unit}', item.unit)
      );
      return;
    }
    try {
      setMovementError(null);
      await onSubmit({
        type: movementData.type,
        quantity: parsedQty,
        notes: movementData.notes.trim() || undefined,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        t('inventory.failedMovement');
      setMovementError(message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="movement-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 id="movement-modal-title" className="text-lg font-semibold text-gray-900">
              {t('inventory.stockMovement')}
            </h2>
            <p className="text-sm text-gray-500">
              {item.name} ({t('inventory.current')}: {item.current_stock} {item.unit})
            </p>
          </div>
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
        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
          {movementError && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {movementError}
            </div>
          )}
          <div>
            <label htmlFor="movement-type" className="mb-1 block text-sm font-medium text-gray-700">
              {t('inventory.movementType')}
            </label>
            <select
              id="movement-type"
              value={movementData.type}
              onChange={(e) => setMovementData({ ...movementData, type: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {MOVEMENT_TYPES.map((mt) => (
                <option key={mt} value={mt}>
                  {t(MOVEMENT_I18N[mt] || mt)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="movement-quantity"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {t('inventory.quantity')} *
            </label>
            <input
              id="movement-quantity"
              type="number"
              value={movementData.quantity}
              onChange={(e) => setMovementData({ ...movementData, quantity: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="0"
              min="1"
              autoFocus
            />
          </div>
          <div>
            <label
              htmlFor="movement-notes"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {t('inventory.notes')}
            </label>
            <textarea
              id="movement-notes"
              value={movementData.notes}
              onChange={(e) => setMovementData({ ...movementData, notes: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={t('inventory.optionalNotes')}
              rows={2}
            />
          </div>
          {/* Stock preview */}
          {previewStock !== null && !wouldGoNegative && (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <span className="text-gray-600">{t('inventory.newStockAfter')}:</span>
              <span className="font-semibold text-gray-900">
                {item.current_stock} → {previewStock} {item.unit}
              </span>
            </div>
          )}
          {wouldGoNegative && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {t('inventory.insufficientStock')
                .replace('{n}', String(item.current_stock))
                .replace('{unit}', item.unit)}
            </div>
          )}
          {isWaste && qty > 0 && !wouldGoNegative && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {t('inventory.wasteWarning')}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleMovement}
            disabled={saving || !movementData.quantity || wouldGoNegative}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? t('inventory.recording') : t('inventory.record')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockMovementModal;
