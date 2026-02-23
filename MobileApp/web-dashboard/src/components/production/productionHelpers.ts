/**
 * Shared helper functions for production components.
 * Used by KanbanCard, OrderDetailDrawer, and ProductionPage.
 */

/** Check whether an order is past its due date. */
export const isOverdue = (dueDateStr: string | null | undefined): boolean => {
  if (!dueDateStr) return false;
  const due = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
};

/**
 * Calculate how long an order has been in its current stage.
 * Returns a compact label like "3d", "12h", or "<1h".
 */
export const getStageDuration = (
  stageEnteredAt: string | null | undefined,
  tr: (key: string, fallback: string) => string
): string | null => {
  if (!stageEnteredAt) return null;
  const entered = new Date(stageEnteredAt);
  const now = new Date();
  const diffMs = now.getTime() - entered.getTime();
  if (diffMs < 0) return null;

  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}${tr('production.days', 'd')}`;
  if (diffHours >= 1) return `${Math.floor(diffHours)}${tr('production.hours', 'h')}`;
  return tr('production.lessThanHour', '<1h');
};

/**
 * Centralized i18n key map for production features.
 * This eliminates scattered fallback strings and provides a single
 * source of truth for the English defaults.
 */
export const PRODUCTION_I18N: Record<string, string> = {
  'production.title': 'Production Management',
  'production.subtitle': 'Track production stages and manage workflows',
  'production.pending': 'Pending',
  'production.designing': 'Designing',
  'production.approved': 'Approved',
  'production.inProduction': 'In Production',
  'production.qualityControl': 'Quality Control',
  'production.activeOrders': 'Active Orders',
  'production.completedToday': 'Completed Today',
  'production.overdueOrders': 'Overdue Orders',
  'production.qualityIssues': 'Quality Issues',
  'production.qcStuckLabel': 'In QC > 2 days',
  'production.searchPlaceholder': 'Search orders...',
  'production.allPriorities': 'All Priorities',
  'production.urgent': 'Urgent',
  'production.high': 'High',
  'production.normal': 'Normal',
  'production.low': 'Low',
  'production.clearFilters': 'Clear filters',
  'production.noOrders': 'No orders in this stage',
  'production.dropHere': 'Drop here to move',
  'production.tapToMove': 'Tap a column to move',
  'production.tapToSelect': 'Tap a card, then tap a column',
  'production.noPermission': 'You do not have permission to move orders.',
  'production.invalidTransition': 'This move is not allowed from the current stage.',
  'production.moveSuccess': 'Order moved successfully',
  'production.moveFailed': 'Failed to move order. The change has been reverted.',
  'production.loadError': 'Failed to load production data. Please try again.',
  'production.partialError': 'Some production data could not be loaded.',
  'production.retry': 'Try Again',
  'production.refresh': 'Refresh',
  'production.secondsAgo': 's ago',
  'production.emptyTitle': 'No production orders yet',
  'production.emptyDescription':
    'Create orders to start tracking them through your production pipeline.',
  'production.goToOrders': 'Go to Orders',
  'production.moving': 'Moving...',
  'production.orderDetails': 'Order Details',
  'production.close': 'Close',
  'production.amount': 'Amount',
  'production.dueDate': 'Due Date',
  'production.overdue': 'Overdue',
  'production.notes': 'Notes',
  'production.specialRequests': 'Special Requests',
  'production.inStageFor': 'in stage for',
  'production.days': 'd',
  'production.hours': 'h',
  'production.lessThanHour': '<1h',
  'production.wipWarning': 'WIP limit reached',
  'production.invalidTransitionDetail': 'Cannot move from "{from}" to "{to}". Allowed: {allowed}.',
};
