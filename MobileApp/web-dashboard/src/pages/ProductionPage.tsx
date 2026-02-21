import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { OrderStatus } from '@shared/types/orders';
import Toast from '../components/Toast';
import KanbanCard from '../components/production/KanbanCard';
import { SkeletonStatCard, SkeletonColumn } from '../components/production/ProductionSkeletons';
import SectionError from '../components/dashboard/SectionError';

// ---------------------------------------------------------------------------
// TypeScript interfaces matching backend response shapes
// ---------------------------------------------------------------------------

export interface ProductionOrder {
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
  React.useEffect(() => {
    trRef.current = tr;
  }, [tr]);

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
      const allOrders = Object.values(boardObj).flat() as unknown as ProductionOrder[];
      setBoard(allOrders);
    }

    // Parse stats: backend returns { stats: { stage_distribution: { ... }, ... } }
    if (statsResult.status === 'fulfilled') {
      const raw = statsResult.value;
      setStats((raw?.stats || raw || null) as unknown as ProductionStats | null);
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
    loadProduction(); // eslint-disable-line react-hooks/set-state-in-effect -- async data fetch on mount, standard pattern
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
      await updateProductionStage(orderId, targetStageKey as OrderStatus);
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
              role={isSelectedTarget ? 'button' : undefined}
              tabIndex={isSelectedTarget ? 0 : undefined}
              className={`rounded-xl border-t-4 bg-white shadow-sm ${stage.borderColor} flex flex-col border border-gray-100 transition-all duration-200 ${
                isDropTarget ? 'bg-primary-50 ring-2 ring-primary-400' : ''
              } ${isSelectedTarget ? 'cursor-pointer hover:ring-2 hover:ring-primary-300' : ''}`}
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
                  stageOrders.map((order) => (
                    <KanbanCard
                      key={order.id}
                      order={order}
                      isSelected={selectedOrder?.id === order.id}
                      isDragged={draggedOrder?.id === order.id}
                      canMove={canMoveOrders}
                      tr={tr}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onTap={handleCardTap}
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
