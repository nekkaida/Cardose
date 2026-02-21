import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';
import FinancialSummary from '../components/financial/FinancialSummary';
import TransactionsTab from '../components/financial/TransactionsTab';
import InvoicesTab from '../components/financial/InvoicesTab';

const FinancialPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'invoices'>('transactions');
  const [summary, setSummary] = useState<Record<string, number | string> | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<
    Array<{ category: string; type: string; total?: number; amount?: number }>
  >([]);
  const { getFinancialSummary, getTransactions } = useApi();
  const { t } = useLanguage();

  // --- Load summary ---
  const loadSummary = useCallback(async () => {
    try {
      const data = await getFinancialSummary();
      setSummary(data.summary || data);
    } catch (err) {
      console.error('Error loading financial summary:', err);
    }
  }, [getFinancialSummary]);

  // Load category breakdown for chart (one-time alongside summary)
  const loadCategoryBreakdown = useCallback(async () => {
    try {
      const data = await getTransactions({ page: 1, limit: 1 });
      if (data.categoryBreakdown) {
        setCategoryBreakdown(data.categoryBreakdown);
      }
    } catch {
      // Chart data is non-critical; ignore errors
    }
  }, [getTransactions]);

  useEffect(() => {
    loadSummary();
    loadCategoryBreakdown();
  }, [loadSummary, loadCategoryBreakdown]);

  // Callback for child tabs to trigger summary reload
  const handleDataChange = useCallback(() => {
    loadSummary();
    loadCategoryBreakdown();
  }, [loadSummary, loadCategoryBreakdown]);

  // --- KPI computed values ---
  const totalRevenue = Number(summary?.total_revenue || summary?.totalRevenue || 0);
  const totalExpenses = Number(summary?.total_expenses || summary?.totalExpenses || 0);
  const netProfit = Number(
    summary?.netProfit || summary?.net_profit || totalRevenue - totalExpenses
  );
  const pendingInvoices = Number(summary?.pending_invoices || summary?.pendingInvoices || 0);

  // --- Chart data ---
  const chartData = useMemo(() => {
    if (!categoryBreakdown || categoryBreakdown.length === 0) return [];
    const grouped: Record<string, { income: number; expense: number }> = {};
    categoryBreakdown.forEach((item) => {
      const cat = item.category || 'other';
      if (!grouped[cat]) grouped[cat] = { income: 0, expense: 0 };
      if (item.type === 'income') grouped[cat].income += item.total || item.amount || 0;
      else grouped[cat].expense += item.total || item.amount || 0;
    });
    return Object.entries(grouped)
      .map(([category, values]) => ({ category, ...values }))
      .sort((a, b) => b.income + b.expense - (a.income + a.expense))
      .slice(0, 8);
  }, [categoryBreakdown]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('financial.title') || 'Financial'}
          </h1>
          <p className="text-sm text-gray-500">
            {t('financial.subtitle') || 'Financial overview and transactions'}
          </p>
        </div>
      </div>

      {/* KPI Cards & Chart */}
      <FinancialSummary
        totalRevenue={totalRevenue}
        totalExpenses={totalExpenses}
        netProfit={netProfit}
        pendingInvoices={pendingInvoices}
        chartData={chartData}
      />

      {/* Tab Container */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {/* Tab Bar */}
        <div className="border-b border-gray-100 px-6">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`border-b-2 py-3 text-sm font-medium transition-colors ${
                activeTab === 'transactions'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('financial.transactions') || 'Transactions'}
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`border-b-2 py-3 text-sm font-medium transition-colors ${
                activeTab === 'invoices'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('financial.invoices') || 'Invoices'}
            </button>
          </div>
        </div>

        {/* Active Tab Content */}
        {activeTab === 'transactions' && <TransactionsTab onDataChange={handleDataChange} />}
        {activeTab === 'invoices' && <InvoicesTab onDataChange={handleDataChange} />}
      </div>
    </div>
  );
};

export default FinancialPage;
