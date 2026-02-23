import React from 'react';
import type { ProductionReportData } from '@shared/types/reports';
import { useLanguage } from '../../contexts/LanguageContext';
import { useReportTranslation } from '../../hooks/useReportTranslation';
import { ReportDonutChart } from './ReportCharts';
import {
  StatCard,
  SectionTitle,
  DataTable,
  formatLabel,
  LOCALE_MAP,
  buildPaginationLabels,
} from './ReportPrimitives';

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
  const { language } = useLanguage();
  const tr = useReportTranslation();

  const emptyMessage = tr('reports.noData', 'No data available');

  const paginationLabels = buildPaginationLabels(tr);

  const { completionRate } = data.summary;
  const rateAccent =
    completionRate >= 80
      ? 'text-green-600'
      : completionRate >= 50
        ? 'text-amber-600'
        : 'text-red-600';

  const orderDistributionData = (data.ordersByStatus ?? []).map((s) => ({
    name: formatLabel(s.status),
    value: s.count,
  }));

  const taskDistributionData = (data.taskStats ?? []).map((s) => ({
    name: formatLabel(s.status),
    value: s.count,
  }));

  const qualityDistributionData = (data.qualityStats ?? []).map((s) => ({
    name: formatLabel(s.overall_status),
    value: s.count,
  }));

  const hasOrderChart = orderDistributionData.length > 0;
  const hasTaskChart = taskDistributionData.length > 0;
  const hasQualityChart = qualityDistributionData.length > 0;
  const hasAnyChart = hasOrderChart || hasTaskChart || hasQualityChart;

  return (
    <>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label={tr('reports.totalOrders', 'Total Orders')}
          value={formatNumber(data.summary.totalOrders)}
        />
        <StatCard
          label={tr('reports.completedOrders', 'Completed')}
          value={formatNumber(data.summary.completedOrders)}
          accent="text-green-600"
        />
        <StatCard
          label={tr('reports.completionRate', 'Completion Rate')}
          value={`${new Intl.NumberFormat(LOCALE_MAP[language] || 'id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(data.summary.completionRate)}%`}
          accent={rateAccent}
        />
      </div>

      {/* Period */}
      {data.period && (
        <p className="mb-4 text-xs text-gray-400">
          {tr('reports.period', 'Period')}: {data.period.start} — {data.period.end}
        </p>
      )}

      {/* Donut charts grid */}
      {hasAnyChart && (
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {hasOrderChart && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <SectionTitle>{tr('reports.orderDistribution', 'Order Distribution')}</SectionTitle>
              <ReportDonutChart
                data={orderDistributionData}
                centerLabel={tr('reports.totalOrders', 'Total Orders')}
                centerValue={String(data.summary.totalOrders)}
              />
            </div>
          )}

          {hasTaskChart && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <SectionTitle>{tr('reports.taskDistribution', 'Task Distribution')}</SectionTitle>
              <ReportDonutChart data={taskDistributionData} />
            </div>
          )}

          {hasQualityChart && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <SectionTitle>
                {tr('reports.qualityDistribution', 'Quality Check Distribution')}
              </SectionTitle>
              <ReportDonutChart data={qualityDistributionData} />
            </div>
          )}
        </div>
      )}

      {/* Orders by status table */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.ordersByStatus', 'Orders by Status')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          paginationLabels={paginationLabels}
          headers={[
            {
              key: 'status',
              label: tr('reports.status', 'Status'),
              format: (v) => formatLabel((v as string) || '-'),
            },
            {
              key: 'count',
              label: tr('reports.count', 'Count'),
              format: (v) => formatNumber(v as number),
            },
            {
              key: 'value',
              label: tr('reports.value', 'Value'),
              format: (v) => formatCurrency(v as number),
            },
          ]}
          rows={data.ordersByStatus ?? []}
        />
      </div>

      {/* Task stats table */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.taskStats', 'Task Statistics')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          paginationLabels={paginationLabels}
          headers={[
            {
              key: 'status',
              label: tr('reports.status', 'Status'),
              format: (v) => formatLabel((v as string) || '-'),
            },
            {
              key: 'count',
              label: tr('reports.count', 'Count'),
              format: (v) => formatNumber(v as number),
            },
          ]}
          rows={data.taskStats ?? []}
        />
      </div>

      {/* Quality stats table */}
      <div>
        <SectionTitle>{tr('reports.qualityStats', 'Quality Check Statistics')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          paginationLabels={paginationLabels}
          headers={[
            {
              key: 'overall_status',
              label: tr('reports.status', 'Status'),
              format: (v) => formatLabel((v as string) || '-'),
            },
            {
              key: 'count',
              label: tr('reports.count', 'Count'),
              format: (v) => formatNumber(v as number),
            },
          ]}
          rows={data.qualityStats ?? []}
        />
      </div>
    </>
  );
};

export default ProductionReport;
