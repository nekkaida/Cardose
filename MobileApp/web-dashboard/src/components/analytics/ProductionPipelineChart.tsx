import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  TICK_STYLE,
  BRAND_BROWN,
  GRID_STROKE,
  EmptyState,
  SectionError,
} from './AnalyticsPrimitives';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProductionPipelineChartProps {
  data: Array<{ stage: string; count: number }>;
  error: string | null;
  onRetry: () => void;
  retrying?: boolean;
  tr: (key: string, fallback: string) => string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ProductionPipelineChart: React.FC<ProductionPipelineChartProps> = ({
  data,
  error,
  onRetry,
  retrying,
  tr,
}) => {
  return (
    <div
      className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
      role="figure"
      aria-label={tr('analytics.productionPipeline', 'Production Pipeline')}
    >
      <h2 className="mb-4 text-base font-semibold text-gray-900">
        {tr('analytics.productionPipeline', 'Production Pipeline')}
      </h2>
      {error ? (
        <SectionError
          message={tr('analytics.loadError', 'Failed to load this section')}
          retryLabel={tr('analytics.refresh', 'Refresh')}
          onRetry={onRetry}
          retrying={retrying}
        />
      ) : data.some((d) => d.count > 0) ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="stage" tick={TICK_STYLE} />
            <YAxis allowDecimals={false} tick={TICK_STYLE} />
            <Tooltip
              formatter={(value: number) => [value, tr('analytics.orders', 'Orders')]}
              labelStyle={{ fontSize: 12 }}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="count" fill={BRAND_BROWN} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState message={tr('analytics.noData', 'No data available')} />
      )}
    </div>
  );
};

export default ProductionPipelineChart;
