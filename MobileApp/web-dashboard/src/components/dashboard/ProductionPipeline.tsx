import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import SectionError from './SectionError';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRODUCTION_STAGE_COLORS: Record<string, string> = {
  Designing: '#4e3a21',
  Approved: '#C4A962',
  Production: '#2C5530',
  QC: '#FFA500',
};

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="flex animate-pulse flex-col items-center justify-center" style={{ height }}>
      <div className="h-full w-full rounded-lg bg-gray-200" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Production BarChart custom bar shape
// ---------------------------------------------------------------------------

interface BarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: { key?: string };
}

function ProductionBarShape({ x = 0, y = 0, width = 0, height = 0, payload }: BarShapeProps) {
  const fill = PRODUCTION_STAGE_COLORS[payload?.key || ''] || '#4e3a21';
  return <rect x={x} y={y} width={width} height={height} rx={4} ry={4} fill={fill} />;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ProductionPipelineProps {
  loading: boolean;
  error: string;
  productionData: Array<{ key: string; stage: string; count: number }>;
  urgentOrders: number;
  onRetry: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ProductionPipeline: React.FC<ProductionPipelineProps> = ({
  loading,
  error,
  productionData,
  urgentOrders,
  onRetry,
}) => {
  const { t } = useLanguage();
  const retryLabel = t('dashboard.retry');

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          {t('dashboard.productionPipeline')}
        </h3>
        {urgentOrders > 0 && (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
            {urgentOrders} {t('dashboard.urgent')}
          </span>
        )}
      </div>
      {loading ? (
        <ChartSkeleton />
      ) : error ? (
        <SectionError
          message={t('dashboard.loadErrorProduction')}
          onRetry={onRetry}
          retryLabel={retryLabel}
        />
      ) : productionData.every((d) => d.count === 0) ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg
            className="mb-3 h-10 w-10 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
            />
          </svg>
          <p className="text-sm text-gray-400">{t('dashboard.noProductionData')}</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={productionData}
              role="img"
              aria-label={t('dashboard.productionPipeline')}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="stage" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip formatter={(value: number) => [value, t('dashboard.ordersTooltip')]} />
              <Bar dataKey="count" shape={<ProductionBarShape />} />
            </BarChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
            {productionData.map((item) => (
              <div key={item.key} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: PRODUCTION_STAGE_COLORS[item.key] }}
                />
                {item.stage}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(ProductionPipeline);
