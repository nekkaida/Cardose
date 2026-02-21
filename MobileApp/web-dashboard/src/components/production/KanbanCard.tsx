import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import type { ProductionOrder } from '../../pages/ProductionPage';

// ---------------------------------------------------------------------------
// Priority constants
// ---------------------------------------------------------------------------

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

const isOverdue = (dueDateStr: string): boolean => {
  if (!dueDateStr) return false;
  const due = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
};

// ---------------------------------------------------------------------------
// KanbanCard
// ---------------------------------------------------------------------------

export interface KanbanCardProps {
  order: ProductionOrder;
  isSelected: boolean;
  isDragged: boolean;
  canMove: boolean;
  tr: (key: string, fallback: string) => string;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, order: ProductionOrder) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  onTap: (order: ProductionOrder) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  order,
  isSelected,
  isDragged,
  canMove,
  tr,
  onDragStart,
  onDragEnd,
  onTap,
}) => {
  const overdue = isOverdue(order.due_date);
  const priorityLabel = tr(PRIORITY_KEYS[order.priority] || 'production.normal', order.priority);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={canMove}
      onDragStart={(e) => onDragStart(e, order)}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onTap(order);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onTap(order);
        }
      }}
      className={`rounded-lg border bg-gray-50 p-3 transition-all duration-150 ${
        canMove ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      } ${isDragged ? 'border-gray-200 opacity-40' : 'opacity-100'} ${
        isSelected
          ? 'border-primary-400 bg-primary-50 ring-2 ring-primary-200'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="truncate text-sm font-medium text-gray-900">{order.order_number}</span>
        <span
          className={`inline-flex whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[order.priority] || PRIORITY_COLORS.low}`}
        >
          {priorityLabel}
        </span>
      </div>
      <p className="mt-1 truncate text-xs text-gray-600">{order.customer_name}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className={`text-[10px] font-medium ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
          {overdue && (
            <svg
              className="-mt-0.5 mr-0.5 inline h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          )}
          {order.due_date
            ? new Date(order.due_date).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
              })
            : '-'}
        </span>
        <span className="text-[10px] font-medium text-gray-700">
          {formatCurrency(order.total_amount)}
        </span>
      </div>
    </div>
  );
};

export default KanbanCard;
