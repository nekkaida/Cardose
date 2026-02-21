import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { FinancialReportData } from '@shared/types/reports';
import { StatCard, SectionTitle, DataTable, formatLabel } from './ReportPrimitives';

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

      {/* By category */}
      <div className="mb-6">
        <SectionTitle>{tr('reports.byCategoryType', 'By Category & Type')}</SectionTitle>
        <DataTable
          emptyMessage={emptyMessage}
          headers={[
            {
              key: 'category',
              label: tr('reports.category', 'Category'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'type',
              label: tr('reports.type', 'Type'),
              format: (v: string) => formatLabel(v || '-'),
            },
            {
              key: 'total',
              label: tr('reports.total', 'Total'),
              format: (v: number) => formatCurrency(v),
            },
            {
              key: 'count',
              label: tr('reports.count', 'Count'),
              format: (v: number) => formatNumber(v),
            },
          ]}
          rows={data.byCategory}
        />
      </div>

      {/* Invoice stats */}
      <div>
        <SectionTitle>{tr('reports.invoiceStats', 'Invoice Statistics')}</SectionTitle>
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
          rows={data.invoiceStats}
        />
      </div>
    </>
  );
};

export default FinancialReport;
