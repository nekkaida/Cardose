import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatShortCurrency } from '../../utils/formatters';
import {
  TICK_STYLE,
  BRAND_GOLD,
  GRID_STROKE,
  EmptyState,
  SectionError,
} from './AnalyticsPrimitives';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TopCustomersChartProps {
  data: Array<{ name: string; fullName: string; revenue: number }>;
  error: string | null;
  onRetry: () => void;
  retrying?: boolean;
  tr: (key: string, fallback: string) => string;
}

/** Props passed by Recharts to a custom YAxis tick renderer. */
interface AxisTickProps {
  x: number;
  y: number;
  payload: { value: string };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const TopCustomersChart: React.FC<TopCustomersChartProps> = ({
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

  const renderYAxisTick = ({ x, y, payload }: AxisTickProps) => {
    const item = data.find((d) => d.name === payload.value);
    return (
      <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill="#666">
        <title>{item?.fullName ?? payload.value}</title>
        {payload.value}
      </text>
    );
  };

  return (
    <div
      className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
      role="figure"
      aria-label={tr('analytics.topCustomers', 'Top Customers by Revenue')}
    >
      <h2 className="mb-4 text-base font-semibold text-gray-900">
        {tr('analytics.topCustomers', 'Top Customers by Revenue')}
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
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis
              type="number"
              tickFormatter={(v: number) => formatShortCurrency(v)}
              tick={TICK_STYLE}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={renderYAxisTick as unknown as (props: any) => React.ReactElement<SVGElement>}
            />
            <Tooltip
              formatter={tooltipRevenue}
              labelFormatter={(label) => {
                const item = data.find((d) => d.name === label);
                return item?.fullName ?? label;
              }}
              labelStyle={{ fontSize: 12 }}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="revenue" fill={BRAND_GOLD} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState message={tr('analytics.noData', 'No data available')} />
      )}
    </div>
  );
};

export default TopCustomersChart;
