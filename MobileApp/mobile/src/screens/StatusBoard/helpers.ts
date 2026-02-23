import { startOfDay, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { StatusOption, Order, OrderPriority, PRIORITIES } from './types';
import { theme } from '../../theme/theme';

export const getStatusColor = (statuses: StatusOption[], status: string): string => {
  return statuses.find(s => s.value === status)?.color || theme.colors.disabled;
};

export const getStatusLabel = (statuses: StatusOption[], status: string): string => {
  return statuses.find(s => s.value === status)?.label || status;
};

/**
 * Check if an order is overdue.
 * Compares against the start of the due date vs start of today,
 * so orders due "today" are NOT marked overdue until tomorrow.
 */
export const isOverdue = (dueDate: string | null | undefined): boolean => {
  if (!dueDate) return false;
  try {
    const due = startOfDay(new Date(dueDate));
    const today = startOfDay(new Date());
    return due < today;
  } catch {
    return false;
  }
};

/**
 * Format a date string for display using Indonesian locale.
 */
export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), 'd MMM yyyy', { locale: idLocale });
  } catch {
    return dateStr;
  }
};

/**
 * Format an amount as Indonesian Rupiah.
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Get priority display configuration.
 */
export const getPriorityConfig = (priority: OrderPriority) => {
  return PRIORITIES.find(p => p.value === priority) || PRIORITIES[1]; // default: 'normal'
};

/**
 * Filter orders by search query (matches order_number and customer_name).
 */
export const filterOrders = (orders: Order[], query: string): Order[] => {
  if (!query.trim()) return orders;
  const q = query.toLowerCase().trim();
  return orders.filter(
    o =>
      o.order_number.toLowerCase().includes(q) ||
      (o.customer_name?.toLowerCase().includes(q) ?? false),
  );
};
