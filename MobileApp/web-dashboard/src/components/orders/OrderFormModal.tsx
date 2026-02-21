import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type {
  OrderCreatePayload,
  OrderUpdatePayload,
  OrderPriority,
  BoxType,
} from '@shared/types/orders';

const BOX_TYPES = ['standard', 'premium', 'luxury', 'custom'] as const;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

interface Customer {
  id: string;
  name: string;
}

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

const OrderFormModal: React.FC<OrderFormModalProps> = ({
  open,
  order,
  customers,
  onClose,
  onSave,
}) => {
  const { t } = useLanguage();

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

  // Sync form data when order changes (open create vs edit)
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
    }
  }, [open, order]);

  if (!open) return null;

  const filteredCustomers = customerSearch
    ? customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
    : customers;

  const today = new Date().toISOString().split('T')[0];

  const validateForm = (): string | null => {
    if (!isEdit && !formData.customer_id) return 'Please select a customer.';
    const amount = Number(formData.total_amount);
    if (formData.total_amount && (isNaN(amount) || amount < 0))
      return 'Amount must be a positive number.';
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
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to save order. Please try again.';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Order' : 'New Order'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
          {!isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Customer *</label>
              <input
                type="text"
                placeholder="Search customers..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="mb-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select customer...</option>
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Box Type</label>
              <select
                value={formData.box_type}
                onChange={(e) => setFormData({ ...formData, box_type: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {BOX_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt.charAt(0).toUpperCase() + bt.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Amount (IDR)</label>
              <input
                type="number"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                min={!isEdit ? today : undefined}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Special Requests</label>
            <textarea
              value={formData.special_requests}
              onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Optional notes or special requests..."
            />
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
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderFormModal;
