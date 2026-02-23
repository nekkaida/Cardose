import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { OrderStatus, OrderCreatePayload, OrderUpdatePayload } from '@shared/types/orders';
import type { Order, OrderStatsData, Customer } from '../components/orders/orderHelpers';
import {
  EMPTY_STATS,
  STATUS_I18N_KEYS,
  PRIORITY_I18N_KEYS,
  ALLOWED_TRANSITIONS,
} from '../components/orders/orderHelpers';
import { exportToCSV, formatDate } from '../utils/formatters';
import { sanitizeServerError } from '../utils/errorSanitization';
import type { ToastData } from '../components/ToastQueue';

const PAGE_SIZE = 25;

export const useOrdersPage = () => {
  // ── Data ────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<OrderStatsData>(EMPTY_STATS);

  // ── Loading / error ─────────────────────────────────────────────────────
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Search ──────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // ── Filters ─────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  // Debounced copies of advanced filters (avoid request storm on keystrokes)
  const [debouncedDateFrom, setDebouncedDateFrom] = useState('');
  const [debouncedDateTo, setDebouncedDateTo] = useState('');
  const [debouncedAmountMin, setDebouncedAmountMin] = useState('');
  const [debouncedAmountMax, setDebouncedAmountMax] = useState('');

  // ── Pagination & sort ───────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ── Bulk selection ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Modal state ─────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // ── Delete state ────────────────────────────────────────────────────────
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Status update state ─────────────────────────────────────────────────
  const [statusUpdateId, setStatusUpdateId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // ── Bulk action state ───────────────────────────────────────────────────
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // ── Toast queue ─────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const toastIdRef = useRef(0);

  // ── Request tracking (stale response prevention) ────────────────────────
  const requestIdRef = useRef(0);
  const isFirstLoadRef = useRef(true);

  // ── Context ─────────────────────────────────────────────────────────────
  const { getOrders, getCustomers, createOrder, updateOrder, updateOrderStatus, deleteOrder } =
    useApi();
  const { user } = useAuth();
  const { t } = useLanguage();

  const canDelete = user?.role === 'owner' || user?.role === 'manager';

  // Stable ref for t to avoid re-fetching orders on language change
  const tRef = useRef(t);
  tRef.current = t;

  // ── Toast helpers ───────────────────────────────────────────────────────

  const addToast = useCallback((message: string, type: ToastData['type']) => {
    const id = String(++toastIdRef.current);
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Computed ────────────────────────────────────────────────────────────

  const hasActiveFilters =
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    !!dateFrom ||
    !!dateTo ||
    !!amountMin ||
    !!amountMax;

  const allSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id));

  // ── Debounce search ─────────────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Debounce advanced filters (prevent request storm on amount keystrokes) ─

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDateFrom(dateFrom);
      setDebouncedDateTo(dateTo);
      setDebouncedAmountMin(amountMin);
      setDebouncedAmountMax(amountMax);
    }, 400);
    return () => clearTimeout(timer);
  }, [dateFrom, dateTo, amountMin, amountMax]);

  // ── Load orders ─────────────────────────────────────────────────────────

  const loadOrders = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    try {
      if (isFirstLoadRef.current) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const params: Record<string, string | number> = {
        page,
        limit: PAGE_SIZE,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (debouncedDateFrom) params.date_from = debouncedDateFrom;
      if (debouncedDateTo) params.date_to = debouncedDateTo;
      if (debouncedAmountMin) params.amount_min = debouncedAmountMin;
      if (debouncedAmountMax) params.amount_max = debouncedAmountMax;

      const data = await getOrders(params);

      // Stale response guard
      if (currentRequestId !== requestIdRef.current) return;

      const apiOrders: Order[] = (data.orders || []).map(
        (o: {
          id: string;
          order_number?: string;
          customer_name?: string | null;
          customer_id?: string;
          status?: string;
          priority?: string;
          total_amount?: number;
          due_date?: string | null;
          created_at?: string;
          box_type?: string | null;
          special_requests?: string | null;
        }) => ({
          id: o.id,
          orderNumber: o.order_number || '',
          customerName: o.customer_name || 'Unknown',
          customerId: o.customer_id || '',
          status: (o.status || 'pending') as Order['status'],
          priority: (o.priority || 'normal') as Order['priority'],
          totalAmount: o.total_amount || 0,
          dueDate: o.due_date || '',
          createdAt: o.created_at || '',
          boxType: o.box_type || '',
          specialRequests: o.special_requests || '',
        })
      );
      setOrders(apiOrders);
      setSelectedIds(new Set()); // Clear selection — old IDs are no longer on screen
      setTotalPages(data.totalPages || 1);
      setTotalOrders(data.total || apiOrders.length);

      if (data.stats) {
        setStats({
          total: data.stats.total || 0,
          pending: data.stats.pending || 0,
          designing: data.stats.designing || 0,
          approved: data.stats.approved || 0,
          production: data.stats.production || 0,
          quality_control: data.stats.quality_control || 0,
          completed: data.stats.completed || 0,
          cancelled: data.stats.cancelled || 0,
          totalValue: data.stats.totalValue || 0,
          overdue: data.stats.overdue || 0,
        });
      }

      isFirstLoadRef.current = false;
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return;
      if (import.meta.env.DEV) console.error('Error loading orders:', err);
      setError(tRef.current('orders.loadError'));
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, [
    getOrders,
    page,
    debouncedSearch,
    statusFilter,
    priorityFilter,
    sortBy,
    sortOrder,
    debouncedDateFrom,
    debouncedDateTo,
    debouncedAmountMin,
    debouncedAmountMax,
  ]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // ── Load customers ──────────────────────────────────────────────────────

  useEffect(() => {
    getCustomers({ limit: 500 })
      .then((data: { customers?: { id: string; name: string }[] }) => {
        setCustomers(
          (data.customers || []).map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name,
          }))
        );
      })
      .catch((err: unknown) => {
        if (import.meta.env.DEV) console.error('Failed to load customers:', err);
        addToast(tRef.current('orders.loadCustomerError'), 'error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Selection ───────────────────────────────────────────────────────────

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  }, [allSelected, orders]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ── Sort ────────────────────────────────────────────────────────────────

  const handleSort = useCallback(
    (column: string) => {
      if (sortBy === column) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(column);
        setSortOrder('asc');
      }
      setPage(1);
    },
    [sortBy]
  );

  // ── Filters ─────────────────────────────────────────────────────────────

  const setStatusFilterAndReset = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const setPriorityFilterAndReset = useCallback((value: string) => {
    setPriorityFilter(value);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setSearchTerm('');
    setPage(1);
  }, []);

  // ── Modal ───────────────────────────────────────────────────────────────

  const openCreate = useCallback(() => {
    setEditingOrder(null);
    setShowModal(true);
  }, []);

  const openEdit = useCallback((order: Order) => {
    setEditingOrder(order);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingOrder(null);
  }, []);

  // ── CRUD ────────────────────────────────────────────────────────────────

  const handleSave = useCallback(
    async (isEdit: boolean, data: OrderCreatePayload | OrderUpdatePayload) => {
      if (isEdit && editingOrder) {
        await updateOrder(editingOrder.id, data as OrderUpdatePayload);
        addToast(t('orders.updateSuccess'), 'success');
      } else {
        await createOrder(data as OrderCreatePayload);
        addToast(t('orders.createSuccess'), 'success');
      }
      setShowModal(false);
      loadOrders();
    },
    [editingOrder, updateOrder, createOrder, addToast, t, loadOrders]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await deleteOrder(deleteId);
      setDeleteId(null);
      addToast(t('orders.deleteSuccess'), 'success');
      loadOrders();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setDeleteError(sanitizeServerError(axiosErr?.response?.data?.error, t('orders.deleteError')));
    } finally {
      setDeleting(false);
    }
  }, [deleteId, deleteOrder, loadOrders, addToast, t]);

  const cancelDelete = useCallback(() => {
    setDeleteId(null);
    setDeleteError(null);
  }, []);

  const handleStatusUpdate = useCallback(
    async (status: OrderStatus) => {
      if (!statusUpdateId || !status) return;
      const currentOrder = orders.find((o) => o.id === statusUpdateId);
      if (currentOrder && status === currentOrder.status) return;
      try {
        setStatusUpdating(true);
        await updateOrderStatus(statusUpdateId, status);
        setStatusUpdateId(null);
        addToast(t('orders.statusSuccess'), 'success');
        loadOrders();
      } catch (err: unknown) {
        const raw = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        addToast(sanitizeServerError(raw, t('orders.statusError')), 'error');
      } finally {
        setStatusUpdating(false);
      }
    },
    [statusUpdateId, orders, updateOrderStatus, addToast, t, loadOrders]
  );

  // ── Bulk actions ────────────────────────────────────────────────────────

  const BULK_CONCURRENCY = 5;

  const handleBulkDelete = useCallback(async () => {
    if (!canDelete || selectedIds.size === 0) return;
    try {
      setBulkDeleting(true);
      const ids = Array.from(selectedIds);
      let successCount = 0;
      // Process in batches of BULK_CONCURRENCY for parallelism without flooding
      for (let i = 0; i < ids.length; i += BULK_CONCURRENCY) {
        const batch = ids.slice(i, i + BULK_CONCURRENCY);
        const results = await Promise.allSettled(batch.map((id) => deleteOrder(id)));
        successCount += results.filter((r) => r.status === 'fulfilled').length;
      }
      clearSelection();
      if (successCount > 0) {
        addToast(t('orders.bulkDeleteSuccess').replace('{n}', String(successCount)), 'success');
        loadOrders();
      }
      const failedCount = ids.length - successCount;
      if (failedCount > 0) {
        addToast(t('orders.bulkFailed').replace('{n}', String(failedCount)), 'error');
      }
    } finally {
      setBulkDeleting(false);
    }
  }, [canDelete, selectedIds, deleteOrder, clearSelection, addToast, t, loadOrders]);

  const handleBulkStatusUpdate = useCallback(
    async (status: OrderStatus) => {
      if (selectedIds.size === 0) return;
      try {
        setBulkUpdating(true);
        const ids = Array.from(selectedIds);
        let successCount = 0;
        let skippedCount = 0;

        // Separate valid vs skipped before making API calls
        const validIds: string[] = [];
        for (const id of ids) {
          const order = orders.find((o) => o.id === id);
          if (order && !ALLOWED_TRANSITIONS[order.status]?.includes(status)) {
            skippedCount++;
          } else {
            validIds.push(id);
          }
        }

        // Process valid IDs in batches of BULK_CONCURRENCY
        for (let i = 0; i < validIds.length; i += BULK_CONCURRENCY) {
          const batch = validIds.slice(i, i + BULK_CONCURRENCY);
          const results = await Promise.allSettled(
            batch.map((id) => updateOrderStatus(id, status))
          );
          successCount += results.filter((r) => r.status === 'fulfilled').length;
        }

        clearSelection();
        if (successCount > 0) {
          addToast(t('orders.bulkStatusSuccess').replace('{n}', String(successCount)), 'success');
          loadOrders();
        }
        const failedCount = validIds.length - successCount;
        if (failedCount > 0) {
          addToast(t('orders.bulkFailed').replace('{n}', String(failedCount)), 'error');
        }
        if (skippedCount > 0) {
          addToast(t('orders.bulkSkipped').replace('{n}', String(skippedCount)), 'warning');
        }
      } finally {
        setBulkUpdating(false);
      }
    },
    [selectedIds, orders, updateOrderStatus, clearSelection, addToast, t, loadOrders]
  );

  // ── Export ──────────────────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    if (orders.length === 0) return;
    const tr = tRef.current;
    const data = orders.map((o) => ({
      [tr('orders.colOrder')]: o.orderNumber,
      [tr('orders.colCustomer')]: o.customerName,
      [tr('orders.colStatus')]: tr(STATUS_I18N_KEYS[o.status]) || o.status,
      [tr('orders.colPriority')]: tr(PRIORITY_I18N_KEYS[o.priority]) || o.priority,
      [tr('orders.colAmount')]: o.totalAmount,
      [tr('orders.boxType')]: o.boxType || '-',
      [tr('orders.colDueDate')]: o.dueDate ? formatDate(o.dueDate) : '-',
      [tr('orders.created')]: formatDate(o.createdAt),
      [tr('orders.specialRequests')]: o.specialRequests || '-',
    }));
    exportToCSV(data, `orders-export-${new Date().toISOString().split('T')[0]}.csv`);
    addToast(tr('orders.exportSuccess'), 'success');
  }, [orders, addToast]);

  // ── Computed modal data ─────────────────────────────────────────────────

  const formOrder = editingOrder
    ? {
        customerId: editingOrder.customerId,
        boxType: editingOrder.boxType,
        priority: editingOrder.priority,
        totalAmount: editingOrder.totalAmount,
        dueDate: editingOrder.dueDate,
        specialRequests: editingOrder.specialRequests,
      }
    : null;

  const statusUpdateOrder = statusUpdateId ? orders.find((o) => o.id === statusUpdateId) : null;

  return {
    // Data
    orders,
    customers,
    stats,

    // Loading
    initialLoading,
    refreshing,
    error,

    // Search
    searchTerm,
    setSearchTerm,

    // Filters
    statusFilter,
    setStatusFilter: setStatusFilterAndReset,
    priorityFilter,
    setPriorityFilter: setPriorityFilterAndReset,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    amountMin,
    setAmountMin,
    amountMax,
    setAmountMax,
    clearFilters,
    hasActiveFilters,

    // Pagination & sort
    page,
    setPage,
    totalPages,
    totalOrders,
    sortBy,
    sortOrder,
    handleSort,

    // Selection
    selectedIds,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    allSelected,

    // Modals
    showModal,
    formOrder,
    openCreate,
    openEdit,
    closeModal,

    deleteId,
    deleting,
    deleteError,
    setDeleteId,
    handleDelete,
    cancelDelete,

    statusUpdateId,
    statusUpdating,
    setStatusUpdateId,
    handleStatusUpdate,
    statusUpdateOrder,

    // CRUD
    handleSave,

    // Bulk
    handleBulkDelete,
    handleBulkStatusUpdate,
    bulkDeleting,
    bulkUpdating,

    // Toast
    toasts,
    addToast,
    removeToast,

    // Export
    handleExport,

    // Refresh
    loadOrders,

    // Auth
    canDelete,

    // i18n
    t,
  };
};
