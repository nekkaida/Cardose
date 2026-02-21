import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { OrderStatus } from '@shared/types/orders';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  designing: 'Designing',
  approved: 'Approved',
  production: 'Production',
  quality_control: 'Quality Control',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['designing', 'cancelled'],
  designing: ['approved', 'pending', 'cancelled'],
  approved: ['production', 'designing', 'cancelled'],
  production: ['quality_control', 'approved', 'cancelled'],
  quality_control: ['completed', 'production'],
  completed: [],
  cancelled: ['pending'],
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  designing: 'bg-blue-100 text-blue-800',
  approved: 'bg-purple-100 text-purple-800',
  production: 'bg-orange-100 text-orange-800',
  quality_control: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

interface StatusUpdateModalProps {
  open: boolean;
  currentStatus: string;
  orderNumber?: string;
  customerName?: string;
  onClose: () => void;
  onUpdate: (status: OrderStatus) => Promise<void>;
  updating: boolean;
}

const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  open,
  currentStatus,
  orderNumber,
  customerName,
  onClose,
  onUpdate,
  updating,
}) => {
  const { t } = useLanguage();
  const [newStatus, setNewStatus] = useState<OrderStatus>(currentStatus as OrderStatus);

  useEffect(() => {
    if (open) {
      setNewStatus(currentStatus as OrderStatus);
    }
  }, [open, currentStatus]);

  if (!open) return null;

  const typedCurrentStatus = currentStatus as OrderStatus;
  const allowedNext = ALLOWED_TRANSITIONS[typedCurrentStatus] || [];
  const isSameStatus = newStatus === typedCurrentStatus;
  const isTerminal = allowedNext.length === 0;
  const statusColor = STATUS_COLORS[typedCurrentStatus] || 'bg-gray-100 text-gray-800';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('orders.updateStatus')}</h2>
            {orderNumber && (
              <p className="text-sm text-gray-500">
                {orderNumber} &mdash; {customerName}
              </p>
            )}
          </div>
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
        <div className="space-y-3 p-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">{t('orders.statusCurrently')}:</span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor}`}
            >
              {STATUS_LABELS[typedCurrentStatus]}
            </span>
          </div>
          {isTerminal ? (
            <p className="text-sm text-amber-600">{t('orders.statusNoTransitions')}</p>
          ) : (
            <>
              <label className="block text-sm text-gray-500">{t('orders.statusChangeTo')}:</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={typedCurrentStatus}>{STATUS_LABELS[typedCurrentStatus]}</option>
                {allowedNext.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              {isSameStatus && (
                <p className="text-xs text-amber-500">{t('orders.statusSameWarning')}</p>
              )}
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onUpdate(newStatus)}
            disabled={updating || isSameStatus || isTerminal}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {updating ? 'Updating...' : t('orders.update')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusUpdateModal;
