import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatNumber } from '../../utils/formatters';
import SectionError from './SectionError';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ORDER_STATUS_COLORS: Record<string, string> = {
  Active: '#4e3a21',
  Completed: '#2C5530',
  Cancelled: '#DC2626',
};

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="flex animate-pulse flex-col items-center justify-center" style={{ height }}>
      <div className="h-full w-full rounded-lg bg-gray-200" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom PieChart label renderer
// ---------------------------------------------------------------------------

interface PieLabelProps {
  name?: string;
  percent?: number;
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
}

function renderPieLabel({
  name = '',
  percent = 0,
  cx = 0,
  cy = 0,
  midAngle = 0,
  outerRadius = 0,
}: PieLabelProps) {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 22;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={11}
    >
      {`${name} ${Math.round((percent || 0) * 100)}%`}
    </text>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface OrderStatusChartProps {
  loading: boolean;
  error: string;
  orderStatusData: Array<{ key: string; name: string; value: number }>;
  onRetry: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const OrderStatusChart: React.FC<OrderStatusChartProps> = ({
  loading,
  error,
  orderStatusData,
  onRetry,
}) => {
  const { t } = useLanguage();
  const retryLabel = t('dashboard.retry');

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-gray-900">{t('dashboard.orderStatus')}</h3>
      {loading ? (
        <ChartSkeleton />
      ) : error ? (
        <SectionError
          message={t('dashboard.loadErrorOrderStatus')}
          onRetry={onRetry}
          retryLabel={retryLabel}
        />
      ) : orderStatusData.length > 0 ? (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={orderStatusData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={78}
              paddingAngle={3}
              dataKey="value"
              label={renderPieLabel}
            >
              {orderStatusData.map((entry) => (
                <Cell key={entry.key} fill={ORDER_STATUS_COLORS[entry.key] || '#9CA3AF'} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number, name: string) => [formatNumber(value), name]} />
          </PieChart>
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
              d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
            />
          </svg>
          <p className="text-sm text-gray-400">{t('dashboard.noOrdersData')}</p>
        </div>
      )}
    </div>
  );
};

export default OrderStatusChart;
