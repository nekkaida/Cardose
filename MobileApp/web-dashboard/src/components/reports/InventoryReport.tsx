import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useReportTranslation } from '../../hooks/useReportTranslation';
import type { InventoryReportData } from '@shared/types/reports';
import {
  StatCard,
  SectionTitle,
  DataTable,
  LOCALE_MAP,
  formatLabel,
  buildPaginationLabels,
} from './ReportPrimitives';
import { ReportBarChart, ReportDonutChart, CHART_COLORS } from './ReportCharts';

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
  const { language } = useLanguage();
  const tr = useReportTranslation();

  const emptyMessage = tr('reports.noData', 'No data available');

  const paginationLabels = buildPaginationLabels(tr);

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

      {/* Stock Distribution donut chart */}
      {data.byCategory.length > 0 && (
        <div className="mb-6">
          <SectionTitle>
            {tr('reports.stockDistribution', 'Stock Distribution by Category')}
          </SectionTitle>
          <ReportDonutChart
            data={data.byCategory.map((c) => ({
              name: formatLabel(c.category || 'Uncategorized'),
              value: c.total_value,
            }))}
            formatValue={formatCurrency}
            centerLabel={tr('reports.totalValue', 'Total Value')}
            centerValue={formatCurrency(data.summary.totalValue)}
          />
        </div>
      )}

      {/* Stock Levels bar chart */}
      {data.byCategory.length > 0 && (
        <div className="mb-6">
          <SectionTitle>{tr('reports.stockLevels', 'Stock Levels')}</SectionTitle>
          <ReportBarChart
            data={data.byCategory.map((c) => ({
              category: formatLabel(c.category || 'Uncategorized'),
              total_stock: c.total_stock,
              item_count: c.item_count,
            }))}
            xKey="category"
            bars={[
              {
                key: 'total_stock',
                color: CHART_COLORS.primary,
                label: tr('reports.totalStock', 'Total Stock'),
              },
              {
                key: 'item_count',
                color: CHART_COLORS.success,
                label: tr('reports.itemCount', 'Items'),
              },
            ]}
            formatY={formatNumber}
            formatTooltip={formatNumber}
          />
        </div>
      )}

      {/* By category */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.byCategory', 'By Category')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          paginationLabels={paginationLabels}
          headers={[
            {
              key: 'category',
              label: tr('reports.category', 'Category'),
              format: (v) => formatLabel((v as string) || 'Uncategorized'),
            },
            {
              key: 'item_count',
              label: tr('reports.itemCount', 'Items'),
              format: (v) => formatNumber(v as number),
            },
            {
              key: 'total_stock',
              label: tr('reports.totalStock', 'Total Stock'),
              format: (v) => formatNumber(v as number),
            },
            {
              key: 'total_value',
              label: tr('reports.totalValue', 'Total Value'),
              format: (v) => formatCurrency(v as number),
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
          paginationLabels={paginationLabels}
          headers={[
            { key: 'name', label: tr('reports.itemName', 'Item') },
            { key: 'sku', label: tr('reports.sku', 'SKU') },
            {
              key: 'category',
              label: tr('reports.category', 'Category'),
              format: (v) => formatLabel((v as string) || '-'),
            },
            {
              key: 'current_stock',
              label: tr('reports.currentStock', 'Current Stock'),
              format: (v) => formatNumber(v as number),
            },
            {
              key: 'reorder_level',
              label: tr('reports.reorderLevel', 'Reorder Level'),
              format: (v) => formatNumber(v as number),
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
          paginationLabels={paginationLabels}
          headers={[
            { key: 'item_name', label: tr('reports.itemName', 'Item') },
            {
              key: 'type',
              label: tr('reports.movementType', 'Type'),
              format: (v) => formatLabel((v as string) || '-'),
            },
            {
              key: 'quantity',
              label: tr('reports.quantity', 'Quantity'),
              format: (v) => formatNumber(v as number),
            },
            {
              key: 'created_at',
              label: tr('reports.movementDate', 'Date'),
              format: (v) =>
                v ? new Date(v as string).toLocaleDateString(LOCALE_MAP[language] || 'id-ID') : '-',
            },
          ]}
          rows={data.recentMovements}
        />
      </div>
    </>
  );
};

export default InventoryReport;
