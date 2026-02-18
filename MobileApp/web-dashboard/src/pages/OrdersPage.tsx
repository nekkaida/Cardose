import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

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

const STATUSES = ['pending', 'designing', 'approved', 'production', 'quality_control', 'completed', 'cancelled'] as const;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
const BOX_TYPES = ['standard', 'premium', 'luxury', 'custom'] as const;

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

// Toast notification component
const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-slide-in ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {type === 'success' ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      )}
      {message}
    </div>
  );
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
  const [stats, setStats] = useState<OrderStats>({ total: 0, pending: 0, designing: 0, approved: 0, production: 0, quality_control: 0, completed: 0, cancelled: 0, totalValue: 0, overdue: 0 });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const pageSize = 25;

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customer_id: '', box_type: 'standard', priority: 'normal',
    total_amount: '', due_date: '', special_requests: '',
  });
  const [customerSearch, setCustomerSearch] = useState('');

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Status update
  const [statusUpdateId, setStatusUpdateId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { getOrders, getCustomers, createOrder, updateOrder, updateOrderStatus, deleteOrder } = useApi();
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
      const params: Record<string, any> = { page, limit: pageSize, sort_by: sortBy, sort_order: sortOrder };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;

      const data = await getOrders(params);
      const apiOrders = (data.orders || []).map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number || o.orderNumber || '',
        customerName: o.customer_name || o.customerName || 'Unknown',
        customerId: o.customer_id || '',
        status: o.status || 'pending',
        priority: o.priority || 'normal',
        totalAmount: o.total_amount || o.totalAmount || 0,
        dueDate: o.due_date || o.dueDate || '',
        createdAt: o.created_at || o.createdAt || '',
        boxType: o.box_type || o.boxType || '',
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

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    getCustomers({ limit: 200 }).then(data => {
      setCustomers((data.customers || []).map((c: any) => ({ id: c.id, name: c.name })));
    }).catch((err) => {
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
        if (deleteId) setDeleteId(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal, statusUpdateId, deleteId]);

  const openCreate = () => {
    setEditingOrder(null);
    setFormData({ customer_id: '', box_type: 'standard', priority: 'normal', total_amount: '', due_date: '', special_requests: '' });
    setFormError(null);
    setCustomerSearch('');
    setShowModal(true);
  };

  const openEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      customer_id: order.customerId,
      box_type: order.boxType || 'standard',
      priority: order.priority,
      total_amount: String(order.totalAmount || ''),
      due_date: order.dueDate ? order.dueDate.split('T')[0] : '',
      special_requests: order.specialRequests || '',
    });
    setFormError(null);
    setCustomerSearch('');
    setShowModal(true);
  };

  const validateForm = (): string | null => {
    if (!editingOrder && !formData.customer_id) return 'Please select a customer.';
    const amount = Number(formData.total_amount);
    if (formData.total_amount && (isNaN(amount) || amount < 0)) return 'Amount must be a positive number.';
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    try {
      setSaving(true);
      setFormError(null);
      const payload: Record<string, any> = {
        box_type: formData.box_type,
        priority: formData.priority,
        total_amount: Number(formData.total_amount) || 0,
        due_date: formData.due_date || undefined,
        special_requests: formData.special_requests || undefined,
      };
      if (editingOrder) {
        await updateOrder(editingOrder.id, payload);
        setToast({ message: 'Order updated successfully', type: 'success' });
      } else {
        payload.customer_id = formData.customer_id;
        await createOrder(payload);
        setToast({ message: 'Order created successfully', type: 'success' });
      }
      setShowModal(false);
      loadOrders();
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Failed to save order. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await deleteOrder(deleteId);
      setDeleteId(null);
      setToast({ message: 'Order deleted successfully', type: 'success' });
      loadOrders();
    } catch (err: any) {
      setToast({ message: err?.response?.data?.error || 'Failed to delete order', type: 'error' });
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusUpdateId || !newStatus) return;
    try {
      setStatusUpdating(true);
      await updateOrderStatus(statusUpdateId, newStatus);
      setStatusUpdateId(null);
      setNewStatus('');
      setToast({ message: 'Status updated successfully', type: 'success' });
      loadOrders();
    } catch (err: any) {
      setToast({ message: err?.response?.data?.error || 'Failed to update status', type: 'error' });
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const SortIcon: React.FC<{ column: string }> = ({ column }) => {
    if (sortBy !== column) return <span className="text-gray-300 ml-1">&#8645;</span>;
    return <span className="text-primary-600 ml-1">{sortOrder === 'asc' ? '&#8593;' : '&#8595;'}</span>;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'designing': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-purple-100 text-purple-800';
      case 'production': return 'bg-orange-100 text-orange-800';
      case 'quality_control': return 'bg-amber-100 text-amber-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (order: Order) => {
    if (!order.dueDate || order.status === 'completed' || order.status === 'cancelled') return false;
    return new Date(order.dueDate) < new Date(new Date().toDateString());
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const activeCount = stats.designing + stats.approved + stats.production + stats.quality_control;

  const filteredCustomers = customerSearch
    ? customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
    : customers;

  const today = new Date().toISOString().split('T')[0];

  // Skeleton loader
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-3/4"></div></td>
      ))}
    </tr>
  );

  if (error && !orders.length) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
        <p className="font-medium">{t('common.error')}</p>
        <p className="text-sm">{error}</p>
        <button onClick={() => { setError(null); loadOrders(); }} className="mt-2 text-sm text-red-600 underline">
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('orders.title')}</h1>
          <p className="text-gray-500 text-sm">{totalOrders} total orders{stats.overdue > 0 && <span className="text-red-600 font-medium ml-2">({stats.overdue} overdue)</span>}</p>
        </div>
        <button onClick={openCreate} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
          + {t('orders.new') || 'New Order'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">{t('orders.pending') || 'Pending'}</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">Active</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{activeCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">{stats.designing} design · {stats.production} prod</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">{t('orders.completed') || 'Completed'}</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalValue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('common.search') + ' orders...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="all">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="all">All Priority</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th onClick={() => handleSort('order_number')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">
                  Order <SortIcon column="order_number" />
                </th>
                <th onClick={() => handleSort('customer_name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">
                  Customer <SortIcon column="customer_name" />
                </th>
                <th onClick={() => handleSort('status')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">
                  Status <SortIcon column="status" />
                </th>
                <th onClick={() => handleSort('priority')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">
                  Priority <SortIcon column="priority" />
                </th>
                <th onClick={() => handleSort('total_amount')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">
                  Amount <SortIcon column="total_amount" />
                </th>
                <th onClick={() => handleSort('due_date')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">
                  Due Date <SortIcon column="due_date" />
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-500 font-medium mb-1">No orders found</p>
                      <p className="text-gray-400 text-sm mb-4">
                        {debouncedSearch || statusFilter !== 'all' || priorityFilter !== 'all'
                          ? 'Try adjusting your filters.'
                          : 'Create your first order to get started.'}
                      </p>
                      {!debouncedSearch && statusFilter === 'all' && priorityFilter === 'all' && (
                        <button onClick={openCreate} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm font-medium">
                          + Create Order
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : orders.map((order) => (
                <tr key={order.id} className={`hover:bg-gray-50 transition-colors ${isOverdue(order) ? 'bg-red-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                    <div className="text-xs text-gray-500">{formatDate(order.createdAt)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                    {order.boxType && <div className="text-xs text-gray-500 capitalize">{order.boxType} box</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => { setStatusUpdateId(order.id); setNewStatus(order.status); }}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 ${getStatusColor(order.status)}`}
                    >
                      {STATUS_LABELS[order.status] || order.status}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(order.priority)}`}>
                      {PRIORITY_LABELS[order.priority] || order.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(order.totalAmount)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${isOverdue(order) ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                      {formatDate(order.dueDate)}
                      {isOverdue(order) && <span className="block text-xs text-red-500">Overdue</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                    <button onClick={() => openEdit(order)} className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                      {t('common.edit')}
                    </button>
                    {canDelete && (
                      <button onClick={() => setDeleteId(order.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">
                        {t('common.delete')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && orders.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50">
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages} ({totalOrders} orders)
            </span>
            <div className="space-x-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-colors">
                Previous
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editingOrder ? 'Edit Order' : 'New Order'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm" role="alert">
                  {formError}
                </div>
              )}
              {!editingOrder && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm mb-1"
                  />
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    size={Math.min(filteredCustomers.length + 1, 6)}
                  >
                    <option value="">Select customer...</option>
                    {filteredCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Box Type</label>
                  <select
                    value={formData.box_type}
                    onChange={(e) => setFormData({ ...formData, box_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    {BOX_TYPES.map(bt => <option key={bt} value={bt}>{bt.charAt(0).toUpperCase() + bt.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (IDR)</label>
                  <input
                    type="number"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    min={!editingOrder ? today : undefined}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                <textarea
                  value={formData.special_requests}
                  onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none"
                  placeholder="Optional notes or special requests..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                {t('common.cancel')}
              </button>
              <button onClick={handleSave} disabled={saving || (!editingOrder && !formData.customer_id)}
                className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Saving...' : editingOrder ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {statusUpdateId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setStatusUpdateId(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Update Status</h2>
              <button onClick={() => setStatusUpdateId(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setStatusUpdateId(null)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                {t('common.cancel')}
              </button>
              <button onClick={handleStatusUpdate} disabled={statusUpdating}
                className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {statusUpdating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setDeleteId(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('common.delete')} Order</h3>
              <p className="text-sm text-gray-500">Are you sure? This will permanently delete this order and its stage history.</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                {t('common.cancel')}
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting...' : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
