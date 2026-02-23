import React from 'react';
import type { CustomerReportData } from '@shared/types/reports';
import { useReportTranslation } from '../../hooks/useReportTranslation';
import { ReportDonutChart, ReportBarChart, CHART_COLORS } from './ReportCharts';
import {
  StatCard,
  SectionTitle,
  DataTable,
  formatLabel,
  buildPaginationLabels,
} from './ReportPrimitives';

export interface CustomerReportProps {
  data: CustomerReportData;
  formatCurrency: (n: number) => string;
  formatNumber: (n: number) => string;
}

const CustomerReport: React.FC<CustomerReportProps> = ({ data, formatCurrency, formatNumber }) => {
  const tr = useReportTranslation();

  const emptyMessage = tr('reports.noData', 'No data available');

  const paginationLabels = buildPaginationLabels(tr);

  // Chart data
  const donutData = data.byLoyaltyStatus.map((s) => ({
    name: formatLabel(s.loyalty_status || '-'),
    value: s.count,
  }));

  const barData = data.byBusinessType.map((b) => ({
    business_type: formatLabel(b.business_type || '-'),
    total_spent: b.total_spent,
    count: b.count,
  }));

  return (
    <>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
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

      {/* Charts row */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {data.byLoyaltyStatus.length > 0 && (
          <div>
            <SectionTitle>
              {tr('reports.customerDistribution', 'Customer Distribution')}
            </SectionTitle>
            <ReportDonutChart
              data={donutData}
              centerLabel={tr('reports.totalCustomers', 'Total Customers')}
              centerValue={String(data.summary.totalCustomers)}
            />
          </div>
        )}

        {data.byBusinessType.length > 0 && (
          <div>
            <SectionTitle>{tr('reports.spendingByType', 'Spending by Business Type')}</SectionTitle>
            <ReportBarChart
              data={barData}
              xKey="business_type"
              bars={[
                {
                  key: 'total_spent',
                  color: CHART_COLORS.success,
                  label: tr('reports.totalSpent', 'Total Spent'),
                },
              ]}
              formatY={formatCurrency}
              formatTooltip={formatCurrency}
            />
          </div>
        )}
      </div>

      {/* By business type */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.byBusinessType', 'By Business Type')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          paginationLabels={paginationLabels}
          headers={[
            {
              key: 'business_type',
              label: tr('reports.businessType', 'Business Type'),
              format: (v) => formatLabel((v as string) || '-'),
            },
            {
              key: 'count',
              label: tr('reports.count', 'Count'),
              format: (v) => formatNumber(v as number),
            },
            {
              key: 'total_spent',
              label: tr('reports.totalSpent', 'Total Spent'),
              format: (v) => formatCurrency(v as number),
            },
            {
              key: 'avg_orders',
              label: tr('reports.avgOrders', 'Avg Orders'),
              format: (v) => Number((v as number) || 0).toFixed(1),
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
          paginationLabels={paginationLabels}
          headers={[
            {
              key: 'loyalty_status',
              label: tr('reports.loyaltyStatus', 'Loyalty Status'),
              format: (v) => formatLabel((v as string) || '-'),
            },
            {
              key: 'count',
              label: tr('reports.count', 'Count'),
              format: (v) => formatNumber(v as number),
            },
            {
              key: 'total_spent',
              label: tr('reports.totalSpent', 'Total Spent'),
              format: (v) => formatCurrency(v as number),
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
          paginationLabels={paginationLabels}
          headers={[
            { key: 'name', label: tr('reports.customerName', 'Customer') },
            {
              key: 'business_type',
              label: tr('reports.businessType', 'Business Type'),
              format: (v) => formatLabel((v as string) || '-'),
            },
            {
              key: 'loyalty_status',
              label: tr('reports.loyaltyStatus', 'Loyalty Status'),
              format: (v) => formatLabel((v as string) || '-'),
            },
            {
              key: 'total_orders',
              label: tr('reports.totalOrdersCol', 'Total Orders'),
              format: (v) => formatNumber(v as number),
            },
            {
              key: 'total_spent',
              label: tr('reports.totalSpent', 'Total Spent'),
              format: (v) => formatCurrency(v as number),
            },
          ]}
          rows={data.topCustomers}
        />
      </div>
    </>
  );
};

export default CustomerReport;
