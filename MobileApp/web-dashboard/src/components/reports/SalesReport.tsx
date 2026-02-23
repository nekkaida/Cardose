import React from 'react';
import type { SalesReportData } from '@shared/types/reports';
import { useReportTranslation } from '../../hooks/useReportTranslation';
import { ReportLineChart, ReportBarChart, CHART_COLORS } from './ReportCharts';
import { StatCard, SectionTitle, DataTable, buildPaginationLabels } from './ReportPrimitives';

export interface SalesReportProps {
  data: SalesReportData;
  formatCurrency: (n: number) => string;
  formatNumber: (n: number) => string;
}

const SalesReport: React.FC<SalesReportProps> = ({ data, formatCurrency, formatNumber }) => {
  const tr = useReportTranslation();

  const emptyMessage = tr('reports.noData', 'No data available');

  const paginationLabels = buildPaginationLabels(tr);

  return (
    <>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={tr('reports.totalInvoices', 'Total Invoices')}
          value={formatNumber(data.summary.totalInvoices)}
        />
        <StatCard
          label={tr('reports.totalRevenue', 'Total Revenue')}
          value={formatCurrency(data.summary.totalRevenue)}
          accent="text-green-600"
        />
        <StatCard
          label={tr('reports.totalTax', 'Total Tax')}
          value={formatCurrency(data.summary.totalTax)}
        />
        <StatCard
          label={tr('reports.averageInvoice', 'Average Invoice')}
          value={formatCurrency(data.summary.averageInvoice)}
        />
      </div>

      {/* Period */}
      {data.period && (
        <p className="mb-4 text-xs text-gray-400">
          {tr('reports.period', 'Period')}: {data.period.start} — {data.period.end}
        </p>
      )}

      {/* Revenue Trend line chart (need 2+ points for a meaningful line) */}
      {data.sales.length > 1 && (
        <div className="mb-6">
          <SectionTitle>{tr('reports.revenueTrend', 'Revenue Trend')}</SectionTitle>
          <ReportLineChart
            data={data.sales}
            xKey="date"
            lines={[
              {
                key: 'revenue',
                color: CHART_COLORS.success,
                label: tr('reports.revenue', 'Revenue'),
              },
              {
                key: 'tax_collected',
                color: CHART_COLORS.warning,
                label: tr('reports.taxCollected', 'Tax Collected'),
              },
            ]}
            formatY={formatCurrency}
            formatTooltip={formatCurrency}
          />
        </div>
      )}

      {/* Daily sales table */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.dailySales', 'Daily Sales')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          headers={[
            { key: 'date', label: tr('reports.date', 'Date') },
            {
              key: 'invoice_count',
              label: tr('reports.invoiceCount', 'Invoices'),
              format: (v) => formatNumber(v as number),
            },
            {
              key: 'revenue',
              label: tr('reports.revenue', 'Revenue'),
              format: (v) => formatCurrency(v as number),
            },
            {
              key: 'tax_collected',
              label: tr('reports.taxCollected', 'Tax Collected'),
              format: (v) => formatCurrency(v as number),
            },
          ]}
          rows={data.sales}
          paginationLabels={paginationLabels}
        />
      </div>

      {/* Top Customers bar chart */}
      {data.topCustomers.length > 0 && (
        <div className="mb-6">
          <SectionTitle>
            {tr('reports.topCustomersByRevenue', 'Top Customers by Revenue')}
          </SectionTitle>
          <ReportBarChart
            data={data.topCustomers}
            xKey="name"
            bars={[
              {
                key: 'revenue',
                color: CHART_COLORS.primary,
                label: tr('reports.revenue', 'Revenue'),
              },
            ]}
            formatY={formatCurrency}
            formatTooltip={formatCurrency}
          />
        </div>
      )}

      {/* Top customers table */}
      <div>
        <SectionTitle>{tr('reports.topCustomers', 'Top Customers')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          headers={[
            { key: 'name', label: tr('reports.customerName', 'Customer') },
            {
              key: 'revenue',
              label: tr('reports.revenue', 'Revenue'),
              format: (v) => formatCurrency(v as number),
            },
            {
              key: 'invoice_count',
              label: tr('reports.invoiceCount', 'Invoices'),
              format: (v) => formatNumber(v as number),
            },
          ]}
          rows={data.topCustomers}
          paginationLabels={paginationLabels}
        />
      </div>
    </>
  );
};

export default SalesReport;
