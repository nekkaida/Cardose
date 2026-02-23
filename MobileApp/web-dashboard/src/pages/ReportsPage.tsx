import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useReportTranslation } from '../hooks/useReportTranslation';
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
  DATE_PRESETS,
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

function getErrorMessage(err: unknown, tr: (key: string, fallback: string) => string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as { response?: { status?: number } };
    const status = axiosErr.response?.status;
    if (status === 401 || status === 403) {
      return tr('reports.errorAuth', 'Your session has expired. Please log in again.');
    }
    if (status === 400) {
      return tr(
        'reports.errorBadRequest',
        'Invalid request parameters. Please check your date range.'
      );
    }
    if (status && status >= 500) {
      return tr('reports.errorServer', 'Server error. Our team has been notified.');
    }
  }
  if (err instanceof TypeError || (err instanceof Error && err.message === 'Network Error')) {
    return tr('reports.errorNetwork', 'Network error. Please check your connection and try again.');
  }
  return tr('reports.loadError', 'Failed to load report. Please try again.');
}

// Default to last 30 days so date inputs are pre-populated
function getDefault30Days() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

// ── Component ─────────────────────────────────────────────────────

const ReportsPage: React.FC = () => {
  const defaults = getDefault30Days();
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string>('reports.preset30d');

  const errorBannerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    getSalesReport,
    getInventoryReport,
    getProductionReport,
    getCustomerReport,
    getFinancialReport,
  } = useApi();
  const { language } = useLanguage();
  const tr = useReportTranslation();

  const formatCurrency = React.useMemo(() => makeFormatCurrency(language), [language]);
  const formatNumber = React.useMemo(() => makeFormatNumber(language), [language]);

  const trRef = useRef(tr);
  useEffect(() => {
    trRef.current = tr;
  }, [tr]);

  const fetchReport = useCallback(
    async (type: ReportType, start: string, end: string) => {
      // Cancel any in-flight request to prevent race conditions
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = {};
        if (SUPPORTS_DATE_FILTER.includes(type)) {
          if (start) params.startDate = start;
          if (end) params.endDate = end;
        }

        const { signal } = controller;
        let response;
        switch (type) {
          case 'sales':
            response = await getSalesReport(params, signal);
            break;
          case 'inventory':
            response = await getInventoryReport(signal);
            break;
          case 'production':
            response = await getProductionReport(params, signal);
            break;
          case 'customers':
            response = await getCustomerReport(signal);
            break;
          case 'financial':
            response = await getFinancialReport(params, signal);
            break;
        }

        // Ignore result if this request was superseded by a newer one
        if (controller.signal.aborted) return;

        setReportData(response?.report ?? null);
        setGeneratedAt(new Date().toLocaleString(LOCALE_MAP[language] || 'id-ID'));
      } catch (err) {
        if (controller.signal.aborted) return;
        const msg = getErrorMessage(err, trRef.current);
        setError(msg);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
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

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Focus error banner when error appears
  useEffect(() => {
    if (error && errorBannerRef.current) {
      errorBannerRef.current.focus();
    }
  }, [error]);

  // Auto-fetch when report type changes
  useEffect(() => {
    fetchReport(reportType, startDate, endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only auto-fetch on tab change
  }, [reportType, fetchReport]);

  const handleFetch = () => {
    if (showDateFilter && startDate && endDate && startDate > endDate) {
      setError(tr('reports.errorDateRange', 'Start date must be before or equal to end date.'));
      return;
    }
    fetchReport(reportType, startDate, endDate);
  };

  const handlePresetClick = (presetLabelKey: string) => {
    const preset = DATE_PRESETS.find((p) => p.labelKey === presetLabelKey);
    if (!preset) return;
    const range = preset.getRange();
    setStartDate(range.start);
    setEndDate(range.end);
    setActivePreset(presetLabelKey);
    fetchReport(reportType, range.start, range.end);
  };

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    setActivePreset('reports.presetCustom');
    if (field === 'start') setStartDate(value);
    else setEndDate(value);
  };

  const handleTabSwitch = (newType: ReportType) => {
    if (newType === reportType) return;
    setReportData(null);
    setError(null);
    setGeneratedAt(null);
    setReportType(newType);
  };

  // WAI-ARIA: Arrow key navigation between tabs
  const handleTabKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    const tabs = REPORT_TABS;
    let newIndex = currentIndex;
    switch (e.key) {
      case 'ArrowRight':
        newIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    handleTabSwitch(tabs[newIndex].key);
    document.getElementById(`tab-${tabs[newIndex].key}`)?.focus();
  };

  const renderReport = () => {
    if (!reportData) {
      return (
        <p className="py-6 text-center text-sm text-gray-400" role="status">
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
  const showDateFilter = SUPPORTS_DATE_FILTER.includes(reportType);

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
          aria-label={tr('reports.refresh', 'Refresh')}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
        >
          <svg
            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
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
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label={tr('reports.title', 'Reports')}
      >
        {REPORT_TABS.map((rt, idx) => (
          <button
            key={rt.key}
            id={`tab-${rt.key}`}
            role="tab"
            aria-selected={reportType === rt.key}
            aria-controls="report-content"
            tabIndex={reportType === rt.key ? 0 : -1}
            onClick={() => handleTabSwitch(rt.key)}
            onKeyDown={(e) => handleTabKeyDown(e, idx)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              reportType === rt.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={rt.icon} />
            </svg>
            {tr(rt.labelKey, rt.fallback)}
          </button>
        ))}
      </div>

      {/* Date Filters (for reports that support them) */}
      {showDateFilter && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          {/* Date presets */}
          <div className="mb-3 flex flex-wrap gap-2">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.labelKey}
                onClick={() => handlePresetClick(preset.labelKey)}
                disabled={loading}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  activePreset === preset.labelKey
                    ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tr(preset.labelKey, preset.fallback)}
              </button>
            ))}
            <button
              onClick={() => setActivePreset('reports.presetCustom')}
              disabled={loading}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                activePreset === 'reports.presetCustom'
                  ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tr('reports.presetCustom', 'Custom')}
            </button>
          </div>

          {/* Date inputs + Generate */}
          <div className="flex flex-col items-end gap-3 md:flex-row">
            <div>
              <label
                htmlFor="report-start-date"
                className="mb-1 block text-xs font-medium text-gray-500"
              >
                {tr('reports.startDate', 'Start Date')}
              </label>
              <input
                id="report-start-date"
                type="date"
                value={startDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label
                htmlFor="report-end-date"
                className="mb-1 block text-xs font-medium text-gray-500"
              >
                {tr('reports.endDate', 'End Date')}
              </label>
              <input
                id="report-end-date"
                type="date"
                value={endDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              onClick={handleFetch}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {loading && (
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
              {tr('reports.generate', 'Generate')}
            </button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          ref={errorBannerRef}
          role="alert"
          tabIndex={-1}
          className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <p className="font-medium">{tr('common.error', 'Error')}</p>
              <p className="text-sm">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  handleFetch();
                }}
                className="mt-2 text-sm font-medium text-red-600 underline hover:text-red-800"
              >
                {tr('reports.retry', 'Try Again')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Content */}
      <div
        id="report-content"
        role="tabpanel"
        aria-labelledby={`tab-${reportType}`}
        className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                aria-label={tr('reports.exportCsv', 'Export CSV')}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
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
