import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useApi } from '../../contexts/ApiContext';
import { formatDate } from '../../utils/formatters';
import { MOVEMENT_I18N } from './inventoryHelpers';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import type { InventoryMovement } from '@shared/types/inventory';

interface MovementHistoryModalProps {
  item: { id: string; name: string; unit: string } | null;
  onClose: () => void;
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  purchase: 'bg-green-100 text-green-700',
  usage: 'bg-blue-100 text-blue-700',
  sale: 'bg-orange-100 text-orange-700',
  adjustment: 'bg-purple-100 text-purple-700',
  waste: 'bg-red-100 text-red-700',
};

/**
 * Formats the quantity column based on movement type.
 *  - purchase:   "+N"
 *  - usage/sale/waste: "-N"
 *  - adjustment: "→ N"
 */
const formatQuantity = (type: string, quantity: number, unit: string): string => {
  if (type === 'purchase') return `+${quantity} ${unit}`;
  if (type === 'usage' || type === 'sale' || type === 'waste') return `-${quantity} ${unit}`;
  if (type === 'adjustment') return `\u2192 ${quantity} ${unit}`;
  return `${quantity} ${unit}`;
};

const MovementHistoryModal: React.FC<MovementHistoryModalProps> = ({ item, onClose }) => {
  const { t } = useLanguage();
  const { getInventoryMovements } = useApi();
  const focusTrapRef = useFocusTrap(!!item);

  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;

    let cancelled = false;

    const fetchMovements = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getInventoryMovements({ item_id: item.id, limit: 50 });
        if (!cancelled) {
          setMovements(response.movements || []);
        }
      } catch {
        if (!cancelled) {
          setError(t('inventory.failedLoadMovements'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchMovements();

    return () => {
      cancelled = true;
    };
  }, [item, getInventoryMovements, t]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="movement-history-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={focusTrapRef}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 id="movement-history-title" className="text-lg font-semibold text-gray-900">
              {t('inventory.movementHistory')}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex animate-pulse gap-4">
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-20 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                  <div className="h-4 flex-1 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && movements.length === 0 && (
            <div className="py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-500">{t('inventory.noMovements')}</p>
            </div>
          )}

          {/* Movements table */}
          {!loading && !error && movements.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-2 pr-4 font-medium text-gray-600">{t('inventory.date')}</th>
                    <th className="pb-2 pr-4 font-medium text-gray-600">
                      {t('inventory.movementType')}
                    </th>
                    <th className="pb-2 pr-4 text-right font-medium text-gray-600">
                      {t('inventory.quantity')}
                    </th>
                    <th className="pb-2 font-medium text-gray-600">{t('inventory.notes')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movements.map((movement) => (
                    <tr key={movement.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap py-2.5 pr-4 text-gray-700">
                        {formatDate(movement.created_at)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            TYPE_BADGE_COLORS[movement.type] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {t(MOVEMENT_I18N[movement.type] || movement.type)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-4 text-right font-medium text-gray-900">
                        {formatQuantity(movement.type, movement.quantity, item.unit)}
                      </td>
                      <td className="max-w-[200px] truncate py-2.5 text-gray-500">
                        {movement.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MovementHistoryModal;
