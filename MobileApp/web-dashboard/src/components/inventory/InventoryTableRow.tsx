import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency } from '../../utils/formatters';
import type { InventoryItem } from '@shared/types/inventory';
import {
  type InventoryCategory,
  CATEGORY_I18N,
  isLowStock,
  isOutOfStock,
  getStockColor,
  getRowStockClass,
  getCategoryColor,
} from './inventoryHelpers';

interface InventoryTableRowProps {
  item: InventoryItem;
  canDelete: boolean;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onEdit: (item: InventoryItem) => void;
  onMovement: (item: InventoryItem) => void;
  onHistory: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

const InventoryTableRow: React.FC<InventoryTableRowProps> = ({
  item,
  canDelete,
  selected,
  onSelect,
  onEdit,
  onMovement,
  onHistory,
  onDelete,
}) => {
  const { t } = useLanguage();

  const statusBadge = (() => {
    if (isOutOfStock(item)) {
      return (
        <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
          {t('inventory.outOfStock')}
        </span>
      );
    }
    if (isLowStock(item)) {
      return (
        <span className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
          {t('inventory.lowStock')}
        </span>
      );
    }
    return (
      <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
        {t('inventory.inStock')}
      </span>
    );
  })();

  return (
    <tr className={`transition-colors hover:bg-gray-50 ${getRowStockClass(item)}`}>
      {/* Checkbox for bulk selection */}
      <td className="w-10 px-3 py-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(item.id, e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          aria-label={`${t('inventory.select')} ${item.name}`}
        />
      </td>
      <td className="px-6 py-4">
        <div className="max-w-[240px]">
          <div className="truncate text-sm font-medium text-gray-900" title={item.name}>
            {item.name}
          </div>
          {item.supplier && (
            <div className="truncate text-xs text-gray-400" title={item.supplier}>
              {item.supplier}
            </div>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-4">
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getCategoryColor(item.category)}`}
        >
          {t(CATEGORY_I18N[item.category as InventoryCategory] || item.category) || '-'}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-4">
        <div className={`text-sm font-medium ${getStockColor(item)}`}>
          {item.current_stock} {item.unit || ''}
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-4">
        <div className="text-sm text-gray-600">
          {item.reorder_level} {item.unit || ''}
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-4">
        <div className="text-sm font-medium text-gray-900">{formatCurrency(item.unit_cost)}</div>
      </td>
      <td className="whitespace-nowrap px-4 py-4">{statusBadge}</td>
      <td className="whitespace-nowrap px-4 py-4 text-right">
        <div className="flex items-center justify-end gap-1">
          {/* Stock movement */}
          <button
            onClick={() => onMovement(item)}
            className="rounded-lg p-1.5 text-green-600 transition-colors hover:bg-green-50 hover:text-green-800"
            title={t('inventory.stockMovement')}
            aria-label={`${t('inventory.stockMovement')} ${item.name}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
          {/* Movement history */}
          <button
            onClick={() => onHistory(item)}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            title={t('inventory.movementHistory')}
            aria-label={`${t('inventory.movementHistory')} ${item.name}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
          {/* Edit */}
          <button
            onClick={() => onEdit(item)}
            className="rounded-lg p-1.5 text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-800"
            title={t('common.edit')}
            aria-label={`${t('common.edit')} ${item.name}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          {/* Delete */}
          {canDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
              title={t('common.delete')}
              aria-label={`${t('common.delete')} ${item.name}`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default React.memo(InventoryTableRow);
