import React from 'react';
import { formatShortCurrency } from '../../utils/formatters';
import { SectionError } from './AnalyticsPrimitives';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardInventory {
  total_materials: number;
  out_of_stock: number;
  low_stock: number;
  total_value: number;
}

export interface InventoryOverviewCardsProps {
  inventory: DashboardInventory | undefined;
  error: string | null;
  onRetry: () => void;
  tr: (key: string, fallback: string) => string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const InventoryOverviewCards: React.FC<InventoryOverviewCardsProps> = ({
  inventory,
  error,
  onRetry,
  tr,
}) => {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">
        {tr('analytics.inventoryOverview', 'Inventory Overview')}
      </h2>
      {error ? (
        <SectionError
          message={tr('analytics.loadError', 'Failed to load this section')}
          onRetry={onRetry}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs uppercase text-gray-500">
              {tr('analytics.totalMaterials', 'Total Materials')}
            </p>
            <p className="text-2xl font-bold text-gray-900">{inventory?.total_materials ?? 0}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs uppercase text-gray-500">
              {tr('analytics.outOfStock', 'Out of Stock')}
            </p>
            <p
              className={`text-2xl font-bold ${
                (inventory?.out_of_stock ?? 0) > 0 ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              {inventory?.out_of_stock ?? 0}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs uppercase text-gray-500">
              {tr('analytics.lowStock', 'Low Stock')}
            </p>
            <p
              className={`text-2xl font-bold ${
                (inventory?.low_stock ?? 0) > 0 ? 'text-orange-600' : 'text-gray-900'
              }`}
            >
              {inventory?.low_stock ?? 0}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs uppercase text-gray-500">
              {tr('analytics.totalValue', 'Total Value')}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatShortCurrency(inventory?.total_value ?? 0)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryOverviewCards;
