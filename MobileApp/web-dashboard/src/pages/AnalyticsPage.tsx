import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

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
// Brand color palette
// ---------------------------------------------------------------------------

const BRAND_COLORS = ['#2C5530', '#C4A962', '#4e3a21', '#3a7a40', '#a67c36', '#1a3a1e', '#d4b97a'];

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
};

const formatShortCurrency = (amount: number): string => {
  if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}K`;
  return `Rp ${amount}`;
};

// Max months to display in revenue trend chart for readability
const MAX_TREND_MONTHS = 6;

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

const SkeletonKPICard: React.FC = () => (
  <div className="animate-pulse rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="mb-3 h-3 w-24 rounded bg-gray-200" />
    <div className="mb-2 h-7 w-20 rounded bg-gray-200" />
    <div className="h-3 w-28 rounded bg-gray-200" />
  </div>
);

const SkeletonChart: React.FC<{ height?: number }> = ({ height = 280 }) => (
  <div className="animate-pulse rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
    <div className="mb-6 h-4 w-48 rounded bg-gray-200" />
    <div className="rounded bg-gray-100" style={{ height }} />
  </div>
);

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
    <svg
      className="mb-2 h-10 w-10"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
    <p className="text-sm">{message}</p>
  </div>
);

// ---------------------------------------------------------------------------
// Section error banner
// ---------------------------------------------------------------------------

const SectionError: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
    {message}
    <button onClick={onRetry} className="ml-2 underline">
      Retry
    </button>
  </div>
);

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
      setDashboard(raw?.analytics ?? raw ?? null);
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

  // ---- Consistent chart formatting ----

  const TICK_STYLE = { fontSize: 11 };

  const tooltipRevenue = (value: number) => [
    formatCurrency(value),
    tr('analytics.revenue', 'Revenue'),
  ];
  const tooltipOrders = (value: number) => [value, tr('analytics.orders', 'Orders')];
  const tooltipCustomers = (value: number) => [value, tr('analytics.customers', 'Customers')];

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
      {errors.dashboard ? (
        <SectionError
          message={tr('analytics.loadError', 'Failed to load this section')}
          onRetry={loadAnalytics}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Total Orders */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {tr('analytics.totalOrders', 'Total Orders')}
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{orders?.total_orders ?? 0}</p>
            <p className="mt-1 text-xs text-gray-400">
              {orders?.completed_orders ?? 0} {tr('analytics.completed', 'completed')}
            </p>
          </div>

          {/* Revenue */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {tr('analytics.revenue', 'Revenue')}
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatShortCurrency(revenue?.total_revenue ?? 0)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {formatShortCurrency(revenue?.paid_revenue ?? 0)} {tr('analytics.paid', 'paid')}
            </p>
          </div>

          {/* Customers */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {tr('analytics.customers', 'Customers')}
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {customers?.total_customers ?? 0}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {customers?.vip_customers ?? 0} {tr('analytics.vip', 'VIP')}
            </p>
          </div>

          {/* Avg Order */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {tr('analytics.avgOrder', 'Avg Order')}
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatShortCurrency(revenue?.average_order_value ?? 0)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {revenue?.invoice_count ?? 0} {tr('analytics.invoices', 'invoices')}
            </p>
          </div>
        </div>
      )}

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
        {/* Order Status Distribution */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            {tr('analytics.orderStatus', 'Order Status Distribution')}
          </h2>
          {errors.dashboard ? (
            <SectionError
              message={tr('analytics.loadError', 'Failed to load this section')}
              onRetry={loadAnalytics}
            />
          ) : orderStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }: any) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {orderStatusData.map((_, i) => (
                    <Cell key={`os-${i}`} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipOrders} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message={tr('analytics.noData', 'No data available')} />
          )}
        </div>

        {/* Customer Segments */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            {tr('analytics.customerSegments', 'Customer Segments')}
          </h2>
          {errors.customer ? (
            <SectionError
              message={tr('analytics.loadError', 'Failed to load this section')}
              onRetry={loadAnalytics}
            />
          ) : customerSegmentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={customerSegmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }: any) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {customerSegmentData.map((_, i) => (
                    <Cell key={`cs-${i}`} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipCustomers} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message={tr('analytics.noData', 'No data available')} />
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Charts Row 2: Revenue Trend + Top Customers                      */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            {tr('analytics.revenueTrend', 'Revenue Trend')}
          </h2>
          {errors.revenue ? (
            <SectionError
              message={tr('analytics.loadError', 'Failed to load this section')}
              onRetry={loadAnalytics}
            />
          ) : revenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={TICK_STYLE} />
                <YAxis tickFormatter={formatShortCurrency} tick={TICK_STYLE} />
                <Tooltip
                  formatter={tooltipRevenue}
                  labelStyle={{ fontSize: 12 }}
                  contentStyle={{ fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2C5530"
                  fill="#2C5530"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message={tr('analytics.noData', 'No data available')} />
          )}
        </div>

        {/* Top Customers */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            {tr('analytics.topCustomers', 'Top Customers by Revenue')}
          </h2>
          {errors.customer ? (
            <SectionError
              message={tr('analytics.loadError', 'Failed to load this section')}
              onRetry={loadAnalytics}
            />
          ) : topCustomers.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topCustomers} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tickFormatter={formatShortCurrency} tick={TICK_STYLE} />
                <YAxis type="category" dataKey="name" width={120} tick={TICK_STYLE} />
                <Tooltip
                  formatter={tooltipRevenue}
                  labelStyle={{ fontSize: 12 }}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="#C4A962" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message={tr('analytics.noData', 'No data available')} />
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Charts Row 3: Production Pipeline + Inventory Overview           */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Production Pipeline */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            {tr('analytics.productionPipeline', 'Production Pipeline')}
          </h2>
          {errors.dashboard ? (
            <SectionError
              message={tr('analytics.loadError', 'Failed to load this section')}
              onRetry={loadAnalytics}
            />
          ) : productionData.some((d) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={productionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="stage" tick={TICK_STYLE} />
                <YAxis allowDecimals={false} tick={TICK_STYLE} />
                <Tooltip
                  formatter={(value: number) => [value, tr('analytics.orders', 'Orders')]}
                  labelStyle={{ fontSize: 12 }}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#4e3a21" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message={tr('analytics.noData', 'No data available')} />
          )}
        </div>

        {/* Inventory Overview */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            {tr('analytics.inventoryOverview', 'Inventory Overview')}
          </h2>
          {errors.dashboard ? (
            <SectionError
              message={tr('analytics.loadError', 'Failed to load this section')}
              onRetry={loadAnalytics}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs uppercase text-gray-500">
                  {tr('analytics.totalMaterials', 'Total Materials')}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {inventory?.total_materials ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs uppercase text-gray-500">
                  {tr('analytics.outOfStock', 'Out of Stock')}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    (inventory?.out_of_stock ?? 0) > 0 ? 'text-red-600' : 'text-gray-900'
                  }`}
                >
                  {inventory?.out_of_stock ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs uppercase text-gray-500">
                  {tr('analytics.lowStock', 'Low Stock')}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    (inventory?.low_stock ?? 0) > 0 ? 'text-orange-600' : 'text-gray-900'
                  }`}
                >
                  {inventory?.low_stock ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs uppercase text-gray-500">
                  {tr('analytics.totalValue', 'Total Value')}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatShortCurrency(inventory?.total_value ?? 0)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
