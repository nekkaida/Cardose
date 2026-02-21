import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatShortCurrency } from '../../utils/formatters';
import { TICK_STYLE, EmptyState, SectionError } from './AnalyticsPrimitives';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RevenueTrendChartProps {
  data: Array<{ month: string; revenue: number }>;
  error: string | null;
  onRetry: () => void;
  tr: (key: string, fallback: string) => string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({ data, error, onRetry, tr }) => {
  const tooltipRevenue = (value: number) => [
    formatCurrency(value),
    tr('analytics.revenue', 'Revenue'),
  ];

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">
        {tr('analytics.revenueTrend', 'Revenue Trend')}
      </h2>
      {error ? (
        <SectionError
          message={tr('analytics.loadError', 'Failed to load this section')}
          onRetry={onRetry}
        />
      ) : data.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={TICK_STYLE} />
            <YAxis tickFormatter={formatShortCurrency} tick={TICK_STYLE} />
            <Tooltip
              formatter={tooltipRevenue}
              labelStyle={{ fontSize: 12 }}
              contentStyle={{ fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#2C5530"
              fill="#2C5530"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState message={tr('analytics.noData', 'No data available')} />
      )}
    </div>
  );
};

export default RevenueTrendChart;
