import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { ProductionReportData } from '@shared/types/reports';
import { StatCard, SectionTitle, DataTable, formatLabel } from './ReportPrimitives';

export interface ProductionReportProps {
  data: ProductionReportData;
  formatCurrency: (n: number) => string;
  formatNumber: (n: number) => string;
}

const ProductionReport: React.FC<ProductionReportProps> = ({
  data,
  formatCurrency,
  formatNumber,
}) => {
  const { t } = useLanguage();
  const tr = (key: string, fallback: string) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  const emptyMessage = tr('reports.noData', 'No data available');

  const statuses = data.ordersByStatus ?? [];
  const totalOrders = statuses.reduce((sum, s) => sum + s.count, 0);
  const completedCount = statuses.find((s) => s.status === 'completed')?.count ?? 0;
  const rate = Number(data.completionRate) || 0;

  return (
    <>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label={tr('reports.totalOrders', 'Total Orders')}
          value={formatNumber(totalOrders)}
        />
        <StatCard
          label={tr('reports.completedOrders', 'Completed')}
          value={formatNumber(completedCount)}
          accent="text-green-600"
        />
        <StatCard
          label={tr('reports.completionRate', 'Completion Rate')}
          value={`${rate.toFixed(1)}%`}
          accent={rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'}
        />
      </div>

      {/* Period */}
      {data.period && (
        <p className="mb-4 text-xs text-gray-400">
          {tr('reports.period', 'Period')}: {data.period.start} — {data.period.end}
        </p>
      )}

      {/* Orders by status */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.ordersByStatus', 'Orders by Status')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          headers={[
            {
              key: 'status',
              label: tr('reports.status', 'Status'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'count',
              label: tr('reports.count', 'Count'),
              format: (v: number) => formatNumber(v),
            },
            {
              key: 'value',
              label: tr('reports.value', 'Value'),
              format: (v: number) => formatCurrency(v),
            },
          ]}
          rows={statuses}
        />
      </div>

      {/* Task stats */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.taskStats', 'Task Statistics')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          headers={[
            {
              key: 'status',
              label: tr('reports.status', 'Status'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'count',
              label: tr('reports.count', 'Count'),
              format: (v: number) => formatNumber(v),
            },
          ]}
          rows={data.taskStats}
        />
      </div>

      {/* Quality stats */}
      <div>
        <SectionTitle>{tr('reports.qualityStats', 'Quality Check Statistics')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          headers={[
            {
              key: 'overall_status',
              label: tr('reports.status', 'Status'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'count',
              label: tr('reports.count', 'Count'),
              format: (v: number) => formatNumber(v),
            },
          ]}
          rows={data.qualityStats}
        />
      </div>
    </>
  );
};

export default ProductionReport;
