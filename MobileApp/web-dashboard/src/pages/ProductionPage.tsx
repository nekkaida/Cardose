import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

// ---------------------------------------------------------------------------
// TypeScript interfaces matching backend response shapes
// ---------------------------------------------------------------------------

interface ProductionOrder {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  priority: string;
  due_date: string;
  total_amount: number;
}

interface StageDistribution {
  pending: number;
  designing: number;
  approved: number;
  production: number;
  quality_control: number;
}

interface ProductionStats {
  active_orders: number;
  completed_today: number;
  pending_approval: number;
  quality_issues: number;
  overdue_orders: number;
  stage_distribution: StageDistribution;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type StageKey = 'pending' | 'designing' | 'approved' | 'production' | 'quality_control';

interface StageConfig {
  key: StageKey;
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

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  normal: 'bg-blue-100 text-blue-800',
  low: 'bg-gray-100 text-gray-800',
};

const PRIORITY_KEYS: Record<string, string> = {
  urgent: 'production.urgent',
  high: 'production.high',
  normal: 'production.normal',
  low: 'production.low',
};

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

const isOverdue = (dueDateStr: string): boolean => {
  if (!dueDateStr) return false;
  const due = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
};

// ---------------------------------------------------------------------------
// Toast component (matches other pages)
// ---------------------------------------------------------------------------

const Toast: React.FC<{
  message: string;
  type: 'success' | 'error' | 'warning';
  onClose: () => void;
}> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-500 text-white',
  };

  const icons = {
    success: 'M5 13l4 4L19 7',
    error: 'M6 18L18 6M6 6l12 12',
    warning:
      'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  };

  return (
    <div
      className={`animate-slide-in fixed right-4 top-4 z-[60] flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${colors[type]}`}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[type]} />
      </svg>
      {message}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

const SkeletonStatCard: React.FC = () => (
  <div className="animate-pulse rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="mb-3 h-3 w-20 rounded bg-gray-200" />
    <div className="mb-2 h-7 w-16 rounded bg-gray-200" />
  </div>
);

const SkeletonColumn: React.FC = () => (
  <div className="animate-pulse rounded-xl border border-gray-100 bg-white shadow-sm">
    <div className="border-b border-gray-100 p-4">
      <div className="mb-2 h-4 w-24 rounded bg-gray-200" />
      <div className="h-3 w-16 rounded bg-gray-200" />
    </div>
    <div className="space-y-3 p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 flex justify-between">
            <div className="h-3 w-20 rounded bg-gray-200" />
            <div className="h-4 w-14 rounded-full bg-gray-200" />
          </div>
          <div className="mb-2 h-3 w-28 rounded bg-gray-200" />
          <div className="flex justify-between">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="h-3 w-20 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Section error
// ---------------------------------------------------------------------------

const SectionError: React.FC<{ message: string; retryLabel: string; onRetry: () => void }> = ({
  message,
  retryLabel,
  onRetry,
}) => (
  <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-700">
    <p className="font-medium">{message}</p>
    <button
      onClick={onRetry}
      className="mt-2 text-sm text-primary-600 underline underline-offset-2 hover:text-primary-700"
    >
      {retryLabel}
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ProductionPage: React.FC = () => {
  const { getProductionBoard, getProductionStats, updateProductionStage } = useApi();
  const { user } = useAuth();
  const { t } = useLanguage();

  // Translation helper with fallback
  const tr = useCallback(
    (key: string, fallback: string): string => {
      const val = t(key);
      return val === key ? fallback : val;
    },
    [t]
  );

  // Permissions
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

  // Drag state
  const [draggedOrder, setDraggedOrder] = useState<ProductionOrder | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Mobile move state (tap to select, tap column to move)
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  // ---- Data fetching ----
  // Use a ref for tr so loadProduction doesn't re-trigger on language changes
  const trRef = React.useRef(tr);
  trRef.current = tr;

  const loadProduction = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [boardResult, statsResult] = await Promise.allSettled([
      getProductionBoard(),
      getProductionStats(),
    ]);

    // Parse board: backend returns { board: { pending: [...], designing: [...], ... } }
    if (boardResult.status === 'fulfilled') {
      const val = boardResult.value;
      const boardObj = val?.board || {};
      // Flatten the stage-keyed object into a single array
      const allOrders: ProductionOrder[] = Object.values(boardObj).flat() as ProductionOrder[];
      setBoard(allOrders);
    }

    // Parse stats: backend returns { stats: { stage_distribution: { ... }, ... } }
    if (statsResult.status === 'fulfilled') {
      const raw = statsResult.value;
      setStats(raw?.stats || raw || null);
    }

    if (boardResult.status === 'rejected' && statsResult.status === 'rejected') {
      setError(
        trRef.current('production.loadError', 'Failed to load production data. Please try again.')
      );
    } else if (boardResult.status === 'rejected' || statsResult.status === 'rejected') {
      setToast({
        message: trRef.current(
          'production.partialError',
          'Some production data could not be loaded.'
        ),
        type: 'warning',
      });
    }

    setLoading(false);
  }, [getProductionBoard, getProductionStats]);

  useEffect(() => {
    loadProduction();
  }, [loadProduction]);

  // ---- Drag-and-drop handlers ----

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, order: ProductionOrder) => {
    if (!canMoveOrders) {
      e.preventDefault();
      setToast({
        message: tr('production.noPermission', 'You do not have permission to move orders.'),
        type: 'error',
      });
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
    if (dragOverColumn !== stageKey) {
      setDragOverColumn(stageKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, stageKey: string) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(relatedTarget)) {
      if (dragOverColumn === stageKey) {
        setDragOverColumn(null);
      }
    }
  };

  const moveOrder = async (order: ProductionOrder, targetStageKey: string) => {
    if (order.status === targetStageKey) {
      setSelectedOrder(null);
      return;
    }

    const previousStatus = order.status;
    const orderId = order.id;

    // Optimistic update
    setBoard((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: targetStageKey } : o)));
    setSelectedOrder(null);

    try {
      await updateProductionStage(orderId, targetStageKey);
      setToast({
        message: tr('production.moveSuccess', 'Order moved successfully'),
        type: 'success',
      });
    } catch {
      // Revert on failure
      setBoard((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: previousStatus } : o))
      );
      setToast({
        message: tr('production.moveFailed', 'Failed to move order. The change has been reverted.'),
        type: 'error',
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

  // Mobile tap-to-move: tap a card to select it, then tap a column header to move it there
  const handleCardTap = (order: ProductionOrder) => {
    if (!canMoveOrders) return;
    setSelectedOrder((prev) => (prev?.id === order.id ? null : order));
  };

  const handleColumnHeaderTap = (stageKey: string) => {
    if (selectedOrder && canMoveOrders) {
      moveOrder(selectedOrder, stageKey);
    }
  };

  // ---- Derived data ----
  const stageDistribution = stats?.stage_distribution;

  // ---- Render ----

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex animate-pulse flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 h-7 w-56 rounded bg-gray-200" />
            <div className="h-4 w-72 rounded bg-gray-200" />
          </div>
          <div className="h-9 w-9 rounded bg-gray-200" />
        </div>
        {/* Stat card skeletons */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
        {/* Column skeletons */}
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

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ---------------------------------------------------------------- */}
      {/* Header                                                           */}
      {/* ---------------------------------------------------------------- */}
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
          {/* Move hint */}
          {selectedOrder && (
            <span className="hidden text-xs font-medium text-primary-600 sm:inline">
              {tr('production.tapToMove', 'Tap a column to move')} {selectedOrder.order_number}
            </span>
          )}
          {/* Refresh button */}
          <button
            onClick={loadProduction}
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary-600"
            aria-label={tr('production.refresh', 'Refresh')}
            title={tr('production.refresh', 'Refresh')}
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
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Stat cards                                                       */}
      {/* ---------------------------------------------------------------- */}
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

      {/* ---------------------------------------------------------------- */}
      {/* Kanban Board                                                     */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {STAGES.map((stage) => {
          const stageOrders = board.filter((o) => o.status === stage.key);
          const count = stageDistribution?.[stage.key] ?? stageOrders.length;
          const isDropTarget = dragOverColumn === stage.key;
          const isSelectedTarget = selectedOrder && selectedOrder.status !== stage.key;

          return (
            <div
              key={stage.key}
              className={`rounded-xl border-t-4 bg-white shadow-sm ${stage.borderColor} flex flex-col border border-gray-100 transition-all duration-200 ${
                isDropTarget ? 'bg-primary-50 ring-2 ring-primary-400' : ''
              } ${isSelectedTarget ? 'cursor-pointer hover:ring-2 hover:ring-primary-300' : ''}`}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={(e) => handleDragLeave(e, stage.key)}
              onDrop={(e) => handleDrop(e, stage.key)}
              onClick={() => handleColumnHeaderTap(stage.key)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between border-b border-gray-100 p-4">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${stage.dotColor}`} />
                  <h3 className="text-sm font-semibold text-gray-900">
                    {tr(stage.labelKey, stage.fallback)}
                  </h3>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {count}
                </span>
              </div>

              {/* Column body */}
              <div
                className={`min-h-[80px] flex-1 space-y-2.5 overflow-y-auto p-3 ${
                  isDropTarget ? 'bg-primary-50/50' : ''
                }`}
                style={{ maxHeight: 'calc(100vh - 360px)' }}
              >
                {stageOrders.length === 0 ? (
                  <p className="py-6 text-center text-xs text-gray-400">
                    {draggedOrder || selectedOrder
                      ? tr('production.dropHere', 'Drop here to move')
                      : tr('production.noOrders', 'No orders in this stage')}
                  </p>
                ) : (
                  stageOrders.map((order) => {
                    const overdue = isOverdue(order.due_date);
                    const isSelected = selectedOrder?.id === order.id;
                    const priorityLabel = tr(
                      PRIORITY_KEYS[order.priority] || 'production.normal',
                      order.priority
                    );

                    return (
                      <div
                        key={order.id}
                        draggable={canMoveOrders}
                        onDragStart={(e) => handleDragStart(e, order)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardTap(order);
                        }}
                        className={`rounded-lg border bg-gray-50 p-3 transition-all duration-150 ${
                          canMoveOrders ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                        } ${
                          draggedOrder?.id === order.id
                            ? 'border-gray-200 opacity-40'
                            : 'opacity-100'
                        } ${
                          isSelected
                            ? 'border-primary-400 bg-primary-50 ring-2 ring-primary-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="truncate text-sm font-medium text-gray-900">
                            {order.order_number}
                          </span>
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[order.priority] || PRIORITY_COLORS.low}`}
                          >
                            {priorityLabel}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-gray-600">{order.customer_name}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span
                            className={`text-[10px] font-medium ${overdue ? 'text-red-600' : 'text-gray-500'}`}
                          >
                            {overdue && (
                              <svg
                                className="-mt-0.5 mr-0.5 inline h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                                />
                              </svg>
                            )}
                            {order.due_date
                              ? new Date(order.due_date).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                })
                              : '-'}
                          </span>
                          <span className="text-[10px] font-medium text-gray-700">
                            {formatCurrency(order.total_amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })
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
