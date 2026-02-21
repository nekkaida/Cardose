import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';
import type {
  SalesReportData,
  InventoryReportData,
  ProductionReportData,
  CustomerReportData,
  FinancialReportData,
  ReportType,
  ReportData,
} from '@shared/types/reports';
import { LOCALE_MAP, ReportSkeleton } from '../components/reports/ReportPrimitives';
import {
  REPORT_TABS,
  SUPPORTS_DATE_FILTER,
  exportReportToCSV,
} from '../components/reports/reportConstants';
import SalesReport from '../components/reports/SalesReport';
import InventoryReport from '../components/reports/InventoryReport';
import ProductionReport from '../components/reports/ProductionReport';
import CustomerReport from '../components/reports/CustomerReport';
import FinancialReport from '../components/reports/FinancialReport';

// ── Helpers ───────────────────────────────────────────────────────

const makeFormatCurrency = (locale: string) => (amount: number) =>
  new Intl.NumberFormat(LOCALE_MAP[locale] || 'id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);

const makeFormatNumber = (locale: string) => (n: number) =>
  new Intl.NumberFormat(LOCALE_MAP[locale] || 'id-ID').format(n || 0);

// ── Component ─────────────────────────────────────────────────────

const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const {
    getSalesReport,
    getInventoryReport,
    getProductionReport,
    getCustomerReport,
    getFinancialReport,
  } = useApi();
  const { t, language } = useLanguage();

  const formatCurrency = React.useMemo(() => makeFormatCurrency(language), [language]);
  const formatNumber = React.useMemo(() => makeFormatNumber(language), [language]);

  const tr = useCallback(
    (key: string, fallback: string) => {
      const val = t(key);
      return val === key ? fallback : val;
    },
    [t]
  );
  const trRef = useRef(tr);
  useEffect(() => {
    trRef.current = tr;
  }, [tr]);

  const fetchReport = useCallback(
    async (type: ReportType, start: string, end: string) => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = {};
        if (start) params.startDate = start;
        if (end) params.endDate = end;

        let response;
        switch (type) {
          case 'sales':
            response = await getSalesReport(params);
            break;
          case 'inventory':
            response = await getInventoryReport();
            break;
          case 'production':
            response = await getProductionReport(params);
            break;
          case 'customers':
            response = await getCustomerReport();
            break;
          case 'financial':
            response = await getFinancialReport(params);
            break;
        }
        setReportData(response?.report ?? null);
        setGeneratedAt(new Date().toLocaleString(LOCALE_MAP[language] || 'id-ID'));
      } catch {
        setError(trRef.current('reports.loadError', 'Failed to load report. Please try again.'));
      } finally {
        setLoading(false);
      }
    },
    [
      getSalesReport,
      getInventoryReport,
      getProductionReport,
      getCustomerReport,
      getFinancialReport,
      language,
    ]
  );

  // Auto-fetch when report type changes
  useEffect(() => {
    fetchReport(reportType, startDate, endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only auto-fetch on tab change, dates use Generate button
  }, [reportType, fetchReport]);

  const handleFetch = () => fetchReport(reportType, startDate, endDate);

  const renderReport = () => {
    if (!reportData) {
      return (
        <p className="py-6 text-center text-sm text-gray-400">
          {tr('reports.noData', 'No data available')}
        </p>
      );
    }
    const props = { formatCurrency, formatNumber };
    switch (reportType) {
      case 'sales':
        return <SalesReport data={reportData as SalesReportData} {...props} />;
      case 'inventory':
        return <InventoryReport data={reportData as InventoryReportData} {...props} />;
      case 'production':
        return <ProductionReport data={reportData as ProductionReportData} {...props} />;
      case 'customers':
        return <CustomerReport data={reportData as CustomerReportData} {...props} />;
      case 'financial':
        return <FinancialReport data={reportData as FinancialReportData} {...props} />;
    }
  };

  // ── Render ────────────────────────────────────────────────────

  const activeTab = REPORT_TABS.find((rt) => rt.key === reportType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tr('reports.title', 'Reports')}</h1>
          <p className="text-sm text-gray-500">
            {tr('reports.subtitle', 'Generate and view business reports')}
          </p>
        </div>
        <button
          onClick={handleFetch}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
        >
          <svg
            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {tr('reports.refresh', 'Refresh')}
        </button>
      </div>

      {/* Report Type Tabs */}
      <div className="flex flex-wrap gap-2">
        {REPORT_TABS.map((rt) => (
          <button
            key={rt.key}
            onClick={() => {
              if (rt.key !== reportType) {
                setReportData(null);
                setReportType(rt.key);
              }
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              reportType === rt.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={rt.icon} />
            </svg>
            {tr(rt.labelKey, rt.fallback)}
          </button>
        ))}
      </div>

      {/* Date Filters (for reports that support them) */}
      {SUPPORTS_DATE_FILTER.includes(reportType) && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col items-end gap-3 md:flex-row">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                {tr('reports.startDate', 'Start Date')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                {tr('reports.endDate', 'End Date')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              onClick={handleFetch}
              disabled={loading}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {tr('reports.generate', 'Generate')}
            </button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-700">
          <p className="font-medium">{tr('common.error', 'Error')}</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => {
              setError(null);
              handleFetch();
            }}
            className="mt-2 text-sm text-red-600 underline"
          >
            {tr('reports.retry', 'Try Again')}
          </button>
        </div>
      )}

      {/* Report Content */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {tr(activeTab?.labelKey ?? '', activeTab?.fallback ?? '')}
          </h2>
          <div className="flex items-center gap-3">
            {reportData && !loading && (
              <button
                onClick={() =>
                  exportReportToCSV(
                    reportData as unknown as Record<string, unknown>,
                    `${reportType}_report.csv`
                  )
                }
                className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                {tr('reports.exportCsv', 'Export CSV')}
              </button>
            )}
            {generatedAt && !loading && (
              <span className="text-xs text-gray-400">
                {tr('reports.generatedAt', 'Generated at')} {generatedAt}
              </span>
            )}
          </div>
        </div>

        {loading ? <ReportSkeleton /> : renderReport()}
      </div>
    </div>
  );
};

export default ReportsPage;
