import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { InventoryReportData } from '@shared/types/reports';
import { StatCard, SectionTitle, DataTable, LOCALE_MAP, formatLabel } from './ReportPrimitives';

export interface InventoryReportProps {
  data: InventoryReportData;
  formatCurrency: (n: number) => string;
  formatNumber: (n: number) => string;
}

const InventoryReport: React.FC<InventoryReportProps> = ({
  data,
  formatCurrency,
  formatNumber,
}) => {
  const { t, language } = useLanguage();
  const tr = (key: string, fallback: string) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  const emptyMessage = tr('reports.noData', 'No data available');

  return (
    <>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={tr('reports.totalItems', 'Total Items')}
          value={formatNumber(data.summary.totalItems)}
        />
        <StatCard
          label={tr('reports.outOfStock', 'Out of Stock')}
          value={formatNumber(data.summary.outOfStock)}
          accent={data.summary.outOfStock > 0 ? 'text-red-600' : 'text-gray-900'}
        />
        <StatCard
          label={tr('reports.lowStock', 'Low Stock')}
          value={formatNumber(data.summary.lowStock)}
          accent={data.summary.lowStock > 0 ? 'text-amber-600' : 'text-gray-900'}
        />
        <StatCard
          label={tr('reports.totalValue', 'Total Value')}
          value={formatCurrency(data.summary.totalValue)}
          accent="text-green-600"
        />
      </div>

      {/* By category */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.byCategory', 'By Category')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          headers={[
            {
              key: 'category',
              label: tr('reports.category', 'Category'),
              format: (v: string) => formatLabel(v || 'Uncategorized'),
            },
            {
              key: 'item_count',
              label: tr('reports.itemCount', 'Items'),
              format: (v: number) => formatNumber(v),
            },
            {
              key: 'total_stock',
              label: tr('reports.totalStock', 'Total Stock'),
              format: (v: number) => formatNumber(v),
            },
            {
              key: 'total_value',
              label: tr('reports.totalValue', 'Total Value'),
              format: (v: number) => formatCurrency(v),
            },
          ]}
          rows={data.byCategory}
        />
      </div>

      {/* Low stock items */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.lowStockItems', 'Low Stock Items')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          headers={[
            { key: 'name', label: tr('reports.itemName', 'Item') },
            { key: 'sku', label: tr('reports.sku', 'SKU') },
            {
              key: 'category',
              label: tr('reports.category', 'Category'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'current_stock',
              label: tr('reports.currentStock', 'Current Stock'),
              format: (v: number) => formatNumber(v),
            },
            {
              key: 'reorder_level',
              label: tr('reports.reorderLevel', 'Reorder Level'),
              format: (v: number) => formatNumber(v),
            },
            { key: 'unit', label: tr('reports.unit', 'Unit') },
          ]}
          rows={data.lowStockItems}
        />
      </div>

      {/* Recent movements */}
      <div>
        <SectionTitle>{tr('reports.recentMovements', 'Recent Movements')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          headers={[
            { key: 'item_name', label: tr('reports.itemName', 'Item') },
            {
              key: 'type',
              label: tr('reports.movementType', 'Type'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'quantity',
              label: tr('reports.quantity', 'Quantity'),
              format: (v: number) => formatNumber(v),
            },
            {
              key: 'created_at',
              label: tr('reports.movementDate', 'Date'),
              format: (v: string) =>
                v ? new Date(v).toLocaleDateString(LOCALE_MAP[language] || 'id-ID') : '-',
            },
          ]}
          rows={data.recentMovements}
        />
      </div>
    </>
  );
};

export default InventoryReport;
