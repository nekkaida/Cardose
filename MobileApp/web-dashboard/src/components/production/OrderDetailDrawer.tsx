import React, { useEffect, useRef, useCallback } from 'react';
import { formatCurrency } from '../../utils/formatters';
import type { ProductionOrder } from '@shared/types/production';
import { isOverdue, getStageDuration } from './productionHelpers';

// ---------------------------------------------------------------------------
// Priority badge
// ---------------------------------------------------------------------------

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  normal: 'bg-blue-100 text-blue-800',
  low: 'bg-gray-100 text-gray-800',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  designing: 'bg-blue-100 text-blue-800',
  approved: 'bg-emerald-100 text-emerald-800',
  production: 'bg-orange-100 text-orange-800',
  quality_control: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

// ---------------------------------------------------------------------------
// Focus trap helper
// ---------------------------------------------------------------------------

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// ---------------------------------------------------------------------------
// OrderDetailDrawer
// ---------------------------------------------------------------------------

interface OrderDetailDrawerProps {
  order: ProductionOrder;
  tr: (key: string, fallback: string) => string;
  dateLocale: string;
  onClose: () => void;
}

const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({
  order,
  tr,
  dateLocale,
  onClose,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Focus trap: keep Tab/Shift+Tab within the drawer
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const drawer = drawerRef.current;
      if (!drawer) return;

      const focusableElements = drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

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
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Auto-focus the close button on mount
  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    const firstFocusable = drawer.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();
  }, []);

  const overdue = isOverdue(order.due_date);
  const stageDuration = getStageDuration(order.stage_entered_at, tr);

  const statusLabel = tr(
    `production.${order.status === 'quality_control' ? 'qualityControl' : order.status}`,
    order.status
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={tr('production.orderDetails', 'Order Details')}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {tr('production.orderDetails', 'Order Details')}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label={tr('production.close', 'Close')}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Order number + badges */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900">{order.order_number}</h3>
            <p className="mt-1 text-sm text-gray-600">{order.customer_name}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
                }`}
              >
                {statusLabel}
              </span>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  PRIORITY_COLORS[order.priority] || PRIORITY_COLORS.low
                }`}
              >
                {tr(`production.${order.priority}`, order.priority)}
              </span>
              {stageDuration && (
                <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  {tr('production.inStageFor', 'in stage for')} {stageDuration}
                </span>
              )}
            </div>
          </div>

          {/* Detail fields */}
          <div className="space-y-4">
            <DetailRow
              label={tr('production.amount', 'Amount')}
              value={formatCurrency(order.total_amount)}
            />
            <DetailRow
              label={tr('production.dueDate', 'Due Date')}
              value={
                order.due_date ? (
                  <span className={overdue ? 'font-medium text-red-600' : ''}>
                    {new Date(order.due_date).toLocaleDateString(dateLocale, {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                    {overdue && (
                      <span className="ml-1.5 text-xs">
                        ({tr('production.overdue', 'Overdue')})
                      </span>
                    )}
                  </span>
                ) : (
                  '-'
                )
              }
            />
            {order.notes && (
              <DetailRow
                label={tr('production.notes', 'Notes')}
                value={<p className="whitespace-pre-wrap text-sm text-gray-700">{order.notes}</p>}
              />
            )}
            {order.special_requests && (
              <DetailRow
                label={tr('production.specialRequests', 'Special Requests')}
                value={
                  <p className="whitespace-pre-wrap text-sm text-gray-700">
                    {order.special_requests}
                  </p>
                }
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// DetailRow helper
// ---------------------------------------------------------------------------

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900">{value}</dd>
  </div>
);

export default OrderDetailDrawer;
