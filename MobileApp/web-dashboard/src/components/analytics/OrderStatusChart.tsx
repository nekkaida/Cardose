import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BRAND_COLORS, EmptyState, SectionError, PieLabelEntry } from './AnalyticsPrimitives';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrderStatusChartProps {
  data: Array<{ name: string; value: number }>;
  error: string | null;
  onRetry: () => void;
  retrying?: boolean;
  tr: (key: string, fallback: string) => string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const OrderStatusChart: React.FC<OrderStatusChartProps> = ({
  data,
  error,
  onRetry,
  retrying,
  tr,
}) => {
  const tooltipOrders = (value: number) => [value, tr('analytics.orders', 'Orders')];

  const renderLabel = ({ name, percent }: PieLabelEntry) =>
    `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`;

  return (
    <div
      className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
      role="figure"
      aria-label={tr('analytics.orderStatus', 'Order Status Distribution')}
    >
      <h2 className="mb-4 text-base font-semibold text-gray-900">
        {tr('analytics.orderStatus', 'Order Status Distribution')}
      </h2>
      {error ? (
        <SectionError
          message={tr('analytics.loadError', 'Failed to load this section')}
          retryLabel={tr('analytics.refresh', 'Refresh')}
          onRetry={onRetry}
          retrying={retrying}
        />
      ) : data.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              label={renderLabel}
            >
              {data.map((_, i) => (
                <Cell key={`os-${i}`} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={tooltipOrders} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState message={tr('analytics.noData', 'No data available')} />
      )}
    </div>
  );
};

export default OrderStatusChart;
