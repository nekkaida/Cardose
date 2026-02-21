export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerId: string;
  status: string;
  priority: string;
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

export const STATUSES = [
  'pending',
  'designing',
  'approved',
  'production',
  'quality_control',
  'completed',
  'cancelled',
] as const;

export const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  designing: 'Designing',
  approved: 'Approved',
  production: 'Production',
  quality_control: 'Quality Control',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'designing':
      return 'bg-blue-100 text-blue-800';
    case 'approved':
      return 'bg-purple-100 text-purple-800';
    case 'production':
      return 'bg-orange-100 text-orange-800';
    case 'quality_control':
      return 'bg-amber-100 text-amber-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'normal':
      return 'bg-blue-100 text-blue-800';
    case 'low':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const isOverdue = (order: Order): boolean => {
  if (!order.dueDate || order.status === 'completed' || order.status === 'cancelled') return false;
  return new Date(order.dueDate) < new Date(new Date().toDateString());
};
