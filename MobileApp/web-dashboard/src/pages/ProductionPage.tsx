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
  { key: 'pending', labelKey: 'production.pending', fallback: 'Pending', borderColor: 'border-yellow-400', dotColor: 'bg-yellow-400' },
  { key: 'designing', labelKey: 'production.designing', fallback: 'Designing', borderColor: 'border-blue-400', dotColor: 'bg-blue-400' },
  { key: 'approved', labelKey: 'production.approved', fallback: 'Approved', borderColor: 'border-primary-400', dotColor: 'bg-primary-400' },
  { key: 'production', labelKey: 'production.inProduction', fallback: 'In Production', borderColor: 'border-orange-400', dotColor: 'bg-orange-400' },
  { key: 'quality_control', labelKey: 'production.qualityControl', fallback: 'Quality Control', borderColor: 'border-accent-400', dotColor: 'bg-accent-400' },
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

const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'warning'; onClose: () => void }> = ({ message, type, onClose }) => {
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
    warning: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  };

  return (
    <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-slide-in ${colors[type]}`}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 animate-pulse">
    <div className="h-3 bg-gray-200 rounded w-20 mb-3" />
    <div className="h-7 bg-gray-200 rounded w-16 mb-2" />
  </div>
);

const SkeletonColumn: React.FC = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 animate-pulse">
    <div className="p-4 border-b border-gray-100">
      <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-16" />
    </div>
    <div className="p-4 space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex justify-between mb-2">
            <div className="h-3 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded-full w-14" />
          </div>
          <div className="h-3 bg-gray-200 rounded w-28 mb-2" />
          <div className="flex justify-between">
            <div className="h-3 bg-gray-200 rounded w-16" />
            <div className="h-3 bg-gray-200 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Section error
// ---------------------------------------------------------------------------

const SectionError: React.FC<{ message: string; retryLabel: string; onRetry: () => void }> = ({ message, retryLabel, onRetry }) => (
  <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
    <p className="font-medium">{message}</p>
    <button onClick={onRetry} className="mt-2 text-sm text-primary-600 hover:text-primary-700 underline underline-offset-2">
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
    [t],
  );

  // Permissions
  const canMoveOrders = user?.role === 'owner' || user?.role === 'manager' || user?.role === 'staff';

  // ---- State ----
  const [board, setBoard] = useState<ProductionOrder[]>([]);
  const [stats, setStats] = useState<ProductionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

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
      setError(trRef.current('production.loadError', 'Failed to load production data. Please try again.'));
    } else if (boardResult.status === 'rejected' || statsResult.status === 'rejected') {
      setToast({ message: trRef.current('production.partialError', 'Some production data could not be loaded.'), type: 'warning' });
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
      setToast({ message: tr('production.noPermission', 'You do not have permission to move orders.'), type: 'error' });
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
    setBoard(prev =>
      prev.map(o => o.id === orderId ? { ...o, status: targetStageKey } : o)
    );
    setSelectedOrder(null);

    try {
      await updateProductionStage(orderId, targetStageKey);
      setToast({ message: tr('production.moveSuccess', 'Order moved successfully'), type: 'success' });
    } catch {
      // Revert on failure
      setBoard(prev =>
        prev.map(o => o.id === orderId ? { ...o, status: previousStatus } : o)
      );
      setToast({ message: tr('production.moveFailed', 'Failed to move order. The change has been reverted.'), type: 'error' });
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
    setSelectedOrder(prev => prev?.id === order.id ? null : order);
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-pulse">
          <div>
            <div className="h-7 bg-gray-200 rounded w-56 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-72" />
          </div>
          <div className="h-9 bg-gray-200 rounded w-9" />
        </div>
        {/* Stat card skeletons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
        {/* Column skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
        onRetry={() => { setError(null); loadProduction(); }}
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tr('production.title', 'Production Management')}</h1>
          <p className="text-gray-500 text-sm">{tr('production.subtitle', 'Track production stages and manage workflows')}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Move hint */}
          {selectedOrder && (
            <span className="text-xs text-primary-600 font-medium hidden sm:inline">
              {tr('production.tapToMove', 'Tap a column to move')} {selectedOrder.order_number}
            </span>
          )}
          {/* Refresh button */}
          <button
            onClick={loadProduction}
            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-primary-600 transition-colors"
            aria-label={tr('production.refresh', 'Refresh')}
            title={tr('production.refresh', 'Refresh')}
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Stat cards                                                       */}
      {/* ---------------------------------------------------------------- */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {tr('production.activeOrders', 'Active Orders')}
            </p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.active_orders ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {tr('production.completedToday', 'Completed Today')}
            </p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed_today ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {tr('production.overdueOrders', 'Overdue Orders')}
            </p>
            <p className={`text-2xl font-bold mt-1 ${(stats.overdue_orders ?? 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {stats.overdue_orders ?? 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {tr('production.qualityIssues', 'Quality Issues')}
            </p>
            <p className={`text-2xl font-bold mt-1 ${(stats.quality_issues ?? 0) > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
              {stats.quality_issues ?? 0}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{tr('production.qcStuckLabel', 'In QC > 2 days')}</p>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Kanban Board                                                     */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {STAGES.map(stage => {
          const stageOrders = board.filter(o => o.status === stage.key);
          const count = stageDistribution?.[stage.key] ?? stageOrders.length;
          const isDropTarget = dragOverColumn === stage.key;
          const isSelectedTarget = selectedOrder && selectedOrder.status !== stage.key;

          return (
            <div
              key={stage.key}
              className={`bg-white rounded-xl shadow-sm border-t-4 ${stage.borderColor} border border-gray-100 transition-all duration-200 flex flex-col ${
                isDropTarget ? 'ring-2 ring-primary-400 bg-primary-50' : ''
              } ${isSelectedTarget ? 'cursor-pointer hover:ring-2 hover:ring-primary-300' : ''}`}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={(e) => handleDragLeave(e, stage.key)}
              onDrop={(e) => handleDrop(e, stage.key)}
              onClick={() => handleColumnHeaderTap(stage.key)}
            >
              {/* Column header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {tr(stage.labelKey, stage.fallback)}
                  </h3>
                </div>
                <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                  {count}
                </span>
              </div>

              {/* Column body */}
              <div className={`p-3 space-y-2.5 overflow-y-auto min-h-[80px] flex-1 ${
                isDropTarget ? 'bg-primary-50/50' : ''
              }`} style={{ maxHeight: 'calc(100vh - 360px)' }}>
                {stageOrders.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">
                    {draggedOrder || selectedOrder
                      ? tr('production.dropHere', 'Drop here to move')
                      : tr('production.noOrders', 'No orders in this stage')
                    }
                  </p>
                ) : stageOrders.map(order => {
                  const overdue = isOverdue(order.due_date);
                  const isSelected = selectedOrder?.id === order.id;
                  const priorityLabel = tr(PRIORITY_KEYS[order.priority] || 'production.normal', order.priority);

                  return (
                    <div
                      key={order.id}
                      draggable={canMoveOrders}
                      onDragStart={(e) => handleDragStart(e, order)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => { e.stopPropagation(); handleCardTap(order); }}
                      className={`bg-gray-50 rounded-lg p-3 border transition-all duration-150 ${
                        canMoveOrders ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                      } ${
                        draggedOrder?.id === order.id ? 'opacity-40 border-gray-200' : 'opacity-100'
                      } ${
                        isSelected ? 'border-primary-400 ring-2 ring-primary-200 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-sm font-medium text-gray-900 truncate">{order.order_number}</span>
                        <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full whitespace-nowrap ${PRIORITY_COLORS[order.priority] || PRIORITY_COLORS.low}`}>
                          {priorityLabel}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 truncate">{order.customer_name}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className={`text-[10px] font-medium ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
                          {overdue && (
                            <svg className="w-3 h-3 inline mr-0.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                          )}
                          {order.due_date
                            ? new Date(order.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
                            : '-'
                          }
                        </span>
                        <span className="text-[10px] font-medium text-gray-700">{formatCurrency(order.total_amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile selection hint */}
      {selectedOrder && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg sm:hidden z-50">
          {tr('production.tapToMove', 'Tap a column to move')} {selectedOrder.order_number}
          <button onClick={() => setSelectedOrder(null)} className="ml-2 text-gray-300 hover:text-white">
            &times;
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductionPage;
