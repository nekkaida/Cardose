import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { DashboardData } from '@shared/types/analytics';

import {
  KpiCards,
  KpiSkeleton,
  RevenueChart,
  OrderStatusChart,
  ProductionPipeline,
  RecentActivity,
  InventoryOverview,
  RevenueSummary,
  SectionError,
} from '../components/dashboard';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTH_KEYS = [
  'dashboard.monthJan',
  'dashboard.monthFeb',
  'dashboard.monthMar',
  'dashboard.monthApr',
  'dashboard.monthMay',
  'dashboard.monthJun',
  'dashboard.monthJul',
  'dashboard.monthAug',
  'dashboard.monthSep',
  'dashboard.monthOct',
  'dashboard.monthNov',
  'dashboard.monthDec',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseMonthLabel(raw: string, t: (key: string) => string): string {
  const parts = raw.split('-');
  if (parts.length === 2) {
    const idx = parseInt(parts[1], 10) - 1;
    return idx >= 0 && idx < 12 ? t(MONTH_KEYS[idx]) : raw;
  }
  return raw;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecentOrder {
  id: string;
  order_number?: string;
  customer_name?: string;
  status: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { getDashboardAnalytics, getRevenueAnalytics, getRecentOrders } = useApi();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // State: data
  const [data, setData] = useState<DashboardData | null>(null);
  const [revenueData, setRevenueData] = useState<{
    trend: Array<{ month: string; revenue: number }>;
  } | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

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
  const [refreshing, setRefreshing] = useState(false);

  // Ref to avoid refreshAll depending on period
  const periodRef = useRef(period);
  periodRef.current = period;

  // -----------------------------------------------------------------------
  // Data fetchers
  // -----------------------------------------------------------------------

  const fetchAnalytics = useCallback(
    async (p: string) => {
      setLoadingAnalytics(true);
      setErrorAnalytics('');
      try {
        const result = await getDashboardAnalytics({ period: p });
        setData(result as DashboardData);
      } catch {
        setErrorAnalytics(t('dashboard.loadErrorAnalytics'));
      } finally {
        setLoadingAnalytics(false);
      }
    },
    [getDashboardAnalytics, t]
  );

  const fetchRevenue = useCallback(async () => {
    setLoadingRevenue(true);
    setErrorRevenue('');
    try {
      const result = await getRevenueAnalytics();
      setRevenueData(result);
    } catch {
      setErrorRevenue(t('dashboard.loadErrorRevenue'));
    } finally {
      setLoadingRevenue(false);
    }
  }, [getRevenueAnalytics, t]);

  const fetchRecentOrdersData = useCallback(async () => {
    setLoadingRecentOrders(true);
    setErrorRecentOrders('');
    try {
      const result = await getRecentOrders(5);
      setRecentOrders(result.orders || []);
    } catch {
      setErrorRecentOrders(t('dashboard.loadErrorOrders'));
    } finally {
      setLoadingRecentOrders(false);
    }
  }, [getRecentOrders, t]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      fetchAnalytics(periodRef.current),
      fetchRevenue(),
      fetchRecentOrdersData(),
    ]);
    setLastUpdated(new Date());
    setRefreshing(false);
  }, [fetchAnalytics, fetchRevenue, fetchRecentOrdersData]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Period change only refreshes analytics
  const handlePeriodChange = useCallback(
    (newPeriod: string) => {
      setPeriod(newPeriod);
      periodRef.current = newPeriod;
      fetchAnalytics(newPeriod).then(() => setLastUpdated(new Date()));
    },
    [fetchAnalytics]
  );

  // -----------------------------------------------------------------------
  // Derived data (memoized)
  // -----------------------------------------------------------------------

  const revenue = data?.revenue;
  const orders = data?.orders;
  const customers = data?.customers;
  const inventory = data?.inventory;
  const production = data?.production;

  const completionRate = useMemo(
    () => Math.round(orders?.completion_rate || 0),
    [orders?.completion_rate]
  );

  const orderStatusData = useMemo(
    () =>
      [
        { key: 'Active', name: t('dashboard.statusActive'), value: orders?.active_orders || 0 },
        {
          key: 'Completed',
          name: t('dashboard.statusCompleted'),
          value: orders?.completed_orders || 0,
        },
        {
          key: 'Cancelled',
          name: t('dashboard.statusCancelled'),
          value: orders?.cancelled_orders || 0,
        },
      ].filter((d) => d.value > 0),
    [orders, t]
  );

  const revenueTrend = useMemo(
    () =>
      (revenueData?.trend || []).map((m) => ({
        month: parseMonthLabel(m.month || '', t),
        revenue: m.revenue || 0,
      })),
    [revenueData, t]
  );

  const productionData = useMemo(
    () => [
      { key: 'Designing', stage: t('dashboard.stageDesigning'), count: production?.designing || 0 },
      { key: 'Approved', stage: t('dashboard.stageApproved'), count: 0 },
      {
        key: 'Production',
        stage: t('dashboard.stageProduction'),
        count: production?.in_production || 0,
      },
      { key: 'QC', stage: t('dashboard.stageQC'), count: production?.quality_control || 0 },
    ],
    [production, t]
  );

  const periodOptions = useMemo(
    () => [
      { label: t('dashboard.thisWeek'), value: 'week' },
      { label: t('dashboard.thisMonth'), value: 'month' },
      { label: t('dashboard.thisQuarter'), value: 'quarter' },
      { label: t('dashboard.thisYear'), value: 'year' },
    ],
    [t]
  );

  // Alerts
  const hasOutOfStock = (inventory?.out_of_stock || 0) > 0;
  const hasUrgentOrders = (production?.urgent_orders || 0) > 0;
  const hasLowStock = (inventory?.low_stock || 0) > 0;
  const hasAlerts = hasOutOfStock || hasUrgentOrders;

  // Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning');
    if (hour < 18) return t('dashboard.greeting.afternoon');
    return t('dashboard.greeting.evening');
  }, [t]);

  const retryLabel = t('dashboard.retry');

  // Retry callbacks for sub-components
  const retryAnalytics = useCallback(() => fetchAnalytics(period), [fetchAnalytics, period]);
  const navigateOrders = useCallback(() => navigate('/orders'), [navigate]);
  const navigateInventory = useCallback(() => navigate('/inventory'), [navigate]);

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
            {greeting}, {user?.username || t('dashboard.defaultUser')}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">{t('dashboard.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <select
            value={period}
            onChange={(e) => handlePeriodChange(e.target.value)}
            aria-label={t('dashboard.selectPeriod')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {periodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Refresh button */}
          <button
            onClick={refreshAll}
            title={t('dashboard.refreshData')}
            aria-label={t('dashboard.refreshData')}
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary-600"
          >
            <svg
              className={`h-4.5 w-4.5 ${refreshing ? 'animate-spin' : ''}`}
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
              {t('dashboard.updated')} {formatTime(lastUpdated)}
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
                  onClick={navigateInventory}
                  className="font-medium text-red-700 underline underline-offset-2 hover:text-red-900"
                >
                  {inventory!.out_of_stock}{' '}
                  {inventory!.out_of_stock > 1 ? t('dashboard.materials') : t('dashboard.material')}{' '}
                  {t('dashboard.alertOutOfStock')}
                </button>
              )}
              {hasUrgentOrders && (
                <button
                  onClick={navigateOrders}
                  className="font-medium text-red-700 underline underline-offset-2 hover:text-red-900"
                >
                  {production!.urgent_orders} {t('dashboard.urgent')}{' '}
                  {production!.urgent_orders > 1
                    ? t('dashboard.orders').toLowerCase()
                    : t('dashboard.order')}{' '}
                  {t('dashboard.alertNeedAttention')}
                </button>
              )}
              {hasLowStock && !hasOutOfStock && (
                <button
                  onClick={navigateInventory}
                  className="font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
                >
                  {inventory!.low_stock}{' '}
                  {inventory!.low_stock > 1 ? t('dashboard.materials') : t('dashboard.material')}{' '}
                  {t('dashboard.alertRunningLow')}
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
          <SectionError message={errorAnalytics} onRetry={retryAnalytics} retryLabel={retryLabel} />
        </div>
      ) : (
        <KpiCards
          revenue={revenue}
          orders={orders}
          customers={customers}
          completionRate={completionRate}
        />
      )}

      {/* ================================================================= */}
      {/* CHARTS ROW (2/3 + 1/3)                                            */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RevenueChart
          loading={loadingRevenue}
          error={errorRevenue}
          revenueTrend={revenueTrend}
          onRetry={fetchRevenue}
        />

        <OrderStatusChart
          loading={loadingAnalytics}
          error={errorAnalytics}
          orderStatusData={orderStatusData}
          onRetry={retryAnalytics}
        />
      </div>

      {/* ================================================================= */}
      {/* BOTTOM ROW (3 equal columns)                                      */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ProductionPipeline
          loading={loadingAnalytics}
          error={errorAnalytics}
          productionData={productionData}
          urgentOrders={production?.urgent_orders || 0}
          onRetry={retryAnalytics}
        />

        <RecentActivity
          loading={loadingRecentOrders}
          error={errorRecentOrders}
          recentOrders={recentOrders}
          onRetry={fetchRecentOrdersData}
          onViewAll={navigateOrders}
          onOrderClick={navigateOrders}
        />

        <InventoryOverview
          loading={loadingAnalytics}
          error={errorAnalytics}
          inventory={inventory}
          onRetry={retryAnalytics}
        />
      </div>

      {/* ================================================================= */}
      {/* REVENUE SUMMARY ROW                                               */}
      {/* ================================================================= */}
      <RevenueSummary
        loading={loadingAnalytics}
        error={errorAnalytics}
        revenue={revenue}
        onRetry={retryAnalytics}
      />
    </div>
  );
};

export default Dashboard;
