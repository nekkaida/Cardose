import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency } from '../../utils/formatters';
import type { InventoryStats as InventoryStatsType } from './inventoryHelpers';

interface InventoryStatsProps {
  stats: InventoryStatsType;
}

const InventoryStats: React.FC<InventoryStatsProps> = ({ stats }) => {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase text-gray-500">{t('inventory.totalItems')}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase text-gray-500">{t('inventory.lowStock')}</p>
        <p
          className={`mt-1 text-2xl font-bold ${stats.lowStock > 0 ? 'text-orange-600' : 'text-green-600'}`}
        >
          {stats.lowStock}
        </p>
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase text-gray-500">{t('inventory.outOfStock')}</p>
        <p
          className={`mt-1 text-2xl font-bold ${stats.outOfStock > 0 ? 'text-red-600' : 'text-green-600'}`}
        >
          {stats.outOfStock}
        </p>
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase text-gray-500">{t('inventory.totalValue')}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
      </div>
    </div>
  );
};

export default InventoryStats;
