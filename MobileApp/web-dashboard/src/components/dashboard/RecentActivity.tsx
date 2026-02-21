import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import SectionError from './SectionError';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string, t: (key: string) => string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t('dashboard.timeJustNow');
  if (mins < 60) return t('dashboard.timeMinutesAgo').replace('{n}', String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('dashboard.timeHoursAgo').replace('{n}', String(hours));
  const days = Math.floor(hours / 24);
  return t('dashboard.timeDaysAgo').replace('{n}', String(days));
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'designing':
      return 'bg-blue-100 text-blue-800';
    case 'approved':
      return 'bg-accent-100 text-accent-800';
    case 'production':
      return 'bg-indigo-100 text-indigo-800';
    case 'quality_control':
      return 'bg-orange-100 text-orange-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-3 w-32 rounded bg-gray-200" />
            <div className="h-2.5 w-20 rounded bg-gray-200" />
          </div>
          <div className="h-5 w-16 rounded-full bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecentOrder {
  id: string;
  order_number?: string;
  customer_name?: string;
  status: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RecentActivityProps {
  loading: boolean;
  error: string;
  recentOrders: RecentOrder[];
  onRetry: () => void;
  onViewAll: () => void;
  onOrderClick: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const RecentActivity: React.FC<RecentActivityProps> = ({
  loading,
  error,
  recentOrders,
  onRetry,
  onViewAll,
  onOrderClick,
}) => {
  const { t } = useLanguage();
  const retryLabel = t('dashboard.retry');

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">{t('dashboard.recentActivity')}</h3>
        <button
          onClick={onViewAll}
          className="text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          {t('dashboard.viewAll')}
        </button>
      </div>
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <SectionError message={error} onRetry={onRetry} retryLabel={retryLabel} />
      ) : recentOrders.length > 0 ? (
        <div className="space-y-3">
          {recentOrders.map((order) => (
            <button
              key={order.id}
              onClick={onOrderClick}
              className="-mx-2 flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {order.customer_name || t('dashboard.unknownCustomer')}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {order.order_number || order.id?.slice(0, 8)} ·{' '}
                  {order.created_at ? timeAgo(order.created_at, t) : ''}
                </p>
              </div>
              <span
                className={`ml-2 inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(order.status)}`}
              >
                {(order.status || '').replace(/_/g, ' ')}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <svg
            className="mb-2 h-8 w-8 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-gray-400">{t('dashboard.noRecentActivity')}</p>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
