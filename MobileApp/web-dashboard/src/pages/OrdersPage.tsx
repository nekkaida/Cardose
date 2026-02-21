import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import Toast from '../components/Toast';
import OrderFormModal from '../components/orders/OrderFormModal';
import StatusUpdateModal from '../components/orders/StatusUpdateModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import type { OrderStatus, OrderCreatePayload, OrderUpdatePayload } from '@shared/types/orders';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerId: string;
  status: string;
  priority: string;
  totalAmount: number;
  dueDate: string;
  createdAt: string;
  boxType: string;
  specialRequests: string;
}

interface Customer {
  id: string;
  name: string;
}

interface OrderStats {
  total: number;
  pending: number;
  designing: number;
  approved: number;
  production: number;
  quality_control: number;
  completed: number;
  cancelled: number;
  totalValue: number;
  overdue: number;
}

const STATUSES = [
  'pending',
  'designing',
  'approved',
  'production',
  'quality_control',
  'completed',
  'cancelled',
] as const;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  designing: 'Designing',
  approved: 'Approved',
  production: 'Production',
  quality_control: 'Quality Control',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    designing: 0,
    approved: 0,
    production: 0,
    quality_control: 0,
    completed: 0,
    cancelled: 0,
    totalValue: 0,
    overdue: 0,
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const pageSize = 25;

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Status update
  const [statusUpdateId, setStatusUpdateId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { getOrders, getCustomers, createOrder, updateOrder, updateOrderStatus, deleteOrder } =
    useApi();
  const { user } = useAuth();
  const { t } = useLanguage();

  const canDelete = user?.role === 'owner' || user?.role === 'manager';

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = {
        page,
        limit: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;

      const data = await getOrders(params);
      const apiOrders = (data.orders || []).map((o) => ({
        id: o.id,
        orderNumber: o.order_number || '',
        customerName: o.customer_name || 'Unknown',
        customerId: o.customer_id || '',
        status: o.status || 'pending',
        priority: o.priority || 'normal',
        totalAmount: o.total_amount || 0,
        dueDate: o.due_date || '',
        createdAt: o.created_at || '',
        boxType: o.box_type || '',
        specialRequests: o.special_requests || '',
      }));
      setOrders(apiOrders);
      setTotalPages(data.totalPages || 1);
      setTotalOrders(data.total || apiOrders.length);

      // Use backend stats
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
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [getOrders, page, debouncedSearch, statusFilter, priorityFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    getCustomers({ limit: 200 })
      .then((data) => {
        setCustomers((data.customers || []).map((c) => ({ id: c.id, name: c.name })));
      })
      .catch((err) => {
        console.error('Failed to load customers:', err);
        setToast({ message: 'Failed to load customer list', type: 'error' });
      });
  }, [getCustomers]);

  // ESC key handler for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showModal) setShowModal(false);
        if (statusUpdateId) setStatusUpdateId(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal, statusUpdateId]);

  const openCreate = () => {
    setEditingOrder(null);
    setShowModal(true);
  };

  const openEdit = (order: Order) => {
    setEditingOrder(order);
    setShowModal(true);
  };

  const handleSave = async (isEdit: boolean, data: OrderCreatePayload | OrderUpdatePayload) => {
    if (isEdit && editingOrder) {
      await updateOrder(editingOrder.id, data as OrderUpdatePayload);
      setToast({ message: 'Order updated successfully', type: 'success' });
    } else {
      await createOrder(data as OrderCreatePayload);
      setToast({ message: 'Order created successfully', type: 'success' });
    }
    setShowModal(false);
    loadOrders();
  };

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await deleteOrder(deleteId);
      setDeleteId(null);
      setToast({ message: 'Order deleted successfully', type: 'success' });
      loadOrders();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setDeleteError(axiosErr?.response?.data?.error || t('orders.deleteError'));
    } finally {
      setDeleting(false);
    }
  }, [deleteId, deleteOrder, loadOrders, t]);

  const cancelDelete = useCallback(() => {
    setDeleteId(null);
    setDeleteError(null);
  }, []);

  const handleStatusUpdate = async (status: OrderStatus) => {
    if (!statusUpdateId || !status) return;
    const currentOrder = orders.find((o) => o.id === statusUpdateId);
    if (currentOrder && status === currentOrder.status) return;
    try {
      setStatusUpdating(true);
      await updateOrderStatus(statusUpdateId, status);
      setStatusUpdateId(null);
      setToast({ message: 'Status updated successfully', type: 'success' });
      loadOrders();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to update status';
      setToast({ message, type: 'error' });
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const SortIcon: React.FC<{ column: string }> = ({ column }) => {
    if (sortBy !== column) return <span className="ml-1 text-gray-300">&#8645;</span>;
    return (
      <span className="ml-1 text-primary-600">{sortOrder === 'asc' ? '&#8593;' : '&#8595;'}</span>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'designing':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-purple-100 text-purple-800';
      case 'production':
        return 'bg-orange-100 text-orange-800';
      case 'quality_control':
        return 'bg-amber-100 text-amber-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (order: Order) => {
    if (!order.dueDate || order.status === 'completed' || order.status === 'cancelled')
      return false;
    return new Date(order.dueDate) < new Date(new Date().toDateString());
  };

  const activeCount = stats.designing + stats.approved + stats.production + stats.quality_control;

  // Skeleton loader
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 w-3/4 rounded bg-gray-200"></div>
        </td>
      ))}
    </tr>
  );

  // Prepare order data for the form modal
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

  // Get current order for status update modal
  const statusUpdateOrder = statusUpdateId ? orders.find((o) => o.id === statusUpdateId) : null;

  if (error && !orders.length) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-700">
        <p className="font-medium">{t('common.error')}</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => {
            setError(null);
            loadOrders();
          }}
          className="mt-2 text-sm text-red-600 underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('orders.title')}</h1>
          <p className="text-sm text-gray-500">
            {totalOrders} total orders
            {stats.overdue > 0 && (
              <span className="ml-2 font-medium text-red-600">({stats.overdue} overdue)</span>
            )}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          + {t('orders.new') || 'New Order'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            {t('orders.pending') || 'Pending'}
          </p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Active</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{activeCount}</p>
          <p className="mt-0.5 text-xs text-gray-400">
            {stats.designing} design · {stats.production} prod
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            {t('orders.completed') || 'Completed'}
          </p>
          <p className="mt-1 text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">Total Value</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatCurrency(stats.totalValue)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('common.search') + ' orders...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Priority</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort('order_number')}
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  Order <SortIcon column="order_number" />
                </th>
                <th
                  onClick={() => handleSort('customer_name')}
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  Customer <SortIcon column="customer_name" />
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  Status <SortIcon column="status" />
                </th>
                <th
                  onClick={() => handleSort('priority')}
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  Priority <SortIcon column="priority" />
                </th>
                <th
                  onClick={() => handleSort('total_amount')}
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  Amount <SortIcon column="total_amount" />
                </th>
                <th
                  onClick={() => handleSort('due_date')}
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  Due Date <SortIcon column="due_date" />
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <svg
                        className="mb-4 h-16 w-16 text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="mb-1 font-medium text-gray-500">No orders found</p>
                      <p className="mb-4 text-sm text-gray-400">
                        {debouncedSearch || statusFilter !== 'all' || priorityFilter !== 'all'
                          ? 'Try adjusting your filters.'
                          : 'Create your first order to get started.'}
                      </p>
                      {!debouncedSearch && statusFilter === 'all' && priorityFilter === 'all' && (
                        <button
                          onClick={openCreate}
                          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                        >
                          + Create Order
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className={`transition-colors hover:bg-gray-50 ${isOverdue(order) ? 'bg-red-50' : ''}`}
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                      <div className="text-xs text-gray-500">{formatDate(order.createdAt)}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                      {order.boxType && (
                        <div className="text-xs capitalize text-gray-500">{order.boxType} box</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <button
                        onClick={() => {
                          setStatusUpdateId(order.id);
                        }}
                        className={`inline-flex cursor-pointer rounded-full px-2 py-1 text-xs font-semibold hover:opacity-80 ${getStatusColor(order.status)}`}
                      >
                        {STATUS_LABELS[order.status] || order.status}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getPriorityColor(order.priority)}`}
                      >
                        {PRIORITY_LABELS[order.priority] || order.priority}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(order.totalAmount)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div
                        className={`text-sm ${isOverdue(order) ? 'font-semibold text-red-600' : 'text-gray-900'}`}
                      >
                        {formatDate(order.dueDate)}
                        {isOverdue(order) && (
                          <span className="block text-xs text-red-500">Overdue</span>
                        )}
                      </div>
                    </td>
                    <td className="space-x-2 whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={() => openEdit(order)}
                        className="text-sm font-medium text-primary-600 hover:text-primary-800"
                      >
                        {t('common.edit')}
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => setDeleteId(order.id)}
                          className="text-sm font-medium text-red-600 hover:text-red-800"
                        >
                          {t('common.delete')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && orders.length > 0 && (
          <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-3">
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages} ({totalOrders} orders)
            </span>
            <div className="space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <OrderFormModal
        open={showModal}
        order={formOrder}
        customers={customers}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
      />

      {/* Status Update Modal */}
      <StatusUpdateModal
        open={!!statusUpdateId}
        currentStatus={statusUpdateOrder?.status || 'pending'}
        orderNumber={statusUpdateOrder?.orderNumber}
        customerName={statusUpdateOrder?.customerName}
        onClose={() => setStatusUpdateId(null)}
        onUpdate={handleStatusUpdate}
        updating={statusUpdating}
      />

      {/* Delete Confirmation */}
      {deleteId && (
        <ConfirmDeleteDialog
          itemLabel={orders.find((o) => o.id === deleteId)?.orderNumber || deleteId}
          titleKey="orders.deleteOrder"
          descriptionKey="orders.confirmDelete"
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={cancelDelete}
          error={deleteError}
        />
      )}
    </div>
  );
};

export default OrdersPage;
