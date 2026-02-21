import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency, formatShortCurrency } from '../../utils/formatters';
import SectionError from './SectionError';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="flex animate-pulse flex-col items-center justify-center" style={{ height }}>
      <div className="h-full w-full rounded-lg bg-gray-200" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function RupiahTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 text-xs text-gray-500">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="font-semibold text-gray-900">
          {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RevenueChartProps {
  loading: boolean;
  error: string;
  revenueTrend: Array<{ month: string; revenue: number }>;
  onRetry: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const RevenueChart: React.FC<RevenueChartProps> = ({ loading, error, revenueTrend, onRetry }) => {
  const { t } = useLanguage();
  const retryLabel = t('dashboard.retry');

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
      <h3 className="mb-4 text-base font-semibold text-gray-900">{t('dashboard.revenueTrend')}</h3>
      {loading ? (
        <ChartSkeleton />
      ) : error ? (
        <SectionError message={error} onRetry={onRetry} retryLabel={retryLabel} />
      ) : revenueTrend.length > 0 ? (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={revenueTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis
              tickFormatter={formatShortCurrency}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<RupiahTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#4e3a21"
              fill="#4e3a21"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg
            className="mb-3 h-10 w-10 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
            />
          </svg>
          <p className="text-sm text-gray-400">{t('dashboard.noRevenueData')}</p>
        </div>
      )}
    </div>
  );
};

export default RevenueChart;
