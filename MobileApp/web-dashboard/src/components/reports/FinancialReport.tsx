import React from 'react';
import type { FinancialReportData } from '@shared/types/reports';
import { useReportTranslation } from '../../hooks/useReportTranslation';
import {
  StatCard,
  SectionTitle,
  DataTable,
  formatLabel,
  buildPaginationLabels,
} from './ReportPrimitives';
import { ReportBarChart, ReportDonutChart, CHART_COLORS } from './ReportCharts';

export interface FinancialReportProps {
  data: FinancialReportData;
  formatCurrency: (n: number) => string;
  formatNumber: (n: number) => string;
}

const FinancialReport: React.FC<FinancialReportProps> = ({
  data,
  formatCurrency,
  formatNumber,
}) => {
  const tr = useReportTranslation();

  const emptyMessage = tr('reports.noData', 'No data available');

  const paginationLabels = buildPaginationLabels(tr);

  // Aggregated data for the Income vs Expense bar chart
  const incomeVsExpense = [
    { type: tr('reports.totalIncome', 'Income'), amount: data.summary.totalIncome },
    { type: tr('reports.totalExpense', 'Expense'), amount: data.summary.totalExpense },
  ];

  // Data for the Invoice Distribution donut chart
  const invoiceDonutData = data.invoiceStats.map((s) => ({
    name: formatLabel(s.status),
    value: s.count,
  }));

  const totalInvoiceCount = data.invoiceStats.reduce((sum, s) => sum + s.count, 0);

  return (
    <>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label={tr('reports.totalIncome', 'Total Income')}
          value={formatCurrency(data.summary.totalIncome)}
          accent="text-green-600"
        />
        <StatCard
          label={tr('reports.totalExpense', 'Total Expense')}
          value={formatCurrency(data.summary.totalExpense)}
          accent="text-red-600"
        />
        <StatCard
          label={tr('reports.netIncome', 'Net Income')}
          value={formatCurrency(data.summary.netIncome)}
          accent={data.summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <StatCard
          label={tr('reports.incomeCount', 'Income Transactions')}
          value={formatNumber(data.summary.incomeCount)}
        />
        <StatCard
          label={tr('reports.expenseCount', 'Expense Transactions')}
          value={formatNumber(data.summary.expenseCount)}
        />
      </div>

      {/* Period */}
      {data.period && (
        <p className="mb-4 text-xs text-gray-400">
          {tr('reports.period', 'Period')}: {data.period.start} — {data.period.end}
        </p>
      )}

      {/* Charts row */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Income vs Expense bar chart */}
        <div>
          <SectionTitle>{tr('reports.incomeVsExpense', 'Income vs Expense')}</SectionTitle>
          <ReportBarChart
            data={incomeVsExpense}
            xKey="type"
            bars={[
              {
                key: 'amount',
                color: CHART_COLORS.primary,
                label: tr('reports.total', 'Total'),
              },
            ]}
            height={250}
            formatY={formatCurrency}
            formatTooltip={formatCurrency}
          />
        </div>

        {/* Invoice Distribution donut chart */}
        {data.invoiceStats.length > 0 && (
          <div>
            <SectionTitle>{tr('reports.invoiceDistribution', 'Invoice Distribution')}</SectionTitle>
            <ReportDonutChart
              data={invoiceDonutData}
              centerLabel={tr('reports.invoiceStats', 'Invoices')}
              centerValue={String(totalInvoiceCount)}
            />
          </div>
        )}
      </div>

      {/* By category table */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.byCategoryType', 'By Category & Type')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          paginationLabels={paginationLabels}
          headers={[
            {
              key: 'category',
              label: tr('reports.category', 'Category'),
              format: (v: unknown) => formatLabel((v as string) || '-'),
            },
            {
              key: 'type',
              label: tr('reports.type', 'Type'),
              format: (v: unknown) => formatLabel((v as string) || '-'),
            },
            {
              key: 'total',
              label: tr('reports.total', 'Total'),
              format: (v: unknown) => formatCurrency(v as number),
            },
            {
              key: 'count',
              label: tr('reports.count', 'Count'),
              format: (v: unknown) => formatNumber(v as number),
            },
          ]}
          rows={data.byCategory}
        />
      </div>

      {/* Invoice stats table */}
      <div>
        <SectionTitle>{tr('reports.invoiceStats', 'Invoice Statistics')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          paginationLabels={paginationLabels}
          headers={[
            {
              key: 'status',
              label: tr('reports.status', 'Status'),
              format: (v: unknown) => formatLabel((v as string) || '-'),
            },
            {
              key: 'count',
              label: tr('reports.count', 'Count'),
              format: (v: unknown) => formatNumber(v as number),
            },
            {
              key: 'value',
              label: tr('reports.value', 'Value'),
              format: (v: unknown) => formatCurrency(v as number),
            },
          ]}
          rows={data.invoiceStats}
        />
      </div>
    </>
  );
};

export default FinancialReport;
