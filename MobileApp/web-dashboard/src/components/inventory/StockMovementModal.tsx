import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { MOVEMENT_TYPES, MOVEMENT_I18N, getNewStock, INPUT_LIMITS } from './inventoryHelpers';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface StockMovementModalProps {
  item: { id: string; name: string; current_stock: number; unit: string } | null;
  onClose: () => void;
  onSubmit: (data: { type: string; quantity: number; notes?: string }) => Promise<void>;
  saving: boolean;
}

const StockMovementModal: React.FC<StockMovementModalProps> = ({
  item,
  onClose,
  onSubmit,
  saving,
}) => {
  const { t } = useLanguage();
  const focusTrapRef = useFocusTrap(!!item);

  const [movementData, setMovementData] = useState({ type: 'purchase', quantity: '', notes: '' });
  const [movementError, setMovementError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (!item) return null;

  const qty = Number(movementData.quantity) || 0;
  const isAdjustment = movementData.type === 'adjustment';
  const isWaste = movementData.type === 'waste';
  // Show preview when user has entered a value (adjustment allows 0)
  const hasQty = movementData.quantity !== '' && !isNaN(Number(movementData.quantity));
  const previewStock = hasQty ? getNewStock(item.current_stock, movementData.type, qty) : null;
  const wouldGoNegative = previewStock !== null && previewStock < 0;

  const validate = (): boolean => {
    const parsedQty = Number(movementData.quantity);
    if (movementData.quantity === '' || isNaN(parsedQty)) {
      setMovementError(t('inventory.positiveQuantity'));
      return false;
    }
    // Adjustment allows 0 (set stock to zero); other types require > 0
    if (isAdjustment ? parsedQty < 0 : parsedQty <= 0) {
      setMovementError(
        isAdjustment ? t('inventory.validQuantityAdjustment') : t('inventory.positiveQuantity')
      );
      return false;
    }
    const newStock = getNewStock(item.current_stock, movementData.type, parsedQty);
    if (newStock < 0) {
      setMovementError(
        t('inventory.insufficientStock')
          .replace('{n}', String(item.current_stock))
          .replace('{unit}', item.unit)
      );
      return false;
    }
    setMovementError(null);
    return true;
  };

  const handleRecord = () => {
    if (!validate()) return;
    setConfirming(true);
  };

  const handleBack = () => {
    setConfirming(false);
  };

  const handleConfirm = async () => {
    const parsedQty = Number(movementData.quantity);
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
      setConfirming(false);
    }
  };

  // ── Confirmation view ──────────────────────────────────────────
  if (confirming) {
    const parsedQty = Number(movementData.quantity);
    const newStock = getNewStock(item.current_stock, movementData.type, parsedQty);

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
        <div ref={focusTrapRef} className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 id="movement-modal-title" className="text-lg font-semibold text-gray-900">
                {t('inventory.confirmMovement')}
              </h2>
              <p className="text-sm text-gray-500">{item.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label={t('common.close')}
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

            <div className="space-y-2 rounded-lg bg-gray-50 px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('inventory.movementType')}:</span>
                <span className="font-medium text-gray-900">
                  {t(
                    MOVEMENT_I18N[movementData.type as keyof typeof MOVEMENT_I18N] ||
                      movementData.type
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {isAdjustment ? t('inventory.setStockTo') : t('inventory.quantity')}:
                </span>
                <span className="font-medium text-gray-900">
                  {parsedQty} {item.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('inventory.newStockAfter')}:</span>
                <span className="font-semibold text-gray-900">
                  {item.current_stock} &rarr; {newStock} {item.unit}
                </span>
              </div>
              {movementData.notes.trim() && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('inventory.notes')}:</span>
                  <span className="max-w-[60%] truncate font-medium text-gray-900">
                    {movementData.notes.trim()}
                  </span>
                </div>
              )}
            </div>

            {isWaste && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {t('inventory.wasteWarning')}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              onClick={handleBack}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {t('common.back')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? t('inventory.recording') : t('common.confirm')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form view ──────────────────────────────────────────────────
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
      <div ref={focusTrapRef} className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
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
            aria-label={t('common.close')}
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
              {isAdjustment ? t('inventory.setStockTo') : t('inventory.quantity')} *
            </label>
            <input
              id="movement-quantity"
              type="number"
              value={movementData.quantity}
              onChange={(e) => setMovementData({ ...movementData, quantity: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="0"
              min={isAdjustment ? '0' : '1'}
              autoFocus
            />
            {isAdjustment && (
              <div className="mt-2 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                {t('inventory.adjustmentInfo')}
              </div>
            )}
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
              maxLength={INPUT_LIMITS.NOTES_MAX}
            />
          </div>
          {/* Stock preview */}
          {previewStock !== null && !wouldGoNegative && (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <span className="text-gray-600">{t('inventory.newStockAfter')}:</span>
              <span className="font-semibold text-gray-900">
                {item.current_stock} &rarr; {previewStock} {item.unit}
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
            onClick={handleRecord}
            disabled={saving || movementData.quantity === '' || wouldGoNegative}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          >
            {t('inventory.record')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockMovementModal;
