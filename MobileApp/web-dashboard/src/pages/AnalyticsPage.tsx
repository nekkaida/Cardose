import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';
// Sub-components
import { SkeletonKPICard, SkeletonChart } from '../components/analytics/AnalyticsPrimitives';
import KpiCards from '../components/analytics/KpiCards';
import OrderStatusChart from '../components/analytics/OrderStatusChart';
import CustomerSegmentChart from '../components/analytics/CustomerSegmentChart';
import RevenueTrendChart from '../components/analytics/RevenueTrendChart';
import TopCustomersChart from '../components/analytics/TopCustomersChart';
import ProductionPipelineChart from '../components/analytics/ProductionPipelineChart';
import InventoryOverviewCards from '../components/analytics/InventoryOverviewCards';

// ---------------------------------------------------------------------------
// TypeScript interfaces matching exact backend response shapes
// ---------------------------------------------------------------------------

interface DashboardRevenue {
  total_revenue: number;
  paid_revenue: number;
  pending_revenue: number;
  average_order_value: number;
  invoice_count: number;
}

interface DashboardOrders {
  total_orders: number;
  completed_orders: number;
  active_orders: number;
  cancelled_orders: number;
  average_value: number;
  completion_rate: number | string;
}

interface DashboardCustomers {
  total_customers: number;
  vip_customers: number;
  regular_customers: number;
  new_customers: number;
}

interface DashboardInventory {
  total_materials: number;
  out_of_stock: number;
  low_stock: number;
  total_value: number;
}

interface DashboardProduction {
  designing: number;
  in_production: number;
  quality_control: number;
  urgent_orders: number;
}

interface DashboardData {
  period: string;
  revenue: DashboardRevenue;
  orders: DashboardOrders;
  customers: DashboardCustomers;
  inventory: DashboardInventory;
  production: DashboardProduction;
}

interface RevenueTrendItem {
  month: string;
  invoice_count: number;
  revenue: number;
  tax_collected: number;
  average_value: number;
}

interface RevenueAnalytics {
  trend: RevenueTrendItem[];
}

interface TopCustomer {
  id: string;
  name: string;
  business_type: string;
  loyalty_status: string;
  order_count: number;
  total_revenue: number;
  average_order_value: number;
  last_order_date: string;
}

interface BusinessTypeSegment {
  business_type: string;
  count: number;
}

interface CustomerAnalytics {
  top_customers: TopCustomer[];
  acquisition_trend: { month: string; new_customers: number }[];
  by_business_type: BusinessTypeSegment[];
}

interface SectionErrors {
  dashboard: string | null;
  revenue: string | null;
  customer: string | null;
}

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

// Max months to display in revenue trend chart for readability
const MAX_TREND_MONTHS = 6;

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
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [errors, setErrors] = useState<SectionErrors>({
    dashboard: null,
    revenue: null,
    customer: null,
  });

  // ---- Data fetching ----
  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setErrors({ dashboard: null, revenue: null, customer: null });

    const [dashResult, revResult, custResult] = await Promise.allSettled([
      getDashboardAnalytics({ period }),
      getRevenueAnalytics(),
      getCustomerAnalytics(),
    ]);

    // Dashboard
    if (dashResult.status === 'fulfilled') {
      const raw = dashResult.value;
      setDashboard(raw ?? null);
      setErrors((prev) => ({ ...prev, dashboard: null }));
    } else {
      setErrors((prev) => ({
        ...prev,
        dashboard: dashResult.reason?.message || 'Failed to load dashboard data',
      }));
    }

    // Revenue
    if (revResult.status === 'fulfilled') {
      setRevenueData(revResult.value ?? null);
      setErrors((prev) => ({ ...prev, revenue: null }));
    } else {
      setErrors((prev) => ({
        ...prev,
        revenue: revResult.reason?.message || 'Failed to load revenue data',
      }));
    }

    // Customer
    if (custResult.status === 'fulfilled') {
      setCustomerData(custResult.value ?? null);
      setErrors((prev) => ({ ...prev, customer: null }));
    } else {
      setErrors((prev) => ({
        ...prev,
        customer: custResult.reason?.message || 'Failed to load customer data',
      }));
    }

    setLoading(false);
  }, [getDashboardAnalytics, getRevenueAnalytics, getCustomerAnalytics, period]);

  // Initial load + re-fetch when period changes
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics, period]);

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
    // Limit to last MAX_TREND_MONTHS for readability
    const sliced = trend.slice(-MAX_TREND_MONTHS);
    return sliced.map((m) => ({
      month: m.month ?? '',
      revenue: m.revenue ?? 0,
      invoices: m.invoice_count ?? 0,
    }));
  }, [revenueData]);

  const topCustomers = useMemo(() => {
    const list = customerData?.top_customers;
    if (!list || list.length === 0) return [];
    return list.slice(0, 5).map((c) => ({
      name: (c.name ?? '').length > 18 ? (c.name ?? '').substring(0, 18) + '...' : (c.name ?? ''),
      revenue: c.total_revenue ?? 0,
    }));
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

  // ---- Convenience accessors with null safety ----

  const revenue = dashboard?.revenue;
  const orders = dashboard?.orders;
  const customers = dashboard?.customers;
  const inventory = dashboard?.inventory;

  // ---- Render ----

  // Skeleton loading state
  if (loading) {
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
    <div className="space-y-6">
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
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#2C5530] focus:outline-none focus:ring-2 focus:ring-[#2C5530]"
            aria-label={tr('analytics.period', 'Period')}
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {tr(opt.labelKey, opt.fallback)}
              </option>
            ))}
          </select>

          {/* Refresh button */}
          <button
            onClick={loadAnalytics}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#2C5530]"
            aria-label={tr('analytics.refresh', 'Refresh')}
            title={tr('analytics.refresh', 'Refresh')}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
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
      <KpiCards
        orders={orders}
        revenue={revenue}
        customers={customers}
        inventory={inventory}
        error={errors.dashboard}
        onRetry={loadAnalytics}
        tr={tr}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Completion Rate (from backend orders.completion_rate directly)    */}
      {/* ---------------------------------------------------------------- */}
      {!errors.dashboard && dashboard?.orders && (
        <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {tr('analytics.completionRate', 'Completion Rate')}
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {Number(orders?.completion_rate ?? 0).toFixed(1)}%
            </p>
          </div>
          <div className="h-3 w-48 rounded-full bg-gray-200">
            <div
              className="h-3 rounded-full bg-[#2C5530] transition-all"
              style={{ width: `${Math.min(Number(orders?.completion_rate ?? 0), 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Charts Row 1: Order Status + Customer Segments                   */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OrderStatusChart
          data={orderStatusData}
          error={errors.dashboard}
          onRetry={loadAnalytics}
          tr={tr}
        />
        <CustomerSegmentChart
          data={customerSegmentData}
          error={errors.customer}
          onRetry={loadAnalytics}
          tr={tr}
        />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Charts Row 2: Revenue Trend + Top Customers                      */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueTrendChart
          data={revenueTrend}
          error={errors.revenue}
          onRetry={loadAnalytics}
          tr={tr}
        />
        <TopCustomersChart
          data={topCustomers}
          error={errors.customer}
          onRetry={loadAnalytics}
          tr={tr}
        />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Charts Row 3: Production Pipeline + Inventory Overview           */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProductionPipelineChart
          data={productionData}
          error={errors.dashboard}
          onRetry={loadAnalytics}
          tr={tr}
        />
        <InventoryOverviewCards
          inventory={inventory}
          error={errors.dashboard}
          onRetry={loadAnalytics}
          tr={tr}
        />
      </div>
    </div>
  );
};

export default AnalyticsPage;
