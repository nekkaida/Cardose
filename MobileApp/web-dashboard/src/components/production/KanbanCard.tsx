import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import type { ProductionOrder } from '@shared/types/production';
import { isOverdue, getStageDuration } from './productionHelpers';

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
// KanbanCard
// ---------------------------------------------------------------------------

export interface KanbanCardProps {
  order: ProductionOrder;
  isSelected: boolean;
  isDragged: boolean;
  isMoving: boolean;
  canMove: boolean;
  dateLocale: string;
  tr: (key: string, fallback: string) => string;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, order: ProductionOrder) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  onTap: (order: ProductionOrder) => void;
  onDetailClick: (order: ProductionOrder) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  order,
  isSelected,
  isDragged,
  isMoving,
  canMove,
  dateLocale,
  tr,
  onDragStart,
  onDragEnd,
  onTap,
  onDetailClick,
}) => {
  const overdue = isOverdue(order.due_date);
  const priorityLabel = tr(PRIORITY_KEYS[order.priority] || 'production.normal', order.priority);
  const stageDuration = getStageDuration(order.stage_entered_at, tr);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={canMove && !isMoving}
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
      className={`group relative rounded-lg border bg-gray-50 p-3 transition-all duration-150 ${
        canMove && !isMoving ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      } ${isDragged ? 'border-gray-200 opacity-40' : 'opacity-100'} ${
        isMoving ? 'animate-pulse border-primary-300 bg-primary-50' : ''
      } ${
        isSelected
          ? 'border-primary-400 bg-primary-50 ring-2 ring-primary-200'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Moving overlay */}
      {isMoving && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/60">
          <span className="text-xs font-medium text-primary-600">
            {tr('production.moving', 'Moving...')}
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-1">
        <span className="truncate text-sm font-medium text-gray-900">{order.order_number}</span>
        <div className="flex items-center gap-1">
          <span
            className={`inline-flex whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[order.priority] || PRIORITY_COLORS.low}`}
          >
            {priorityLabel}
          </span>
        </div>
      </div>

      <p className="mt-1 truncate text-xs text-gray-600">{order.customer_name}</p>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
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
              ? new Date(order.due_date).toLocaleDateString(dateLocale, {
                  day: '2-digit',
                  month: 'short',
                })
              : '-'}
          </span>
          {stageDuration && (
            <span className="rounded bg-gray-100 px-1 py-0.5 text-[9px] font-medium text-gray-500">
              {stageDuration}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium text-gray-700">
          {formatCurrency(order.total_amount)}
        </span>
      </div>

      {/* Detail button - visible on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDetailClick(order);
        }}
        className="absolute right-1.5 top-1.5 hidden rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 group-hover:block"
        aria-label={tr('production.orderDetails', 'Order Details')}
        title={tr('production.orderDetails', 'Order Details')}
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </div>
  );
};

export default KanbanCard;
