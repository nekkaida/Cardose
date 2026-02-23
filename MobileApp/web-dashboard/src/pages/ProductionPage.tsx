import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { OrderStatus } from '@shared/types/orders';
import type { ProductionOrder, ProductionStats, ProductionStage } from '@shared/types/production';
import Toast from '../components/Toast';
import KanbanCard from '../components/production/KanbanCard';
import OrderDetailDrawer from '../components/production/OrderDetailDrawer';
import { SkeletonStatCard, SkeletonColumn } from '../components/production/ProductionSkeletons';
import SectionError from '../components/dashboard/SectionError';
import { PRODUCTION_I18N } from '../components/production/productionHelpers';
import type { AxiosError } from 'axios';

// Re-export for backward compatibility
export type { ProductionOrder } from '@shared/types/production';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 30_000;
const DEFAULT_WIP_LIMIT = 15;

interface StageConfig {
  key: ProductionStage;
  labelKey: string;
  fallback: string;
  borderColor: string;
  dotColor: string;
}

const STAGES: StageConfig[] = [
  {
    key: 'pending',
    labelKey: 'production.pending',
    fallback: 'Pending',
    borderColor: 'border-yellow-400',
    dotColor: 'bg-yellow-400',
  },
  {
    key: 'designing',
    labelKey: 'production.designing',
    fallback: 'Designing',
    borderColor: 'border-blue-400',
    dotColor: 'bg-blue-400',
  },
  {
    key: 'approved',
    labelKey: 'production.approved',
    fallback: 'Approved',
    borderColor: 'border-primary-400',
    dotColor: 'bg-primary-400',
  },
  {
    key: 'production',
    labelKey: 'production.inProduction',
    fallback: 'In Production',
    borderColor: 'border-orange-400',
    dotColor: 'bg-orange-400',
  },
  {
    key: 'quality_control',
    labelKey: 'production.qualityControl',
    fallback: 'Quality Control',
    borderColor: 'border-accent-400',
    dotColor: 'bg-accent-400',
  },
];

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['designing', 'cancelled'],
  designing: ['approved', 'pending', 'cancelled'],
  approved: ['production', 'designing', 'cancelled'],
  production: ['quality_control', 'approved', 'cancelled'],
  quality_control: ['completed', 'production', 'cancelled'],
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ProductionPage: React.FC = () => {
  const { getProductionBoard, getProductionStats, updateProductionStage, getSettings } = useApi();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const tr = useCallback(
    (key: string, fallback: string): string => {
      const val = t(key);
      return val === key ? (PRODUCTION_I18N[key] ?? fallback) : val;
    },
    [t]
  );

  const canMoveOrders =
    user?.role === 'owner' || user?.role === 'manager' || user?.role === 'staff';

  // ---- State ----
  const [board, setBoard] = useState<ProductionOrder[]>([]);
  const [stats, setStats] = useState<ProductionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);

  const [draggedOrder, setDraggedOrder] = useState<ProductionOrder | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [movingOrderIds, setMovingOrderIds] = useState<Set<string>>(new Set());

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  // Auto-refresh
  const [lastRefreshAt, setLastRefreshAt] = useState<number>(Date.now());
  const [secondsSinceRefresh, setSecondsSinceRefresh] = useState(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Order detail drawer
  const [detailOrder, setDetailOrder] = useState<ProductionOrder | null>(null);

  // WIP limit from settings
  const [wipLimit, setWipLimit] = useState(DEFAULT_WIP_LIMIT);

  // Touch detection for mobile hint
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Load WIP limit from settings (best-effort)
  useEffect(() => {
    getSettings()
      .then((res) => {
        const wipSetting = res?.settings?.['production.wip_limit'];
        if (wipSetting?.value) {
          const parsed = parseInt(wipSetting.value, 10);
          if (!isNaN(parsed) && parsed > 0) setWipLimit(parsed);
        }
      })
      .catch(() => {
        // Settings load failure is non-critical; keep default
      });
  }, [getSettings]);

  // ---- Data fetching ----
  const trRef = useRef(tr);
  useEffect(() => {
    trRef.current = tr;
  }, [tr]);

  const loadProduction = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);

      const [boardResult, statsResult] = await Promise.allSettled([
        getProductionBoard(),
        getProductionStats(),
      ]);

      if (boardResult.status === 'fulfilled') {
        const boardObj = boardResult.value?.board ?? {};
        const allOrders = Object.values(boardObj).flat() as ProductionOrder[];
        setBoard(allOrders);
      }

      if (statsResult.status === 'fulfilled') {
        const raw = statsResult.value;
        if (raw?.stats) setStats(raw.stats);
      }

      if (boardResult.status === 'rejected' && statsResult.status === 'rejected') {
        setError(
          trRef.current('production.loadError', 'Failed to load production data. Please try again.')
        );
      } else if (boardResult.status === 'rejected' || statsResult.status === 'rejected') {
        if (!silent) {
          setToast({
            message: trRef.current(
              'production.partialError',
              'Some production data could not be loaded.'
            ),
            type: 'warning',
          });
        }
      }

      setLoading(false);
      setLastRefreshAt(Date.now());
      setSecondsSinceRefresh(0);
    },
    [getProductionBoard, getProductionStats]
  );

  useEffect(() => {
    loadProduction();
  }, [loadProduction]);

  // ---- Visibility-aware polling (Mod1) ----
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => loadProduction(true), POLL_INTERVAL_MS);
  }, [loadProduction]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    startPolling();

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Refresh immediately when tab becomes visible, then resume polling
        loadProduction(true);
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadProduction, startPolling, stopPolling]);

  // Tick timer for "seconds ago" display
  useEffect(() => {
    tickTimerRef.current = setInterval(() => {
      setSecondsSinceRefresh(Math.floor((Date.now() - lastRefreshAt) / 1000));
    }, 1000);
    return () => {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    };
  }, [lastRefreshAt]);

  // ---- Drag-and-drop handlers ----

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, order: ProductionOrder) => {
    if (!canMoveOrders || movingOrderIds.has(order.id)) {
      e.preventDefault();
      if (!canMoveOrders) {
        setToast({
          message: tr('production.noPermission', 'You do not have permission to move orders.'),
          type: 'error',
        });
      }
      return;
    }
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', order.id);
    requestAnimationFrame(() => {
      (e.target as HTMLDivElement).style.opacity = '0.4';
    });
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    (e.target as HTMLDivElement).style.opacity = '1';
    setDraggedOrder(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, stageKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== stageKey) setDragOverColumn(stageKey);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, stageKey: string) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(relatedTarget)) {
      if (dragOverColumn === stageKey) setDragOverColumn(null);
    }
  };

  const moveOrder = async (order: ProductionOrder, targetStageKey: string) => {
    if (order.status === targetStageKey) {
      setSelectedOrder(null);
      return;
    }
    if (movingOrderIds.has(order.id)) return;

    // Client-side transition validation
    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(targetStageKey)) {
      setToast({
        message: tr(
          'production.invalidTransition',
          'This move is not allowed from the current stage.'
        ),
        type: 'error',
      });
      setSelectedOrder(null);
      return;
    }

    const previousStatus = order.status;
    const orderId = order.id;

    // Mark as in-flight
    setMovingOrderIds((prev) => new Set(prev).add(orderId));
    // Optimistic update - also update stage_entered_at (Mod4)
    setBoard((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: targetStageKey, stage_entered_at: new Date().toISOString() }
          : o
      )
    );
    setSelectedOrder(null);

    try {
      await updateProductionStage(orderId, targetStageKey as OrderStatus);
      setToast({
        message: tr('production.moveSuccess', 'Order moved successfully'),
        type: 'success',
      });
      // Refresh stats after successful move
      try {
        const statsResult = await getProductionStats();
        if (statsResult?.stats) setStats(statsResult.stats);
      } catch {
        // Stats refresh failure is non-critical
      }
    } catch (err: unknown) {
      // M1: Parse 422 invalidTransition response for a specific error message
      const axiosError = err as AxiosError<{
        error?: string;
        currentStage?: string;
        allowedStages?: string[];
      }>;
      const responseData = axiosError?.response?.data;

      let errorMessage: string;
      if (axiosError?.response?.status === 422 && responseData?.currentStage) {
        const allowedList = responseData.allowedStages?.join(', ') ?? '?';
        errorMessage = tr(
          'production.invalidTransitionDetail',
          `Cannot move from "${responseData.currentStage}" to "${targetStageKey}". Allowed: ${allowedList}.`
        )
          .replace('{from}', responseData.currentStage)
          .replace('{to}', targetStageKey)
          .replace('{allowed}', allowedList);
      } else {
        errorMessage = tr(
          'production.moveFailed',
          'Failed to move order. The change has been reverted.'
        );
      }

      // Revert on failure
      setBoard((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: previousStatus } : o))
      );
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setMovingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetStageKey: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedOrder) return;
    const order = draggedOrder;
    setDraggedOrder(null);
    await moveOrder(order, targetStageKey);
  };

  const handleCardTap = (order: ProductionOrder) => {
    if (!canMoveOrders || movingOrderIds.has(order.id)) return;
    setSelectedOrder((prev) => (prev?.id === order.id ? null : order));
  };

  const handleColumnHeaderTap = (stageKey: string) => {
    if (selectedOrder && canMoveOrders) {
      moveOrder(selectedOrder, stageKey);
    }
  };

  const handleCardDetailClick = (order: ProductionOrder) => {
    setDetailOrder(order);
  };

  // ---- Filtering ----
  const filteredBoard = board.filter((order) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        order.order_number.toLowerCase().includes(q) ||
        (order.customer_name || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    if (priorityFilter && order.priority !== priorityFilter) return false;
    return true;
  });

  const hasFilters = searchQuery !== '' || priorityFilter !== '';
  const totalBoardOrders = board.length;
  const isEmptyBoard = totalBoardOrders === 0 && !loading && !error;
  const stageDistribution = stats?.stage_distribution;
  const dateLocale = language === 'id' ? 'id-ID' : 'en-US';

  // ---- Render ----

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex animate-pulse flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 h-7 w-56 rounded bg-gray-200" />
            <div className="h-4 w-72 rounded bg-gray-200" />
          </div>
          <div className="h-9 w-9 rounded bg-gray-200" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonColumn key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <SectionError
        message={error}
        retryLabel={tr('production.retry', 'Try Again')}
        onRetry={() => {
          setError(null);
          loadProduction();
        }}
      />
    );
  }

  if (isEmptyBoard) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {tr('production.title', 'Production Management')}
          </h1>
          <p className="text-sm text-gray-500">
            {tr('production.subtitle', 'Track production stages and manage workflows')}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <svg
            className="mb-4 h-16 w-16 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            />
          </svg>
          <h2 className="mb-2 text-lg font-semibold text-gray-700">
            {tr('production.emptyTitle', 'No production orders yet')}
          </h2>
          <p className="mb-6 max-w-sm text-sm text-gray-500">
            {tr(
              'production.emptyDescription',
              'Create orders to start tracking them through your production pipeline.'
            )}
          </p>
          <button
            onClick={() => navigate('/orders')}
            className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            {tr('production.goToOrders', 'Go to Orders')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {detailOrder && (
        <OrderDetailDrawer
          order={detailOrder}
          tr={tr}
          dateLocale={dateLocale}
          onClose={() => setDetailOrder(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {tr('production.title', 'Production Management')}
          </h1>
          <p className="text-sm text-gray-500">
            {tr('production.subtitle', 'Track production stages and manage workflows')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedOrder && (
            <span className="hidden text-xs font-medium text-primary-600 sm:inline">
              {tr('production.tapToMove', 'Tap a column to move')} {selectedOrder.order_number}
            </span>
          )}
          <span className="hidden text-[10px] text-gray-400 sm:inline">
            {secondsSinceRefresh}
            {tr('production.secondsAgo', 's ago')}
          </span>
          <button
            onClick={() => loadProduction()}
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary-600"
            aria-label={tr('production.refresh', 'Refresh')}
            title={tr('production.refresh', 'Refresh')}
          >
            <svg
              className="h-4.5 w-4.5"
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

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {tr('production.activeOrders', 'Active Orders')}
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{stats.active_orders ?? 0}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {tr('production.completedToday', 'Completed Today')}
            </p>
            <p className="mt-1 text-2xl font-bold text-green-600">{stats.completed_today ?? 0}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {tr('production.overdueOrders', 'Overdue Orders')}
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${(stats.overdue_orders ?? 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}
            >
              {stats.overdue_orders ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {tr('production.qualityIssues', 'Quality Issues')}
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${(stats.quality_issues ?? 0) > 0 ? 'text-orange-600' : 'text-gray-900'}`}
            >
              {stats.quality_issues ?? 0}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {tr('production.qcStuckLabel', 'In QC > 2 days')}
            </p>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tr('production.searchPlaceholder', 'Search orders...')}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
          />
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
        >
          <option value="">{tr('production.allPriorities', 'All Priorities')}</option>
          <option value="urgent">{tr('production.urgent', 'Urgent')}</option>
          <option value="high">{tr('production.high', 'High')}</option>
          <option value="normal">{tr('production.normal', 'Normal')}</option>
          <option value="low">{tr('production.low', 'Low')}</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => {
              setSearchQuery('');
              setPriorityFilter('');
            }}
            className="text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            {tr('production.clearFilters', 'Clear filters')}
          </button>
        )}
      </div>

      {/* Mobile touch hint (Min3) */}
      {isTouchDevice && canMoveOrders && !selectedOrder && totalBoardOrders > 0 && (
        <p className="text-center text-xs text-gray-400 sm:hidden">
          {tr('production.tapToSelect', 'Tap a card, then tap a column')}
        </p>
      )}

      {/* Kanban Board */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {STAGES.map((stage) => {
          const stageOrders = filteredBoard.filter((o) => o.status === stage.key);
          const unfilteredCount = board.filter((o) => o.status === stage.key).length;
          const count = stageDistribution?.[stage.key] ?? unfilteredCount;
          const isDropTarget = dragOverColumn === stage.key;
          const isSelectedTarget = selectedOrder && selectedOrder.status !== stage.key;
          const isWipWarning = unfilteredCount >= wipLimit;
          const canReceiveSelected =
            isSelectedTarget && VALID_TRANSITIONS[selectedOrder!.status]?.includes(stage.key);

          return (
            <div
              key={stage.key}
              role={canReceiveSelected ? 'button' : undefined}
              tabIndex={canReceiveSelected ? 0 : undefined}
              className={`flex flex-col rounded-xl border border-gray-100 shadow-sm transition-all duration-200 ${stage.borderColor} border-t-4 bg-white ${
                isDropTarget ? 'bg-primary-50 ring-2 ring-primary-400' : ''
              } ${canReceiveSelected ? 'cursor-pointer hover:ring-2 hover:ring-primary-300' : ''} ${
                isSelectedTarget && !canReceiveSelected ? 'opacity-50' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={(e) => handleDragLeave(e, stage.key)}
              onDrop={(e) => handleDrop(e, stage.key)}
              onClick={() => handleColumnHeaderTap(stage.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleColumnHeaderTap(stage.key);
                }
              }}
            >
              {/* Column header */}
              <div className="flex items-center justify-between border-b border-gray-100 p-4">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${stage.dotColor}`} />
                  <h3 className="text-sm font-semibold text-gray-900">
                    {tr(stage.labelKey, stage.fallback)}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {isWipWarning && (
                    <span
                      className="text-[9px] font-bold text-amber-600"
                      title={tr('production.wipWarning', 'WIP limit reached')}
                    >
                      !
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      isWipWarning ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {count}
                  </span>
                </div>
              </div>

              {/* Column body */}
              <div
                className={`min-h-[80px] flex-1 space-y-2.5 overflow-y-auto p-3 ${
                  isDropTarget ? 'bg-primary-50/50' : ''
                }`}
              >
                {stageOrders.length === 0 ? (
                  <p className="py-6 text-center text-xs text-gray-400">
                    {draggedOrder || selectedOrder
                      ? tr('production.dropHere', 'Drop here to move')
                      : tr('production.noOrders', 'No orders in this stage')}
                  </p>
                ) : (
                  stageOrders.map((order) => (
                    <KanbanCard
                      key={order.id}
                      order={order}
                      isSelected={selectedOrder?.id === order.id}
                      isDragged={draggedOrder?.id === order.id}
                      isMoving={movingOrderIds.has(order.id)}
                      canMove={canMoveOrders}
                      dateLocale={dateLocale}
                      tr={tr}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onTap={handleCardTap}
                      onDetailClick={handleCardDetailClick}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile selection hint */}
      {selectedOrder && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg sm:hidden">
          {tr('production.tapToMove', 'Tap a column to move')} {selectedOrder.order_number}
          <button
            onClick={() => setSelectedOrder(null)}
            className="ml-2 text-gray-300 hover:text-white"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductionPage;
