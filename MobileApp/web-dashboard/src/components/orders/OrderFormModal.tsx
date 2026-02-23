import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { BOX_TYPES, PRIORITIES, BOX_TYPE_I18N_KEYS, PRIORITY_I18N_KEYS } from './orderHelpers';
import type { Customer } from './orderHelpers';
import type {
  OrderCreatePayload,
  OrderUpdatePayload,
  OrderPriority,
  BoxType,
} from '@shared/types/orders';

interface OrderFormData {
  customerId: string;
  boxType: string;
  priority: string;
  totalAmount: number;
  dueDate: string;
  specialRequests: string;
}

interface OrderFormModalProps {
  open: boolean;
  order: OrderFormData | null;
  customers: Customer[];
  onClose: () => void;
  onSave: (isEdit: boolean, data: OrderCreatePayload | OrderUpdatePayload) => Promise<void>;
}

import { sanitizeServerError } from '../../utils/errorSanitization';

const MAX_SPECIAL_REQUESTS_LENGTH = 500;

const OrderFormModal: React.FC<OrderFormModalProps> = ({
  open,
  order,
  customers,
  onClose,
  onSave,
}) => {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    customer_id: '',
    box_type: 'standard',
    priority: 'normal',
    total_amount: '',
    due_date: '',
    special_requests: '',
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEdit = order !== null;

  // Sync form data when order changes
  useEffect(() => {
    if (open) {
      if (order) {
        setFormData({
          customer_id: order.customerId,
          box_type: order.boxType || 'standard',
          priority: order.priority,
          total_amount: String(order.totalAmount || ''),
          due_date: order.dueDate ? order.dueDate.split('T')[0] : '',
          special_requests: order.specialRequests || '',
        });
      } else {
        setFormData({
          customer_id: '',
          box_type: 'standard',
          priority: 'normal',
          total_amount: '',
          due_date: '',
          special_requests: '',
        });
      }
      setFormError(null);
      setCustomerSearch('');
      setTimeout(() => firstInputRef.current?.focus(), 0);
    }
  }, [open, order]);

  // Focus trap + ESC
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, saving]);

  if (!open) return null;

  const filteredCustomers = customerSearch
    ? customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
    : customers;

  // Use local date (not UTC) so the min constraint is correct in all timezones
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const validateForm = (): string | null => {
    if (!isEdit && !formData.customer_id) return t('orders.selectCustomerError');
    const amount = Number(formData.total_amount);
    if (formData.total_amount && (isNaN(amount) || amount < 0)) return t('orders.amountError');
    if (
      formData.special_requests &&
      formData.special_requests.length > MAX_SPECIAL_REQUESTS_LENGTH
    ) {
      return t('orders.specialRequestsTooLong');
    }
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
      if (isEdit) {
        const updates: OrderUpdatePayload = {
          box_type: (formData.box_type || undefined) as BoxType | undefined,
          priority: (formData.priority || undefined) as OrderPriority | undefined,
          total_amount: Number(formData.total_amount) || 0,
          due_date: formData.due_date || undefined,
          special_requests: formData.special_requests || undefined,
        };
        await onSave(true, updates);
      } else {
        const payload: OrderCreatePayload = {
          customer_id: formData.customer_id,
          box_type: (formData.box_type || undefined) as BoxType | undefined,
          priority: (formData.priority || undefined) as OrderPriority | undefined,
          total_amount: Number(formData.total_amount) || 0,
          due_date: formData.due_date || undefined,
          special_requests: formData.special_requests || undefined,
        };
        await onSave(false, payload);
      }
    } catch (err: unknown) {
      const raw = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setFormError(sanitizeServerError(raw, t('orders.saveError')));
    } finally {
      setSaving(false);
    }
  };

  const specialRequestsRemaining = MAX_SPECIAL_REQUESTS_LENGTH - formData.special_requests.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-form-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id="order-form-title" className="text-lg font-semibold text-gray-900">
            {isEdit ? t('orders.editOrder') : t('orders.newOrder')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label={t('common.cancel')}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
          {formError && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {formError}
            </div>
          )}

          {/* Customer selector (create only) */}
          {!isEdit && (
            <div>
              <label
                htmlFor="customer-search"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t('orders.customerRequired')}
              </label>
              <input
                ref={firstInputRef}
                id="customer-search"
                type="text"
                placeholder={t('orders.searchCustomers')}
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="mb-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <select
                id="customer-select"
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label={t('orders.selectCustomer')}
              >
                <option value="">{t('orders.selectCustomer')}</option>
                {filteredCustomers.length === 0 && customerSearch ? (
                  <option value="" disabled>
                    {t('orders.noCustomersFound')}
                  </option>
                ) : (
                  filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Box Type + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="box-type" className="mb-1 block text-sm font-medium text-gray-700">
                {t('orders.boxType')}
              </label>
              <select
                id="box-type"
                value={formData.box_type}
                onChange={(e) => setFormData({ ...formData, box_type: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {BOX_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {t(BOX_TYPE_I18N_KEYS[bt])}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="priority" className="mb-1 block text-sm font-medium text-gray-700">
                {t('orders.priority')}
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {t(PRIORITY_I18N_KEYS[p])}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount + Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="mb-1 block text-sm font-medium text-gray-700">
                {t('orders.amountIDR')}
              </label>
              <input
                ref={isEdit ? firstInputRef : undefined}
                id="amount"
                type="number"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label htmlFor="due-date" className="mb-1 block text-sm font-medium text-gray-700">
                {t('orders.dueDate')}
              </label>
              <input
                id="due-date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                min={!isEdit ? today : undefined}
              />
            </div>
          </div>

          {/* Special Requests */}
          <div>
            <label
              htmlFor="special-requests"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {t('orders.specialRequests')}
            </label>
            <textarea
              id="special-requests"
              value={formData.special_requests}
              onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
              rows={2}
              maxLength={MAX_SPECIAL_REQUESTS_LENGTH}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={t('orders.specialRequestsPlaceholder')}
            />
            {formData.special_requests.length > 0 && (
              <p
                className={`mt-1 text-xs ${specialRequestsRemaining < 50 ? 'text-amber-600' : 'text-gray-400'}`}
              >
                {specialRequestsRemaining}/{MAX_SPECIAL_REQUESTS_LENGTH}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (!isEdit && !formData.customer_id)}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? t('orders.saving') : isEdit ? t('orders.update') : t('orders.createBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderFormModal;
