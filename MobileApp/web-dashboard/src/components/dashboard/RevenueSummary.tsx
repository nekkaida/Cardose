import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import SectionError from './SectionError';
import type { DashboardRevenue } from '@shared/types/analytics';

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function RevenueSummarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-2 rounded-lg bg-gray-50 p-4">
          <div className="h-3 w-16 rounded bg-gray-200" />
          <div className="h-5 w-24 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RevenueSummaryProps {
  loading: boolean;
  error: string;
  revenue: DashboardRevenue | undefined;
  onRetry: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const RevenueSummary: React.FC<RevenueSummaryProps> = ({ loading, error, revenue, onRetry }) => {
  const { t } = useLanguage();
  const retryLabel = t('dashboard.retry');

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-gray-900">
        {t('dashboard.revenueSummary')}
      </h3>
      {loading ? (
        <RevenueSummarySkeleton />
      ) : error ? (
        <SectionError
          message={t('dashboard.loadErrorRevenueSummary')}
          onRetry={onRetry}
          retryLabel={retryLabel}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-xs font-medium text-gray-500">{t('dashboard.paidRevenue')}</p>
            <p className="mt-1 text-lg font-bold text-green-700">
              {formatCurrency(revenue?.paid_revenue || 0)}
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4">
            <p className="text-xs font-medium text-gray-500">{t('dashboard.pendingRevenue')}</p>
            <p className="mt-1 text-lg font-bold text-amber-700">
              {formatCurrency(revenue?.pending_revenue || 0)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">{t('dashboard.avgOrderValue')}</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {formatCurrency(revenue?.average_order_value || 0)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">{t('dashboard.invoiceCount')}</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {formatNumber(revenue?.invoice_count || 0)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueSummary;
