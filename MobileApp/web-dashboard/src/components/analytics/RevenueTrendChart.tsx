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
import {
  TICK_STYLE,
  BRAND_GREEN,
  GRID_STROKE,
  EmptyState,
  SectionError,
} from './AnalyticsPrimitives';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RevenueTrendChartProps {
  data: Array<{ month: string; revenue: number }>;
  error: string | null;
  onRetry: () => void;
  retrying?: boolean;
  tr: (key: string, fallback: string) => string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({
  data,
  error,
  onRetry,
  retrying,
  tr,
}) => {
  const tooltipRevenue = (value: number) => [
    formatCurrency(value),
    tr('analytics.revenue', 'Revenue'),
  ];

  return (
    <div
      className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
      role="figure"
      aria-label={tr('analytics.revenueTrend', 'Revenue Trend')}
    >
      <h2 className="mb-4 text-base font-semibold text-gray-900">
        {tr('analytics.revenueTrend', 'Revenue Trend')}
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
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="month" tick={TICK_STYLE} />
            <YAxis tickFormatter={(v: number) => formatShortCurrency(v)} tick={TICK_STYLE} />
            <Tooltip
              formatter={tooltipRevenue}
              labelStyle={{ fontSize: 12 }}
              contentStyle={{ fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={BRAND_GREEN}
              fill={BRAND_GREEN}
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
