import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { CustomerReportData } from '@shared/types/reports';
import { StatCard, SectionTitle, DataTable, formatLabel } from './ReportPrimitives';

export interface CustomerReportProps {
  data: CustomerReportData;
  formatCurrency: (n: number) => string;
  formatNumber: (n: number) => string;
}

const CustomerReport: React.FC<CustomerReportProps> = ({ data, formatCurrency, formatNumber }) => {
  const { t } = useLanguage();
  const tr = (key: string, fallback: string) => {
    const val = t(key);
    return val === key ? fallback : val;
  };

  const emptyMessage = tr('reports.noData', 'No data available');

  return (
    <>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label={tr('reports.totalCustomers', 'Total Customers')}
          value={formatNumber(data.summary.totalCustomers)}
        />
        <StatCard
          label={tr('reports.vipCustomers', 'VIP Customers')}
          value={formatNumber(data.summary.vipCustomers)}
          accent="text-amber-600"
        />
        <StatCard
          label={tr('reports.totalRevenue', 'Total Revenue')}
          value={formatCurrency(data.summary.totalRevenue)}
          accent="text-green-600"
        />
        <StatCard
          label={tr('reports.averageSpent', 'Average Spent')}
          value={formatCurrency(data.summary.averageSpent)}
        />
        <StatCard
          label={tr('reports.newThisMonth', 'New This Month')}
          value={formatNumber(data.summary.newThisMonth)}
          accent="text-blue-600"
        />
      </div>

      {/* By business type */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.byBusinessType', 'By Business Type')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          headers={[
            {
              key: 'business_type',
              label: tr('reports.businessType', 'Business Type'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'count',
              label: tr('reports.count', 'Count'),
              format: (v: number) => formatNumber(v),
            },
            {
              key: 'total_spent',
              label: tr('reports.totalSpent', 'Total Spent'),
              format: (v: number) => formatCurrency(v),
            },
            {
              key: 'avg_orders',
              label: tr('reports.avgOrders', 'Avg Orders'),
              format: (v: number) => Number(v || 0).toFixed(1),
            },
          ]}
          rows={data.byBusinessType}
        />
      </div>

      {/* By loyalty status */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.byLoyaltyStatus', 'By Loyalty Status')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          headers={[
            {
              key: 'loyalty_status',
              label: tr('reports.loyaltyStatus', 'Loyalty Status'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'count',
              label: tr('reports.count', 'Count'),
              format: (v: number) => formatNumber(v),
            },
            {
              key: 'total_spent',
              label: tr('reports.totalSpent', 'Total Spent'),
              format: (v: number) => formatCurrency(v),
            },
          ]}
          rows={data.byLoyaltyStatus}
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
              key: 'business_type',
              label: tr('reports.businessType', 'Business Type'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'loyalty_status',
              label: tr('reports.loyaltyStatus', 'Loyalty Status'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'total_orders',
              label: tr('reports.totalOrdersCol', 'Total Orders'),
              format: (v: number) => formatNumber(v),
            },
            {
              key: 'total_spent',
              label: tr('reports.totalSpent', 'Total Spent'),
              format: (v: number) => formatCurrency(v),
            },
          ]}
          rows={data.topCustomers}
        />
      </div>
    </>
  );
};

export default CustomerReport;
