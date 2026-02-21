import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency } from '../../utils/formatters';
import type { InventoryItem } from '@shared/types/inventory';
import {
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
  onEdit: (item: InventoryItem) => void;
  onMovement: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

const InventoryTableRow: React.FC<InventoryTableRowProps> = ({
  item,
  canDelete,
  onEdit,
  onMovement,
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
          {t(CATEGORY_I18N[item.category] || item.category) || '-'}
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
      <td className="space-x-2 whitespace-nowrap px-4 py-4 text-right">
        <button
          onClick={() => onMovement(item)}
          className="text-sm font-medium text-green-600 hover:text-green-800"
        >
          {t('inventory.stockAction')}
        </button>
        <button
          onClick={() => onEdit(item)}
          className="text-sm font-medium text-primary-600 hover:text-primary-800"
        >
          {t('common.edit')}
        </button>
        {canDelete && (
          <button
            onClick={() => onDelete(item.id)}
            className="text-sm font-medium text-red-600 hover:text-red-800"
          >
            {t('common.delete')}
          </button>
        )}
      </td>
    </tr>
  );
};

export default InventoryTableRow;
