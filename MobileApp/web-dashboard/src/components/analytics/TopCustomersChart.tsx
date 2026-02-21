import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatShortCurrency } from '../../utils/formatters';
import { TICK_STYLE, EmptyState, SectionError } from './AnalyticsPrimitives';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TopCustomersChartProps {
  data: Array<{ name: string; revenue: number }>;
  error: string | null;
  onRetry: () => void;
  tr: (key: string, fallback: string) => string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const TopCustomersChart: React.FC<TopCustomersChartProps> = ({ data, error, onRetry, tr }) => {
  const tooltipRevenue = (value: number) => [
    formatCurrency(value),
    tr('analytics.revenue', 'Revenue'),
  ];

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">
        {tr('analytics.topCustomers', 'Top Customers by Revenue')}
      </h2>
      {error ? (
        <SectionError
          message={tr('analytics.loadError', 'Failed to load this section')}
          onRetry={onRetry}
        />
      ) : data.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tickFormatter={formatShortCurrency} tick={TICK_STYLE} />
            <YAxis type="category" dataKey="name" width={120} tick={TICK_STYLE} />
            <Tooltip
              formatter={tooltipRevenue}
              labelStyle={{ fontSize: 12 }}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="revenue" fill="#C4A962" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState message={tr('analytics.noData', 'No data available')} />
      )}
    </div>
  );
};

export default TopCustomersChart;
