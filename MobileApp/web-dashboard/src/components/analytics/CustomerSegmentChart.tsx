import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BRAND_COLORS, EmptyState, SectionError, PieLabelEntry } from './AnalyticsPrimitives';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CustomerSegmentChartProps {
  data: Array<{ name: string; value: number }>;
  error: string | null;
  onRetry: () => void;
  retrying?: boolean;
  tr: (key: string, fallback: string) => string;
  /** Optional subtitle shown below the title (e.g. "All time" indicator). */
  subtitle?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CustomerSegmentChart: React.FC<CustomerSegmentChartProps> = ({
  data,
  error,
  onRetry,
  retrying,
  tr,
  subtitle,
}) => {
  const tooltipCustomers = (value: number) => [value, tr('analytics.customers', 'Customers')];

  const renderLabel = ({ name, percent }: PieLabelEntry) =>
    `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`;

  return (
    <div
      className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
      role="figure"
      aria-label={tr('analytics.customerSegments', 'Customer Segments')}
    >
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          {tr('analytics.customerSegments', 'Customer Segments')}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
      </div>
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
                <Cell key={`cs-${i}`} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={tooltipCustomers} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState message={tr('analytics.noData', 'No data available')} />
      )}
    </div>
  );
};

export default CustomerSegmentChart;
