import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';
import FinancialSummary from '../components/financial/FinancialSummary';
import TransactionsTab from '../components/financial/TransactionsTab';
import InvoicesTab from '../components/financial/InvoicesTab';
import FinancialErrorBoundary from '../components/financial/FinancialErrorBoundary';
import type { FinancialSummaryResponse } from '@shared/types/financial';

type SummaryData = FinancialSummaryResponse['summary'];

const FinancialPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'invoices'>('transactions');
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);
  const [categoryBreakdown, setCategoryBreakdown] = useState<
    Array<{ category: string; type: string; total?: number; amount?: number }>
  >([]);
  const { getFinancialSummary, getTransactions } = useApi();
  const { t } = useLanguage();

  // Refs for arrow-key focus management
  const txTabRef = useRef<HTMLButtonElement>(null);
  const invTabRef = useRef<HTMLButtonElement>(null);

  // --- Load summary ---
  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      setSummaryError(false);
      const data = await getFinancialSummary();
      setSummary(data.summary);
    } catch (err) {
      console.error('Error loading financial summary:', err);
      setSummaryError(true);
    } finally {
      setSummaryLoading(false);
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

  // --- KPI computed values (strongly typed now) ---
  const totalRevenue = summary?.totalRevenue ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const netProfit = summary?.netProfit ?? totalRevenue - totalExpenses;
  const pendingInvoices = summary?.pendingInvoices ?? 0;

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

  const handleTabKeyDown = (e: React.KeyboardEvent, tab: 'transactions' | 'invoices') => {
    if (e.key === 'ArrowRight' && tab === 'transactions') {
      setActiveTab('invoices');
      invTabRef.current?.focus();
    } else if (e.key === 'ArrowLeft' && tab === 'invoices') {
      setActiveTab('transactions');
      txTabRef.current?.focus();
    }
  };

  return (
    <FinancialErrorBoundary fallbackTitle={t('financial.errorTitle') || 'Financial module error'}>
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
          loading={summaryLoading}
          error={summaryError}
          onRetry={loadSummary}
        />

        {/* Tab Container */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          {/* Tab Bar */}
          <div className="border-b border-gray-100 px-6">
            <div
              className="flex space-x-6"
              role="tablist"
              aria-label={t('financial.tabs') || 'Financial tabs'}
            >
              <button
                ref={txTabRef}
                id="tab-transactions"
                onClick={() => setActiveTab('transactions')}
                aria-selected={activeTab === 'transactions'}
                aria-controls="tabpanel-transactions"
                role="tab"
                tabIndex={activeTab === 'transactions' ? 0 : -1}
                onKeyDown={(e) => handleTabKeyDown(e, 'transactions')}
                className={`border-b-2 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'transactions'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('financial.transactions') || 'Transactions'}
              </button>
              <button
                ref={invTabRef}
                id="tab-invoices"
                onClick={() => setActiveTab('invoices')}
                aria-selected={activeTab === 'invoices'}
                aria-controls="tabpanel-invoices"
                role="tab"
                tabIndex={activeTab === 'invoices' ? 0 : -1}
                onKeyDown={(e) => handleTabKeyDown(e, 'invoices')}
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
          <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
            {activeTab === 'transactions' && <TransactionsTab onDataChange={handleDataChange} />}
            {activeTab === 'invoices' && <InvoicesTab onDataChange={handleDataChange} />}
          </div>
        </div>
      </div>
    </FinancialErrorBoundary>
  );
};

export default FinancialPage;
