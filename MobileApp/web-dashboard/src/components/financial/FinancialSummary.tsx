import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatShortCurrency, formatCurrency } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';

interface FinancialSummaryProps {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingInvoices: number;
  chartData: Array<{ category: string; income: number; expense: number }>;
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  totalRevenue,
  totalExpenses,
  netProfit,
  pendingInvoices,
  chartData,
}) => {
  const { t } = useLanguage();

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            {t('financial.totalRevenue') || 'Total Revenue'}
          </p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {formatShortCurrency(totalRevenue)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            {t('financial.totalExpenses') || 'Total Expenses'}
          </p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {formatShortCurrency(totalExpenses)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            {t('financial.netProfit') || 'Net Profit'}
          </p>
          <p
            className={`mt-1 text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {formatShortCurrency(netProfit)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            {t('financial.pendingInvoices') || 'Pending Invoices'}
          </p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">{pendingInvoices}</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            {t('financial.chartTitle') || 'Income vs Expenses by Category'}
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatShortCurrency} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
        </div>
      )}
    </>
  );
};

export default FinancialSummary;
