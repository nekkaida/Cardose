import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { DashboardData } from '@shared/types/analytics';
import type { RecentOrder } from '../hooks/api/useDashboardApi';

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
  SectionErrorBoundary,
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

/** How long a hidden tab must be before we auto-refresh on return (ms) */
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

const TIME_LOCALE: Record<string, string> = { en: 'en-US', id: 'id-ID' };

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

function formatTime(date: Date, lang: string): string {
  const locale = TIME_LOCALE[lang] || 'en-US';
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'dashboard.greeting.morning';
  if (hour < 18) return 'dashboard.greeting.afternoon';
  return 'dashboard.greeting.evening';
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { getDashboardAnalytics, getRevenueAnalytics, getRecentOrders } = useApi();
  const { t, language } = useLanguage();
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
  const [greetingKey, setGreetingKey] = useState(getGreetingKey);

  // Refs to keep refreshAll stable (avoid stale closures & unnecessary effect re-runs)
  const periodRef = useRef(period);
  periodRef.current = period;

  // Track when the tab was hidden for stale-data detection
  const hiddenSinceRef = useRef<number | null>(null);

  // Abort controller for period-change fetches (cancels stale requests on rapid clicks)
  const periodAbortRef = useRef<AbortController | null>(null);

  // -----------------------------------------------------------------------
  // Data fetchers (accept AbortSignal for cleanup on unmount)
  // -----------------------------------------------------------------------

  const fetchAnalytics = useCallback(
    async (p: string, signal?: AbortSignal) => {
      setLoadingAnalytics(true);
      setErrorAnalytics('');
      try {
        const result = await getDashboardAnalytics({ period: p }, signal);
        if (!signal?.aborted) setData(result as DashboardData);
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        if (!signal?.aborted) setErrorAnalytics('dashboard.loadErrorAnalytics');
      } finally {
        if (!signal?.aborted) setLoadingAnalytics(false);
      }
    },
    [getDashboardAnalytics]
  );

  const fetchRevenue = useCallback(
    async (signal?: AbortSignal) => {
      setLoadingRevenue(true);
      setErrorRevenue('');
      try {
        const result = await getRevenueAnalytics(undefined, signal);
        if (!signal?.aborted) setRevenueData(result);
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        if (!signal?.aborted) setErrorRevenue('dashboard.loadErrorRevenue');
      } finally {
        if (!signal?.aborted) setLoadingRevenue(false);
      }
    },
    [getRevenueAnalytics]
  );

  const fetchRecentOrdersData = useCallback(
    async (signal?: AbortSignal) => {
      setLoadingRecentOrders(true);
      setErrorRecentOrders('');
      try {
        const result = await getRecentOrders(5, signal);
        if (!signal?.aborted) setRecentOrders(result.orders || []);
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        if (!signal?.aborted) setErrorRecentOrders('dashboard.loadErrorOrders');
      } finally {
        if (!signal?.aborted) setLoadingRecentOrders(false);
      }
    },
    [getRecentOrders]
  );

  const refreshAll = useCallback(
    async (signal?: AbortSignal) => {
      setRefreshing(true);
      await Promise.allSettled([
        fetchAnalytics(periodRef.current, signal),
        fetchRevenue(signal),
        fetchRecentOrdersData(signal),
      ]);
      if (!signal?.aborted) {
        setLastUpdated(new Date());
      }
      setRefreshing(false);
    },
    [fetchAnalytics, fetchRevenue, fetchRecentOrdersData]
  );

  // Initial load + cleanup AbortController on unmount.
  // Wrapped in setTimeout(0) so React StrictMode's immediate cleanup can cancel
  // the timer before any HTTP requests fire (avoids doubled requests / 429s).
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => refreshAll(controller.signal), 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [refreshAll]);

  // Period change only refreshes analytics (cancels previous in-flight period fetch)
  const handlePeriodChange = useCallback(
    (newPeriod: string) => {
      periodAbortRef.current?.abort();
      const controller = new AbortController();
      periodAbortRef.current = controller;
      setPeriod(newPeriod);
      periodRef.current = newPeriod;
      fetchAnalytics(newPeriod, controller.signal).then(() => {
        if (!controller.signal.aborted) setLastUpdated(new Date());
      });
    },
    [fetchAnalytics]
  );

  // Cleanup period controller on unmount
  useEffect(
    () => () => {
      periodAbortRef.current?.abort();
    },
    []
  );

  // -----------------------------------------------------------------------
  // Auto-refresh: refetch when tab becomes visible after being hidden
  // -----------------------------------------------------------------------

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        hiddenSinceRef.current = Date.now();
      } else {
        // Update greeting when tab becomes visible (may have crossed time boundary)
        setGreetingKey(getGreetingKey());

        // Auto-refresh if tab was hidden longer than threshold
        if (hiddenSinceRef.current && Date.now() - hiddenSinceRef.current > STALE_THRESHOLD_MS) {
          refreshAll();
        }
        hiddenSinceRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refreshAll]);

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
      { key: 'Approved', stage: t('dashboard.stageApproved'), count: production?.approved || 0 },
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

  // Alerts - use optional chaining instead of non-null assertions
  const outOfStockCount = inventory?.out_of_stock ?? 0;
  const urgentOrderCount = production?.urgent_orders ?? 0;
  const lowStockCount = inventory?.low_stock ?? 0;
  const hasOutOfStock = outOfStockCount > 0;
  const hasUrgentOrders = urgentOrderCount > 0;
  const hasLowStock = lowStockCount > 0;
  const hasAlerts = hasOutOfStock || hasUrgentOrders;

  // Greeting - uses state so it updates when tab becomes visible
  const greeting = t(greetingKey);

  const retryLabel = t('dashboard.retry');
  const sectionFallback = t('dashboard.sectionRenderError');

  // Retry callbacks for sub-components
  const retryAnalytics = useCallback(() => fetchAnalytics(period), [fetchAnalytics, period]);
  const navigateOrders = useCallback(() => navigate('/orders'), [navigate]);
  const navigateToOrder = useCallback(
    (orderId: string) => navigate(`/orders?highlight=${orderId}`),
    [navigate]
  );
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
            onClick={() => refreshAll()}
            disabled={refreshing}
            title={t('dashboard.refreshData')}
            aria-label={t('dashboard.refreshData')}
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
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
              {t('dashboard.updated')} {formatTime(lastUpdated, language)}
            </span>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* ALERTS BANNER                                                     */}
      {/* ================================================================= */}
      {hasAlerts && !loadingAnalytics && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3" role="alert">
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
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
                  {outOfStockCount}{' '}
                  {outOfStockCount > 1 ? t('dashboard.materials') : t('dashboard.material')}{' '}
                  {t('dashboard.alertOutOfStock')}
                </button>
              )}
              {hasUrgentOrders && (
                <button
                  onClick={navigateOrders}
                  className="font-medium text-red-700 underline underline-offset-2 hover:text-red-900"
                >
                  {urgentOrderCount} {t('dashboard.urgent')}{' '}
                  {urgentOrderCount > 1
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
                  {lowStockCount}{' '}
                  {lowStockCount > 1 ? t('dashboard.materials') : t('dashboard.material')}{' '}
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
          <SectionError
            message={t(errorAnalytics)}
            onRetry={retryAnalytics}
            retryLabel={retryLabel}
          />
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
        <SectionErrorBoundary fallbackMessage={sectionFallback} retryLabel={retryLabel}>
          <RevenueChart
            loading={loadingRevenue}
            error={errorRevenue}
            revenueTrend={revenueTrend}
            onRetry={fetchRevenue}
          />
        </SectionErrorBoundary>

        <SectionErrorBoundary fallbackMessage={sectionFallback} retryLabel={retryLabel}>
          <OrderStatusChart
            loading={loadingAnalytics}
            error={errorAnalytics}
            orderStatusData={orderStatusData}
            onRetry={retryAnalytics}
          />
        </SectionErrorBoundary>
      </div>

      {/* ================================================================= */}
      {/* BOTTOM ROW (3 equal columns)                                      */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionErrorBoundary fallbackMessage={sectionFallback} retryLabel={retryLabel}>
          <ProductionPipeline
            loading={loadingAnalytics}
            error={errorAnalytics}
            productionData={productionData}
            urgentOrders={production?.urgent_orders || 0}
            onRetry={retryAnalytics}
          />
        </SectionErrorBoundary>

        <SectionErrorBoundary fallbackMessage={sectionFallback} retryLabel={retryLabel}>
          <RecentActivity
            loading={loadingRecentOrders}
            error={errorRecentOrders}
            recentOrders={recentOrders}
            onRetry={fetchRecentOrdersData}
            onViewAll={navigateOrders}
            onOrderClick={navigateToOrder}
          />
        </SectionErrorBoundary>

        <SectionErrorBoundary fallbackMessage={sectionFallback} retryLabel={retryLabel}>
          <InventoryOverview
            loading={loadingAnalytics}
            error={errorAnalytics}
            inventory={inventory}
            onRetry={retryAnalytics}
          />
        </SectionErrorBoundary>
      </div>

      {/* ================================================================= */}
      {/* REVENUE SUMMARY ROW                                               */}
      {/* ================================================================= */}
      <SectionErrorBoundary fallbackMessage={sectionFallback} retryLabel={retryLabel}>
        <RevenueSummary
          loading={loadingAnalytics}
          error={errorAnalytics}
          revenue={revenue}
          onRetry={retryAnalytics}
        />
      </SectionErrorBoundary>
    </div>
  );
};

export default Dashboard;
