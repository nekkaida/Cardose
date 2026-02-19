import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../contexts/AuthContext';
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
} from 'recharts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Quarter', value: 'quarter' },
  { label: 'This Year', value: 'year' },
] as const;

const ORDER_STATUS_COLORS: Record<string, string> = {
  Active: '#4e3a21',
  Completed: '#2C5530',
  Cancelled: '#DC2626',
};

const PRODUCTION_STAGE_COLORS: Record<string, string> = {
  Designing: '#4e3a21',
  Approved: '#C4A962',
  Production: '#2C5530',
  QC: '#FFA500',
};

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Apr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Aug',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dec',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

function formatShortCurrency(amount: number): string {
  const v = amount || 0;
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}K`;
  return `Rp ${v}`;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num || 0);
}

function parseMonthLabel(raw: string): string {
  // "2025-01" -> "Jan"
  const parts = raw.split('-');
  if (parts.length === 2) return MONTH_LABELS[parts[1]] || raw;
  return raw;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'designing':
      return 'bg-blue-100 text-blue-800';
    case 'approved':
      return 'bg-accent-100 text-accent-800';
    case 'production':
      return 'bg-indigo-100 text-indigo-800';
    case 'quality_control':
      return 'bg-orange-100 text-orange-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="animate-pulse space-y-3">
            <div className="h-3 w-20 rounded bg-gray-200" />
            <div className="h-7 w-28 rounded bg-gray-200" />
            <div className="h-3 w-16 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="flex animate-pulse flex-col items-center justify-center" style={{ height }}>
      <div className="h-full w-full rounded-lg bg-gray-200" />
    </div>
  );
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-3 w-32 rounded bg-gray-200" />
            <div className="h-2.5 w-20 rounded bg-gray-200" />
          </div>
          <div className="h-5 w-16 rounded-full bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

function InventorySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="h-3.5 w-24 rounded bg-gray-200" />
          <div className="h-5 w-16 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

function RevenueSummarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-2 rounded-lg bg-gray-50 p-4">
          <div className="h-3 w-16 rounded bg-gray-200" />
          <div className="h-5 w-24 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline error component with retry
// ---------------------------------------------------------------------------

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <svg
        className="mb-2 h-8 w-8 text-red-400"
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
      <p className="mb-2 text-sm text-gray-500">{message}</p>
      <button
        onClick={onRetry}
        className="text-sm font-medium text-primary-600 underline underline-offset-2 hover:text-primary-700"
      >
        Retry
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Recharts Tooltip for Rupiah
// ---------------------------------------------------------------------------

function RupiahTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 text-xs text-gray-500">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="font-semibold text-gray-900">
          {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

// Custom PieChart label renderer that avoids overlap
function renderPieLabel({ name, percent, cx, cy, midAngle, outerRadius }: any) {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 22;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={11}
    >
      {`${name} ${Math.round((percent || 0) * 100)}%`}
    </text>
  );
}

// ---------------------------------------------------------------------------
// Production BarChart with individual bar colors
// ---------------------------------------------------------------------------

function ProductionBarShape(props: any) {
  const { x, y, width, height, payload } = props;
  const fill = PRODUCTION_STAGE_COLORS[payload?.stage] || '#4e3a21';
  return <rect x={x} y={y} width={width} height={height} rx={4} ry={4} fill={fill} />;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { getRevenueAnalytics } = useApi();
  const navigate = useNavigate();

  // State: data
  const [data, setData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  // State: loading per section
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingRecentOrders, setLoadingRecentOrders] = useState(true);

  // State: errors per section
  const [errorAnalytics, setErrorAnalytics] = useState('');
  const [errorRevenue, setErrorRevenue] = useState('');
  const [errorRecentOrders, setErrorRecentOrders] = useState('');

  // State: controls
  const [period, setPeriod] = useState<string>('month');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // -----------------------------------------------------------------------
  // Data fetchers
  // -----------------------------------------------------------------------

  const fetchAnalytics = useCallback(async (p: string) => {
    setLoadingAnalytics(true);
    setErrorAnalytics('');
    try {
      // Call directly with period param since getDashboardAnalytics() doesn't forward it
      const response = await apiClient.get('/analytics/dashboard', { params: { period: p } });
      setData(response.data);
    } catch {
      setErrorAnalytics('Failed to load dashboard analytics');
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  const fetchRevenue = useCallback(async () => {
    setLoadingRevenue(true);
    setErrorRevenue('');
    try {
      const result = await getRevenueAnalytics();
      setRevenueData(result);
    } catch {
      setErrorRevenue('Failed to load revenue trend');
    } finally {
      setLoadingRevenue(false);
    }
  }, [getRevenueAnalytics]);

  const fetchRecentOrders = useCallback(async () => {
    setLoadingRecentOrders(true);
    setErrorRecentOrders('');
    try {
      const response = await apiClient.get('/dashboard/recent-orders', { params: { limit: 5 } });
      const payload = response.data;
      setRecentOrders(payload.orders || []);
    } catch {
      setErrorRecentOrders('Failed to load recent orders');
    } finally {
      setLoadingRecentOrders(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([fetchAnalytics(period), fetchRevenue(), fetchRecentOrders()]);
    setLastUpdated(new Date());
  }, [fetchAnalytics, fetchRevenue, fetchRecentOrders, period]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Refetch analytics when period changes (but not other sections)
  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    fetchAnalytics(newPeriod).then(() => setLastUpdated(new Date()));
  };

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------

  const revenue = data?.revenue || {};
  const orders = data?.orders || {};
  const customers = data?.customers || {};
  const inventory = data?.inventory || {};
  const production = data?.production || {};

  const completionRate = Math.round(parseFloat(orders.completion_rate) || 0);

  const orderStatusData = [
    { name: 'Active', value: orders.active_orders || 0 },
    { name: 'Completed', value: orders.completed_orders || 0 },
    { name: 'Cancelled', value: orders.cancelled_orders || 0 },
  ].filter((d) => d.value > 0);

  const revenueTrend = (revenueData?.trend || []).map((m: any) => ({
    month: parseMonthLabel(m.month || ''),
    revenue: m.revenue || 0,
  }));

  const productionData = [
    { stage: 'Designing', count: production.designing || 0 },
    { stage: 'Approved', count: 0 }, // backend doesn't track approved separately yet
    { stage: 'Production', count: production.in_production || 0 },
    { stage: 'QC', count: production.quality_control || 0 },
  ];

  // Alerts
  const hasOutOfStock = (inventory.out_of_stock || 0) > 0;
  const hasUrgentOrders = (production.urgent_orders || 0) > 0;
  const hasLowStock = (inventory.low_stock || 0) > 0;
  const hasAlerts = hasOutOfStock || hasUrgentOrders;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ================================================================= */}
      {/* PAGE HEADER                                                       */}
      {/* ================================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {user?.username || 'there'}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">Here's your business overview</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <select
            value={period}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Refresh button */}
          <button
            onClick={refreshAll}
            title="Refresh data"
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary-600"
          >
            <svg
              className="w-4.5 h-4.5"
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

          {/* Last updated */}
          {lastUpdated && (
            <span className="hidden text-xs text-gray-400 sm:inline">
              Updated {formatTime(lastUpdated)}
            </span>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* ALERTS BANNER                                                     */}
      {/* ================================================================= */}
      {hasAlerts && !loadingAnalytics && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {hasOutOfStock && (
                <button
                  onClick={() => navigate('/inventory')}
                  className="font-medium text-red-700 underline underline-offset-2 hover:text-red-900"
                >
                  {inventory.out_of_stock} material{inventory.out_of_stock > 1 ? 's' : ''} out of
                  stock
                </button>
              )}
              {hasUrgentOrders && (
                <button
                  onClick={() => navigate('/orders')}
                  className="font-medium text-red-700 underline underline-offset-2 hover:text-red-900"
                >
                  {production.urgent_orders} urgent order{production.urgent_orders > 1 ? 's' : ''}{' '}
                  need attention
                </button>
              )}
              {hasLowStock && !hasOutOfStock && (
                <button
                  onClick={() => navigate('/inventory')}
                  className="font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
                >
                  {inventory.low_stock} material{inventory.low_stock > 1 ? 's' : ''} running low
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* KPI CARDS                                                         */}
      {/* ================================================================= */}
      {loadingAnalytics ? (
        <KpiSkeleton />
      ) : errorAnalytics ? (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <SectionError message={errorAnalytics} onRetry={() => fetchAnalytics(period)} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Revenue */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Revenue</p>
                <p className="mt-1 truncate text-2xl font-bold text-gray-900">
                  {formatShortCurrency(revenue.total_revenue)}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-accent-600">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                  {formatShortCurrency(revenue.paid_revenue)} paid
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-100">
                <svg
                  className="h-5 w-5 text-accent-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Orders */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Orders</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatNumber(orders.total_orders)}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-primary-500">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                  {formatNumber(orders.active_orders)} active
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100">
                <svg
                  className="h-5 w-5 text-primary-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Customers */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Customers
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatNumber(customers.total_customers)}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-accent-600">
                  <svg className="h-3 w-3 text-accent-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                  </svg>
                  {formatNumber(customers.vip_customers)} VIP
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-100">
                <svg
                  className="h-5 w-5 text-accent-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Completion
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{completionRate}%</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {formatNumber(orders.completed_orders)} done
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100">
                <svg
                  className="h-5 w-5 text-primary-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* CHARTS ROW (2/3 + 1/3)                                            */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Trend - 2/3 */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Revenue Trend</h3>
          {loadingRevenue ? (
            <ChartSkeleton />
          ) : errorRevenue ? (
            <SectionError message={errorRevenue} onRetry={fetchRevenue} />
          ) : revenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis
                  tickFormatter={formatShortCurrency}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<RupiahTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4e3a21"
                  fill="#4e3a21"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg
                className="mb-3 h-10 w-10 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
              <p className="text-sm text-gray-400">
                No revenue data yet. Create invoices to track revenue.
              </p>
            </div>
          )}
        </div>

        {/* Order Status Pie - 1/3 */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Order Status</h3>
          {loadingAnalytics ? (
            <ChartSkeleton />
          ) : errorAnalytics ? (
            <SectionError
              message="Failed to load order status"
              onRetry={() => fetchAnalytics(period)}
            />
          ) : orderStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                  label={renderPieLabel}
                >
                  {orderStatusData.map((entry) => (
                    <Cell key={entry.name} fill={ORDER_STATUS_COLORS[entry.name] || '#9CA3AF'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [formatNumber(value), name]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg
                className="mb-3 h-10 w-10 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
                />
              </svg>
              <p className="text-sm text-gray-400">
                No orders yet. Start by creating your first order.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* BOTTOM ROW (3 equal columns)                                      */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Production Pipeline */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Production Pipeline</h3>
            {(production.urgent_orders || 0) > 0 && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                {production.urgent_orders} urgent
              </span>
            )}
          </div>
          {loadingAnalytics ? (
            <ChartSkeleton height={200} />
          ) : errorAnalytics ? (
            <SectionError
              message="Failed to load production data"
              onRetry={() => fetchAnalytics(period)}
            />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={productionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="stage" tick={{ fontSize: 12 }} tickLine={false} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip formatter={(value: number) => [value, 'Orders']} />
                  <Bar dataKey="count" shape={<ProductionBarShape />} />
                </BarChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
                {productionData.map((item) => (
                  <div key={item.stage} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: PRODUCTION_STAGE_COLORS[item.stage] }}
                    />
                    {item.stage}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              View all
            </button>
          </div>
          {loadingRecentOrders ? (
            <ListSkeleton />
          ) : errorRecentOrders ? (
            <SectionError message={errorRecentOrders} onRetry={fetchRecentOrders} />
          ) : recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map((order: any) => (
                <button
                  key={order.id}
                  onClick={() => navigate('/orders')}
                  className="-mx-2 flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {order.customer_name || 'Unknown Customer'}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {order.order_number || order.id?.slice(0, 8)} ·{' '}
                      {order.created_at ? timeAgo(order.created_at) : ''}
                    </p>
                  </div>
                  <span
                    className={`ml-2 inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(order.status)}`}
                  >
                    {(order.status || '').replace(/_/g, ' ')}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <svg
                className="mb-2 h-8 w-8 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-gray-400">No recent activity yet.</p>
            </div>
          )}
        </div>

        {/* Inventory Summary */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Inventory</h3>
          {loadingAnalytics ? (
            <InventorySkeleton />
          ) : errorAnalytics ? (
            <SectionError
              message="Failed to load inventory data"
              onRetry={() => fetchAnalytics(period)}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Materials</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatNumber(inventory.total_materials)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Low Stock</span>
                <span
                  className={`text-lg font-bold ${(inventory.low_stock || 0) > 0 ? 'text-amber-600' : 'text-green-600'}`}
                >
                  {formatNumber(inventory.low_stock)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Out of Stock</span>
                <span
                  className={`text-lg font-bold ${(inventory.out_of_stock || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {formatNumber(inventory.out_of_stock)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Value</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(inventory.total_value || 0)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* REVENUE SUMMARY ROW                                               */}
      {/* ================================================================= */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Revenue Summary</h3>
        {loadingAnalytics ? (
          <RevenueSummarySkeleton />
        ) : errorAnalytics ? (
          <SectionError
            message="Failed to load revenue summary"
            onRetry={() => fetchAnalytics(period)}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-xs font-medium text-gray-500">Paid Revenue</p>
              <p className="mt-1 text-lg font-bold text-green-700">
                {formatCurrency(revenue.paid_revenue || 0)}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-4">
              <p className="text-xs font-medium text-gray-500">Pending Revenue</p>
              <p className="mt-1 text-lg font-bold text-amber-700">
                {formatCurrency(revenue.pending_revenue || 0)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Avg Order Value</p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {formatCurrency(revenue.average_order_value || 0)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Invoice Count</p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {formatNumber(revenue.invoice_count)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
