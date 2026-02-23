import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import type { OrderStatsData } from './orderHelpers';

interface OrderStatsProps {
  stats: OrderStatsData;
  loading?: boolean;
  t: (key: string) => string;
}

const StatSkeleton: React.FC = () => (
  <div className="animate-pulse rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="mb-2 h-3 w-16 rounded bg-gray-200" />
    <div className="h-7 w-12 rounded bg-gray-200" />
  </div>
);

const OrderStats: React.FC<OrderStatsProps> = ({ stats, loading, t }) => {
  const activeCount = stats.designing + stats.approved + stats.production + stats.quality_control;

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase text-gray-500">{t('orders.pending')}</p>
        <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.pending}</p>
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase text-gray-500">{t('orders.active')}</p>
        <p className="mt-1 text-2xl font-bold text-blue-600">{activeCount}</p>
        <p className="mt-0.5 text-xs text-gray-400">
          {stats.designing} {t('orders.design')} · {stats.production} {t('orders.prod')}
        </p>
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase text-gray-500">{t('orders.completed')}</p>
        <p className="mt-1 text-2xl font-bold text-green-600">{stats.completed}</p>
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase text-gray-500">{t('orders.totalValue')}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
      </div>
    </div>
  );
};

export default OrderStats;
