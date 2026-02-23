import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatShortCurrency, formatCurrency } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';

interface FinancialSummaryProps {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingInvoices: number;
  chartData: Array<{ category: string; income: number; expense: number }>;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

const KpiSkeleton: React.FC = () => (
  <div className="animate-pulse rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="mb-2 h-3 w-24 rounded bg-gray-200" />
    <div className="h-7 w-32 rounded bg-gray-200" />
  </div>
);

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  totalRevenue,
  totalExpenses,
  netProfit,
  pendingInvoices,
  chartData,
  loading = false,
  error = false,
  onRetry,
}) => {
  const { t, language } = useLanguage();

  if (error && !loading) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
        <svg
          className="mx-auto mb-3 h-10 w-10 text-red-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
        <p className="mb-1 font-medium text-red-600">
          {t('financial.summaryError') || 'Failed to load financial summary'}
        </p>
        <p className="mb-3 text-sm text-red-400">
          {t('financial.summaryErrorHint') || 'KPI data may be inaccurate.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            {t('common.retry') || 'Retry'}
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-gray-500">
                {t('financial.totalRevenue') || 'Total Revenue'}
              </p>
              <p className="mt-1 text-2xl font-bold text-green-600">
                {formatShortCurrency(totalRevenue, language)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-gray-500">
                {t('financial.totalExpenses') || 'Total Expenses'}
              </p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {formatShortCurrency(totalExpenses, language)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-gray-500">
                {t('financial.netProfit') || 'Net Profit'}
              </p>
              <p
                className={`mt-1 text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatShortCurrency(netProfit, language)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-gray-500">
                {t('financial.pendingInvoices') || 'Pending Invoices'}
              </p>
              <p className="mt-1 text-2xl font-bold text-yellow-600">{pendingInvoices}</p>
            </div>
          </>
        )}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          {t('financial.chartTitle') || 'Income vs Expenses by Category'}
        </h2>
        {loading ? (
          <div className="flex h-[280px] animate-pulse items-center justify-center">
            <div className="h-48 w-full rounded bg-gray-100" />
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(v: number) => formatShortCurrency(v, language)}
                tick={{ fontSize: 11 }}
              />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar
                dataKey="income"
                fill="#10b981"
                name={t('financial.income') || 'Income'}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expense"
                fill="#ef4444"
                name={t('financial.expense') || 'Expense'}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[280px] flex-col items-center justify-center text-gray-400">
            <svg className="mb-3 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
            <p className="text-sm font-medium">
              {t('financial.noChartData') || 'No category data available'}
            </p>
            <p className="mt-1 text-xs">
              {t('financial.noChartDataHint') || 'Create transactions to see the breakdown chart.'}
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default FinancialSummary;
