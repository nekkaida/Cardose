import React from 'react';
import { formatShortCurrency } from '../../utils/formatters';
import { SectionError } from './AnalyticsPrimitives';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardOrders {
  total_orders: number;
  completed_orders: number;
  active_orders: number;
  cancelled_orders: number;
  average_value: number;
  completion_rate: number | string;
}

interface DashboardRevenue {
  total_revenue: number;
  paid_revenue: number;
  pending_revenue: number;
  average_order_value: number;
  invoice_count: number;
}

interface DashboardCustomers {
  total_customers: number;
  vip_customers: number;
  regular_customers: number;
  new_customers: number;
}

interface DashboardInventory {
  total_materials: number;
  out_of_stock: number;
  low_stock: number;
  total_value: number;
}

export interface KpiCardsProps {
  orders: DashboardOrders | undefined;
  revenue: DashboardRevenue | undefined;
  customers: DashboardCustomers | undefined;
  inventory: DashboardInventory | undefined;
  error: string | null;
  onRetry: () => void;
  tr: (key: string, fallback: string) => string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const KpiCards: React.FC<KpiCardsProps> = ({ orders, revenue, customers, error, onRetry, tr }) => {
  if (error) {
    return (
      <SectionError
        message={tr('analytics.loadError', 'Failed to load this section')}
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {/* Total Orders */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {tr('analytics.totalOrders', 'Total Orders')}
        </p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{orders?.total_orders ?? 0}</p>
        <p className="mt-1 text-xs text-gray-400">
          {orders?.completed_orders ?? 0} {tr('analytics.completed', 'completed')}
        </p>
      </div>

      {/* Revenue */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {tr('analytics.revenue', 'Revenue')}
        </p>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {formatShortCurrency(revenue?.total_revenue ?? 0)}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          {formatShortCurrency(revenue?.paid_revenue ?? 0)} {tr('analytics.paid', 'paid')}
        </p>
      </div>

      {/* Customers */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {tr('analytics.customers', 'Customers')}
        </p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{customers?.total_customers ?? 0}</p>
        <p className="mt-1 text-xs text-gray-400">
          {customers?.vip_customers ?? 0} {tr('analytics.vip', 'VIP')}
        </p>
      </div>

      {/* Avg Order */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {tr('analytics.avgOrder', 'Avg Order')}
        </p>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {formatShortCurrency(revenue?.average_order_value ?? 0)}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          {revenue?.invoice_count ?? 0} {tr('analytics.invoices', 'invoices')}
        </p>
      </div>
    </div>
  );
};

export default KpiCards;
