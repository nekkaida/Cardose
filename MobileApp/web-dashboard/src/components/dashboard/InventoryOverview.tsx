import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import SectionError from './SectionError';
import type { DashboardInventory } from '@shared/types/analytics';

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function InventorySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="h-3.5 w-24 rounded bg-gray-200" />
          <div className="h-5 w-16 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface InventoryOverviewProps {
  loading: boolean;
  error: string;
  inventory: DashboardInventory | undefined;
  onRetry: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const InventoryOverview: React.FC<InventoryOverviewProps> = ({
  loading,
  error,
  inventory,
  onRetry,
}) => {
  const { t } = useLanguage();
  const retryLabel = t('dashboard.retry');

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-gray-900">{t('dashboard.inventory')}</h3>
      {loading ? (
        <InventorySkeleton />
      ) : error ? (
        <SectionError
          message={t('dashboard.loadErrorInventory')}
          onRetry={onRetry}
          retryLabel={retryLabel}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{t('dashboard.totalMaterials')}</span>
            <span className="text-lg font-bold text-gray-900">
              {formatNumber(inventory?.total_materials || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{t('dashboard.lowStock')}</span>
            <span
              className={`text-lg font-bold ${(inventory?.low_stock || 0) > 0 ? 'text-amber-600' : 'text-green-600'}`}
            >
              {formatNumber(inventory?.low_stock || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{t('dashboard.outOfStock')}</span>
            <span
              className={`text-lg font-bold ${(inventory?.out_of_stock || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}
            >
              {formatNumber(inventory?.out_of_stock || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{t('dashboard.totalValue')}</span>
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(inventory?.total_value || 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryOverview;
