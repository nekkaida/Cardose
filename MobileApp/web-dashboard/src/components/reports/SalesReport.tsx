import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { SalesReportData } from '@shared/types/reports';
import { StatCard, SectionTitle, DataTable } from './ReportPrimitives';

export interface SalesReportProps {
  data: SalesReportData;
  formatCurrency: (n: number) => string;
  formatNumber: (n: number) => string;
}

const SalesReport: React.FC<SalesReportProps> = ({ data, formatCurrency, formatNumber }) => {
  const { t } = useLanguage();
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
              format: (v: number) => formatNumber(v),
            },
            {
              key: 'revenue',
              label: tr('reports.revenue', 'Revenue'),
              format: (v: number) => formatCurrency(v),
            },
            {
              key: 'tax_collected',
              label: tr('reports.taxCollected', 'Tax Collected'),
              format: (v: number) => formatCurrency(v),
            },
          ]}
          rows={data.sales}
        />
      </div>

      {/* Top customers */}
      <div>
        <SectionTitle>{tr('reports.topCustomers', 'Top Customers')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          headers={[
            { key: 'name', label: tr('reports.customerName', 'Customer') },
            {
              key: 'revenue',
              label: tr('reports.revenue', 'Revenue'),
              format: (v: number) => formatCurrency(v),
            },
            {
              key: 'invoice_count',
              label: tr('reports.invoiceCount', 'Invoices'),
              format: (v: number) => formatNumber(v),
            },
          ]}
          rows={data.topCustomers}
        />
      </div>
    </>
  );
};

export default SalesReport;
