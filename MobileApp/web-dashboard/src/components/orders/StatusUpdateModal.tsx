import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { OrderStatus } from '@shared/types/orders';
import { ALLOWED_TRANSITIONS, STATUS_COLORS, STATUS_I18N_KEYS } from './orderHelpers';

interface StatusUpdateModalProps {
  open: boolean;
  currentStatus: OrderStatus;
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
  const [newStatus, setNewStatus] = useState<OrderStatus>(currentStatus);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setNewStatus(currentStatus);
      setTimeout(() => closeRef.current?.focus(), 0);
    }
  }, [open, currentStatus]);

  // Focus trap + ESC
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !updating) {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
  }, [open, onClose, updating]);

  if (!open) return null;

  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
  const isSameStatus = newStatus === currentStatus;
  const isTerminal = allowedNext.length === 0;
  const statusColor = STATUS_COLORS[currentStatus] || 'bg-gray-100 text-gray-800';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 id="status-modal-title" className="text-lg font-semibold text-gray-900">
              {t('orders.updateStatus')}
            </h2>
            {orderNumber && (
              <p className="text-sm text-gray-500">
                {orderNumber} &mdash; {customerName}
              </p>
            )}
          </div>
          <button
            ref={closeRef}
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
        <div className="space-y-3 p-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">{t('orders.statusCurrently')}:</span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor}`}
            >
              {t(STATUS_I18N_KEYS[currentStatus])}
            </span>
          </div>
          {isTerminal ? (
            <p className="text-sm text-amber-600">{t('orders.statusNoTransitions')}</p>
          ) : (
            <>
              <label htmlFor="status-select" className="block text-sm text-gray-500">
                {t('orders.statusChangeTo')}:
              </label>
              <select
                id="status-select"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={currentStatus}>{t(STATUS_I18N_KEYS[currentStatus])}</option>
                {allowedNext.map((s) => (
                  <option key={s} value={s}>
                    {t(STATUS_I18N_KEYS[s])}
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
            {updating ? t('orders.updating') : t('orders.update')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusUpdateModal;
