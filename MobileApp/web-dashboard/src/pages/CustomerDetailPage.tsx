import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import type {
  Customer,
  CustomerOrder,
  CustomerCreatePayload,
  CustomerUpdatePayload,
} from '@shared/types/customers';
import { BUSINESS_TYPE_I18N, LOYALTY_I18N } from '@shared/types/customerConstants';
import Toast from '../components/Toast';
import { formatCurrency, formatDate } from '../utils/formatters';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import CustomerFormModal from '../components/customers/CustomerFormModal';
import {
  getLoyaltyColor,
  getBusinessColor,
  getOrderStatusColor,
  ORDER_STATUS_I18N,
} from '../utils/customerStyles';

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCustomer, updateCustomer, deleteCustomer } = useApi();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [customer, setCustomer] = useState<(Customer & { recentOrders?: CustomerOrder[] }) | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const canDelete = user?.role === 'owner' || user?.role === 'manager';
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadCustomer = useCallback(async () => {
    if (!id) return;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      setLoading(true);
      setError(null);
      const data = await getCustomer(id);
      if (controller.signal.aborted) return;
      setCustomer(data.customer);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(t('customerDetail.loadError'));
    } finally {
      setLoading(false);
    }
  }, [getCustomer, id, t]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleSave = async (payload: CustomerCreatePayload) => {
    if (!id) return;
    setSaving(true);
    try {
      await updateCustomer(id, payload as CustomerUpdatePayload);
      setToast({ message: t('customers.updateSuccess'), type: 'success' });
      setShowModal(false);
      setSaving(false);
      loadCustomer();
    } catch (err) {
      setSaving(false);
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      setDeleting(true);
      await deleteCustomer(id);
      navigate('/customers', {
        state: { toast: { message: t('customers.deleteSuccess'), type: 'success' } },
      });
    } catch {
      setToast({ message: t('customers.deleteError'), type: 'error' });
      setShowDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
          </div>
          <div className="lg:col-span-2">
            <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/customers')}
          className="text-sm text-primary-600 hover:text-primary-800"
        >
          &larr; {t('customerDetail.backToList')}
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-700">
          <p className="font-medium">{t('common.error')}</p>
          <p className="text-sm">{error || t('customerDetail.notFound')}</p>
          <button onClick={loadCustomer} className="mt-2 text-sm text-red-600 underline">
            {t('customers.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Back + Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/customers')}
            className="text-sm text-primary-600 hover:text-primary-800"
          >
            &larr; {t('customerDetail.backToList')}
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700">
              {(customer.name || '?')[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getBusinessColor(customer.business_type)}`}
                >
                  {BUSINESS_TYPE_I18N[customer.business_type]
                    ? t(BUSINESS_TYPE_I18N[customer.business_type])
                    : customer.business_type}
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getLoyaltyColor(customer.loyalty_status)}`}
                >
                  {LOYALTY_I18N[customer.loyalty_status]
                    ? t(LOYALTY_I18N[customer.loyalty_status])
                    : customer.loyalty_status}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('common.edit')}
          </button>
          {canDelete && (
            <button
              onClick={() => setShowDelete(true)}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              {t('common.delete')}
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Customer Info */}
        <div className="space-y-6 lg:col-span-1">
          {/* Contact Info */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">
              {t('customerDetail.contactInfo')}
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400">{t('customers.email')}</p>
                <p className="text-sm text-gray-900">{customer.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">{t('customers.phone')}</p>
                <p className="text-sm text-gray-900">{customer.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">{t('customers.address')}</p>
                <p className="text-sm text-gray-900">{customer.address || '-'}</p>
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">
              {t('customerDetail.summary')}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">{t('customers.totalOrders')}</p>
                <p className="text-xl font-bold text-gray-900">{customer.total_orders}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">{t('customers.totalSpent')}</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(customer.total_spent)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">{t('customerDetail.memberSince')}</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(customer.created_at)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">{t('customerDetail.lastUpdated')}</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(customer.updated_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {customer.notes && (
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">
                {t('customers.notes')}
              </h2>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Right: Recent Orders */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-sm font-semibold uppercase text-gray-500">
                {t('customerDetail.recentOrders')}
              </h2>
            </div>
            {!customer.recentOrders || customer.recentOrders.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg
                  className="mx-auto mb-4 h-12 w-12 text-gray-300"
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
                <p className="text-sm text-gray-500">{t('customerDetail.noOrders')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('customerDetail.orderNumber')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('customers.status')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('customerDetail.amount')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('customerDetail.dueDate')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('customerDetail.orderDate')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {customer.recentOrders.map((order) => (
                      <tr key={order.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-900">
                            {order.order_number}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getOrderStatusColor(order.status)}`}
                          >
                            {ORDER_STATUS_I18N[order.status]
                              ? t(ORDER_STATUS_I18N[order.status])
                              : order.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                          {order.due_date ? formatDate(order.due_date) : '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                          {formatDate(order.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <CustomerFormModal
        open={showModal}
        editingCustomer={customer}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        saving={saving}
      />

      {/* Delete Confirmation */}
      {showDelete && (
        <ConfirmDeleteDialog
          itemLabel={customer.name}
          titleKey="customers.deleteCustomer"
          descriptionKey="customers.confirmDelete"
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
};

export default CustomerDetailPage;
