import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import type { OrderStatsData } from './orderHelpers';

interface OrderStatsProps {
  stats: OrderStatsData;
  t: (key: string) => string;
}

const OrderStats: React.FC<OrderStatsProps> = ({ stats, t }) => {
  const activeCount = stats.designing + stats.approved + stats.production + stats.quality_control;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase text-gray-500">
          {t('orders.pending') || 'Pending'}
        </p>
        <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.pending}</p>
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase text-gray-500">Active</p>
        <p className="mt-1 text-2xl font-bold text-blue-600">{activeCount}</p>
        <p className="mt-0.5 text-xs text-gray-400">
          {stats.designing} design · {stats.production} prod
        </p>
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase text-gray-500">
          {t('orders.completed') || 'Completed'}
        </p>
        <p className="mt-1 text-2xl font-bold text-green-600">{stats.completed}</p>
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase text-gray-500">Total Value</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
      </div>
    </div>
  );
};

export default OrderStats;
