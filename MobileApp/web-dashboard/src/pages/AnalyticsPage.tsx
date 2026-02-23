import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { DashboardData, RevenueAnalytics, CustomerAnalytics } from '@shared/types/analytics';
import { exportToCSV } from '../utils/formatters';
// Sub-components
import {
  SkeletonKPICard,
  SkeletonChart,
  RefetchableSection,
  ChartErrorBoundary,
} from '../components/analytics/AnalyticsPrimitives';
import KpiCards from '../components/analytics/KpiCards';
import OrderStatusChart from '../components/analytics/OrderStatusChart';
import CustomerSegmentChart from '../components/analytics/CustomerSegmentChart';
import RevenueTrendChart from '../components/analytics/RevenueTrendChart';
import TopCustomersChart from '../components/analytics/TopCustomersChart';
import ProductionPipelineChart from '../components/analytics/ProductionPipelineChart';
import InventoryOverviewCards from '../components/analytics/InventoryOverviewCards';

// ---------------------------------------------------------------------------
// Local types (only page-specific)
// ---------------------------------------------------------------------------

/** Stores i18n key + fallback so error messages update on language switch. */
interface ErrorEntry {
  key: string;
  fallback: string;
}

interface SectionErrors {
  dashboard: ErrorEntry | null;
  revenue: ErrorEntry | null;
  customer: ErrorEntry | null;
}

const LOAD_ERROR: ErrorEntry = {
  key: 'analytics.loadError',
  fallback: 'Failed to load this section',
};

// ---------------------------------------------------------------------------
// Period options
// ---------------------------------------------------------------------------

type PeriodKey = 'week' | 'month' | 'quarter' | 'year';

interface PeriodOption {
  value: PeriodKey;
  labelKey: string;
  fallback: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'week', labelKey: 'analytics.thisWeek', fallback: 'This Week' },
  { value: 'month', labelKey: 'analytics.thisMonth', fallback: 'This Month' },
  { value: 'quarter', labelKey: 'analytics.thisQuarter', fallback: 'This Quarter' },
  { value: 'year', labelKey: 'analytics.thisYear', fallback: 'This Year' },
];

// Max trend data points to display per period for readability
const TREND_LIMIT: Record<PeriodKey, number> = {
  week: 4,
  month: 6,
  quarter: 12,
  year: 12,
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const AnalyticsPage: React.FC = () => {
  const { getDashboardAnalytics, getRevenueAnalytics, getCustomerAnalytics } = useApi();
  const { t, language } = useLanguage();

  // Translation helper with fallback
  const tr = useCallback(
    (key: string, fallback: string): string => {
      const val = t(key);
      return val === key ? fallback : val;
    },
    // language is not a direct dep of `t`, but when language changes the
    // translations change, so we include it to recalculate memos downstream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, language]
  );

  // ---- State ----
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueAnalytics | null>(null);
  const [customerData, setCustomerData] = useState<CustomerAnalytics | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [errors, setErrors] = useState<SectionErrors>({
    dashboard: null,
    revenue: null,
    customer: null,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // AbortController ref for cancelling in-flight requests
  const abortRef = useRef<AbortController | null>(null);
  // Tracks whether we've successfully loaded data at least once
  const hasLoadedRef = useRef(false);

  // ---- Data fetching ----
  const loadAnalytics = useCallback(async () => {
    // Cancel any in-flight requests
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!hasLoadedRef.current) {
      setInitialLoading(true);
    } else {
      setRefetching(true);
    }
    setErrors({ dashboard: null, revenue: null, customer: null });

    try {
      const [dashResult, revResult, custResult] = await Promise.allSettled([
        getDashboardAnalytics({ period }, controller.signal),
        getRevenueAnalytics({ period }, controller.signal),
        getCustomerAnalytics({ period }, controller.signal),
      ]);

      // If aborted, bail out silently
      if (controller.signal.aborted) return;

      // Dashboard
      if (dashResult.status === 'fulfilled') {
        setDashboard(dashResult.value ?? null);
      } else if (!isAbortError(dashResult.reason)) {
        setErrors((prev) => ({ ...prev, dashboard: LOAD_ERROR }));
      }

      // Revenue
      if (revResult.status === 'fulfilled') {
        setRevenueData(revResult.value ?? null);
      } else if (!isAbortError(revResult.reason)) {
        setErrors((prev) => ({ ...prev, revenue: LOAD_ERROR }));
      }

      // Customer
      if (custResult.status === 'fulfilled') {
        setCustomerData(custResult.value ?? null);
      } else if (!isAbortError(custResult.reason)) {
        setErrors((prev) => ({ ...prev, customer: LOAD_ERROR }));
      }

      // Only mark as loaded when at least one API succeeded (so a total-failure
      // retry still shows skeleton instead of overlay-over-nothing)
      const anySuccess =
        dashResult.status === 'fulfilled' ||
        revResult.status === 'fulfilled' ||
        custResult.status === 'fulfilled';
      if (anySuccess) {
        hasLoadedRef.current = true;
        setLastUpdated(new Date());
      }
    } finally {
      if (!controller.signal.aborted) {
        setInitialLoading(false);
        setRefetching(false);
      }
    }
  }, [getDashboardAnalytics, getRevenueAnalytics, getCustomerAnalytics, period]);

  // Initial load + re-fetch when period changes
  useEffect(() => {
    loadAnalytics();
    return () => {
      abortRef.current?.abort();
    };
  }, [loadAnalytics]);

  // ---- Resolve error entries to strings at render time (language-reactive) ----

  const resolveError = useCallback(
    (entry: ErrorEntry | null): string | null => (entry ? tr(entry.key, entry.fallback) : null),
    [tr]
  );

  const dashboardError = resolveError(errors.dashboard);
  const revenueError = resolveError(errors.revenue);
  const customerError = resolveError(errors.customer);

  // ---- Common error boundary props ----

  const errorBoundaryMsg = tr(
    'analytics.renderError',
    'Something went wrong displaying this section'
  );
  const retryLabel = tr('analytics.refresh', 'Refresh');

  // ---- Derived / memoized chart data ----

  const orderStatusData = useMemo(() => {
    if (!dashboard?.orders) return [];
    const o = dashboard.orders;
    return [
      { name: tr('analytics.completed', 'Completed'), value: o.completed_orders ?? 0 },
      { name: tr('analytics.active', 'Active'), value: o.active_orders ?? 0 },
      { name: tr('analytics.cancelled', 'Cancelled'), value: o.cancelled_orders ?? 0 },
    ].filter((d) => d.value > 0);
  }, [dashboard, tr]);

  const customerSegmentData = useMemo(() => {
    const segments = customerData?.by_business_type;
    if (!segments || segments.length === 0) return [];
    return segments
      .map((s) => ({ name: s.business_type, value: s.count }))
      .filter((d) => d.value > 0);
  }, [customerData]);

  const revenueTrend = useMemo(() => {
    const trend = revenueData?.trend;
    if (!trend || trend.length === 0) return [];
    const limit = TREND_LIMIT[period];
    const sliced = trend.slice(-limit);
    return sliced.map((m) => ({
      month: m.month ?? '',
      revenue: m.revenue ?? 0,
      invoices: m.invoice_count ?? 0,
    }));
  }, [revenueData, period]);

  const topCustomers = useMemo(() => {
    const list = customerData?.top_customers;
    if (!list || list.length === 0) return [];
    return list.slice(0, 5).map((c) => {
      const fullName = c.name ?? '';
      const displayName = fullName.length > 18 ? fullName.substring(0, 18) + '\u2026' : fullName;
      return {
        name: displayName,
        fullName,
        revenue: c.total_revenue ?? 0,
      };
    });
  }, [customerData]);

  const productionData = useMemo(() => {
    if (!dashboard?.production) return [];
    const p = dashboard.production;
    return [
      { stage: tr('analytics.designing', 'Designing'), count: p.designing ?? 0 },
      { stage: tr('analytics.production', 'Production'), count: p.in_production ?? 0 },
      { stage: tr('analytics.qualityControl', 'QC'), count: p.quality_control ?? 0 },
    ];
  }, [dashboard, tr]);

  // ---- Export handler (i18n-aware) ----
  const handleExport = useCallback(() => {
    const rows: Record<string, unknown>[] = [];
    const kpiSection = tr('analytics.kpi', 'KPI');
    const invSection = tr('analytics.inventoryOverview', 'Inventory');
    const revSection = tr('analytics.revenueTrend', 'Revenue Trend');
    const custSection = tr('analytics.topCustomers', 'Top Customers');

    if (dashboard) {
      const o = dashboard.orders;
      const r = dashboard.revenue;
      const c = dashboard.customers;
      const inv = dashboard.inventory;
      rows.push({
        section: kpiSection,
        metric: tr('analytics.totalOrders', 'Total Orders'),
        value: o.total_orders,
      });
      rows.push({
        section: kpiSection,
        metric: tr('analytics.revenue', 'Revenue'),
        value: r.total_revenue,
      });
      rows.push({
        section: kpiSection,
        metric: tr('analytics.customers', 'Customers'),
        value: c.total_customers,
      });
      rows.push({
        section: kpiSection,
        metric: tr('analytics.avgOrder', 'Avg Order Value'),
        value: r.average_order_value,
      });
      rows.push({
        section: kpiSection,
        metric: tr('analytics.completionRate', 'Completion Rate'),
        value: o.completion_rate,
      });
      rows.push({
        section: invSection,
        metric: tr('analytics.totalMaterials', 'Total Materials'),
        value: inv.total_materials,
      });
      rows.push({
        section: invSection,
        metric: tr('analytics.outOfStock', 'Out of Stock'),
        value: inv.out_of_stock,
      });
      rows.push({
        section: invSection,
        metric: tr('analytics.lowStock', 'Low Stock'),
        value: inv.low_stock,
      });
      rows.push({
        section: invSection,
        metric: tr('analytics.totalValue', 'Total Value'),
        value: inv.total_value,
      });
    }
    if (revenueData?.trend) {
      for (const item of revenueData.trend) {
        rows.push({ section: revSection, metric: item.month, value: item.revenue });
      }
    }
    if (customerData?.top_customers) {
      for (const c of customerData.top_customers.slice(0, 5)) {
        rows.push({ section: custSection, metric: c.name, value: c.total_revenue });
      }
    }
    if (dashboard?.production) {
      const prodSection = tr('analytics.productionPipeline', 'Production Pipeline');
      const p = dashboard.production;
      rows.push({
        section: prodSection,
        metric: tr('analytics.designing', 'Designing'),
        value: p.designing,
      });
      rows.push({
        section: prodSection,
        metric: tr('analytics.production', 'Production'),
        value: p.in_production,
      });
      rows.push({
        section: prodSection,
        metric: tr('analytics.qualityControl', 'QC'),
        value: p.quality_control,
      });
    }
    if (rows.length > 0) {
      exportToCSV(rows, `analytics-${period}-${new Date().toISOString().slice(0, 10)}.csv`);
    }
  }, [dashboard, revenueData, customerData, period, tr]);

  // ---- Convenience accessors with null safety ----

  const revenue = dashboard?.revenue;
  const orders = dashboard?.orders;
  const customers = dashboard?.customers;
  const inventory = dashboard?.inventory;

  const completionRate = Number(orders?.completion_rate ?? 0);
  const clampedRate = Math.min(completionRate, 100);

  // ---- Render ----

  // Skeleton loading state (only on first load)
  if (initialLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="animate-pulse">
            <div className="mb-2 h-7 w-56 rounded bg-gray-200" />
            <div className="h-4 w-72 rounded bg-gray-200" />
          </div>
          <div className="flex animate-pulse items-center gap-3">
            <div className="h-9 w-32 rounded bg-gray-200" />
            <div className="h-9 w-9 rounded bg-gray-200" />
          </div>
        </div>

        {/* KPI skeletons */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SkeletonKPICard />
          <SkeletonKPICard />
          <SkeletonKPICard />
          <SkeletonKPICard />
        </div>

        {/* Chart skeletons */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonChart height={220} />
          <SkeletonChart height={200} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* Header row                                                       */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {tr('analytics.title', 'Business Analytics')}
          </h1>
          <p className="text-sm text-gray-500">
            {tr('analytics.subtitle', 'Detailed business insights and reports')}
            {lastUpdated && (
              <span className="ml-2 text-xs text-gray-400" title={lastUpdated.toLocaleString()}>
                &middot; {tr('analytics.lastUpdated', 'Updated')} {formatRelativeTime(lastUpdated)}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            disabled={refetching}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-50"
            aria-label={tr('analytics.period', 'Period')}
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {tr(opt.labelKey, opt.fallback)}
              </option>
            ))}
          </select>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={!dashboard}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={tr('common.export', 'Export')}
            title={tr('common.export', 'Export')}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            CSV
          </button>

          {/* Refresh button */}
          <button
            onClick={loadAnalytics}
            disabled={refetching}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-50"
            aria-label={tr('analytics.refresh', 'Refresh')}
            title={tr('analytics.refresh', 'Refresh')}
          >
            <svg
              className={`h-4 w-4 ${refetching ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* KPI Cards                                                        */}
      {/* ---------------------------------------------------------------- */}
      <ChartErrorBoundary
        key={`kpi-${period}`}
        fallbackMessage={errorBoundaryMsg}
        retryLabel={retryLabel}
        onRetry={loadAnalytics}
        retrying={refetching}
      >
        <RefetchableSection refetching={refetching}>
          <KpiCards
            orders={orders}
            revenue={revenue}
            customers={customers}
            error={dashboardError}
            onRetry={loadAnalytics}
            retrying={refetching}
            tr={tr}
          />
        </RefetchableSection>
      </ChartErrorBoundary>

      {/* ---------------------------------------------------------------- */}
      {/* Completion Rate                                                   */}
      {/* ---------------------------------------------------------------- */}
      {!errors.dashboard && dashboard?.orders && (
        <ChartErrorBoundary
          key={`cr-${period}`}
          fallbackMessage={errorBoundaryMsg}
          retryLabel={retryLabel}
          onRetry={loadAnalytics}
          retrying={refetching}
        >
          <RefetchableSection refetching={refetching}>
            <div
              className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
              role="figure"
              aria-label={tr('analytics.completionRate', 'Completion Rate')}
            >
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {tr('analytics.completionRate', 'Completion Rate')}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {completionRate.toFixed(1)}%
                </p>
              </div>
              <div
                className="h-3 w-48 rounded-full bg-gray-200"
                role="progressbar"
                aria-valuenow={clampedRate}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={`${completionRate.toFixed(1)}% ${tr('analytics.completionRate', 'completion rate')}`}
              >
                <div
                  className="h-3 rounded-full bg-brand-600 transition-all"
                  style={{ width: `${clampedRate}%` }}
                />
              </div>
            </div>
          </RefetchableSection>
        </ChartErrorBoundary>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Charts Row 1: Order Status + Customer Segments                   */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartErrorBoundary
          key={`os-${period}`}
          fallbackMessage={errorBoundaryMsg}
          retryLabel={retryLabel}
          onRetry={loadAnalytics}
          retrying={refetching}
        >
          <RefetchableSection refetching={refetching}>
            <OrderStatusChart
              data={orderStatusData}
              error={dashboardError}
              onRetry={loadAnalytics}
              retrying={refetching}
              tr={tr}
            />
          </RefetchableSection>
        </ChartErrorBoundary>
        <ChartErrorBoundary
          key={`cs-${period}`}
          fallbackMessage={errorBoundaryMsg}
          retryLabel={retryLabel}
          onRetry={loadAnalytics}
          retrying={refetching}
        >
          <RefetchableSection refetching={refetching}>
            <CustomerSegmentChart
              data={customerSegmentData}
              error={customerError}
              onRetry={loadAnalytics}
              retrying={refetching}
              tr={tr}
              subtitle={tr('analytics.allTimePeriod', 'All time')}
            />
          </RefetchableSection>
        </ChartErrorBoundary>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Charts Row 2: Revenue Trend + Top Customers                      */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartErrorBoundary
          key={`rt-${period}`}
          fallbackMessage={errorBoundaryMsg}
          retryLabel={retryLabel}
          onRetry={loadAnalytics}
          retrying={refetching}
        >
          <RefetchableSection refetching={refetching}>
            <RevenueTrendChart
              data={revenueTrend}
              error={revenueError}
              onRetry={loadAnalytics}
              retrying={refetching}
              tr={tr}
            />
          </RefetchableSection>
        </ChartErrorBoundary>
        <ChartErrorBoundary
          key={`tc-${period}`}
          fallbackMessage={errorBoundaryMsg}
          retryLabel={retryLabel}
          onRetry={loadAnalytics}
          retrying={refetching}
        >
          <RefetchableSection refetching={refetching}>
            <TopCustomersChart
              data={topCustomers}
              error={customerError}
              onRetry={loadAnalytics}
              retrying={refetching}
              tr={tr}
            />
          </RefetchableSection>
        </ChartErrorBoundary>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Charts Row 3: Production Pipeline + Inventory Overview           */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartErrorBoundary
          key={`pp-${period}`}
          fallbackMessage={errorBoundaryMsg}
          retryLabel={retryLabel}
          onRetry={loadAnalytics}
          retrying={refetching}
        >
          <RefetchableSection refetching={refetching}>
            <ProductionPipelineChart
              data={productionData}
              error={dashboardError}
              onRetry={loadAnalytics}
              retrying={refetching}
              tr={tr}
            />
          </RefetchableSection>
        </ChartErrorBoundary>
        <ChartErrorBoundary
          key={`inv-${period}`}
          fallbackMessage={errorBoundaryMsg}
          retryLabel={retryLabel}
          onRetry={loadAnalytics}
          retrying={refetching}
        >
          <RefetchableSection refetching={refetching}>
            <InventoryOverviewCards
              inventory={inventory}
              error={dashboardError}
              onRetry={loadAnalytics}
              retrying={refetching}
              tr={tr}
            />
          </RefetchableSection>
        </ChartErrorBoundary>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** Returns a human-readable relative time string like "just now", "2m ago". */
function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default AnalyticsPage;
