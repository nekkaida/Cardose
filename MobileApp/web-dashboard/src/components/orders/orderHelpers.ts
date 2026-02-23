import type { OrderStatus, OrderPriority, BoxType } from '@shared/types/orders';

// Re-export shared types for convenience
export type { OrderStatus, OrderPriority, BoxType };

// ── Local UI types ──────────────────────────────────────────────────────────

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerId: string;
  status: OrderStatus;
  priority: OrderPriority;
  totalAmount: number;
  dueDate: string;
  createdAt: string;
  boxType: string;
  specialRequests: string;
}

export interface OrderStatsData {
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

export interface Customer {
  id: string;
  name: string;
}

// ── Constants (single source of truth) ──────────────────────────────────────

export const STATUSES: readonly OrderStatus[] = [
  'pending',
  'designing',
  'approved',
  'production',
  'quality_control',
  'completed',
  'cancelled',
] as const;

export const PRIORITIES: readonly OrderPriority[] = ['low', 'normal', 'high', 'urgent'] as const;

export const BOX_TYPES: readonly BoxType[] = ['standard', 'premium', 'luxury', 'custom'] as const;

/** i18n key map for status labels */
export const STATUS_I18N_KEYS: Record<OrderStatus, string> = {
  pending: 'orders.statusPending',
  designing: 'orders.statusDesigning',
  approved: 'orders.statusApproved',
  production: 'orders.statusProduction',
  quality_control: 'orders.statusQC',
  completed: 'orders.statusCompleted',
  cancelled: 'orders.statusCancelled',
};

/** i18n key map for priority labels */
export const PRIORITY_I18N_KEYS: Record<OrderPriority, string> = {
  low: 'orders.priorityLow',
  normal: 'orders.priorityNormal',
  high: 'orders.priorityHigh',
  urgent: 'orders.priorityUrgent',
};

/** i18n key map for box type labels */
export const BOX_TYPE_I18N_KEYS: Record<BoxType, string> = {
  standard: 'orders.boxStandard',
  premium: 'orders.boxPremium',
  luxury: 'orders.boxLuxury',
  custom: 'orders.boxCustom',
};

/** English fallback labels (used for CSV export, non-i18n contexts) */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  designing: 'Designing',
  approved: 'Approved',
  production: 'Production',
  quality_control: 'Quality Control',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PRIORITY_LABELS: Record<OrderPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

// ── Status transition state machine (single source of truth) ────────────────

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['designing', 'cancelled'],
  designing: ['approved', 'pending', 'cancelled'],
  approved: ['production', 'designing', 'cancelled'],
  production: ['quality_control', 'approved', 'cancelled'],
  quality_control: ['completed', 'production'],
  completed: [],
  cancelled: ['pending'],
};

// ── Color mappings ──────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  designing: 'bg-blue-100 text-blue-800',
  approved: 'bg-purple-100 text-purple-800',
  production: 'bg-orange-100 text-orange-800',
  quality_control: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status as OrderStatus] || 'bg-gray-100 text-gray-800';
};

export const PRIORITY_COLORS: Record<OrderPriority, string> = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  normal: 'bg-blue-100 text-blue-800',
  low: 'bg-gray-100 text-gray-800',
};

export const getPriorityColor = (priority: string): string => {
  return PRIORITY_COLORS[priority as OrderPriority] || 'bg-gray-100 text-gray-800';
};

// ── Utilities ───────────────────────────────────────────────────────────────

export const isOverdue = (order: Order): boolean => {
  if (!order.dueDate || order.status === 'completed' || order.status === 'cancelled') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Date-only strings ("2025-02-01") are parsed as UTC by spec.
  // Append T00:00:00 so the Date constructor treats them as local time,
  // preventing off-by-one errors in UTC+ timezones (e.g. Indonesia).
  const dueStr = order.dueDate.length === 10 ? order.dueDate + 'T00:00:00' : order.dueDate;
  const due = new Date(dueStr);
  due.setHours(0, 0, 0, 0);
  return due < today;
};

export const EMPTY_STATS: OrderStatsData = {
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
};
