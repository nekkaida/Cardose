export const getLoyaltyColor = (status: string): string => {
  switch (status) {
    case 'vip':
      return 'bg-accent-100 text-accent-800';
    case 'regular':
      return 'bg-blue-100 text-blue-800';
    case 'new':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getBusinessColor = (type: string): string => {
  switch (type) {
    case 'corporate':
      return 'bg-blue-50 text-blue-700';
    case 'wedding':
      return 'bg-pink-50 text-pink-700';
    case 'event':
      return 'bg-purple-50 text-purple-700';
    case 'trading':
      return 'bg-amber-50 text-amber-700';
    case 'individual':
      return 'bg-gray-50 text-gray-700';
    default:
      return 'bg-gray-50 text-gray-700';
  }
};

export const getOrderStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'designing':
      return 'bg-indigo-100 text-indigo-800';
    case 'approved':
      return 'bg-teal-100 text-teal-800';
    case 'production':
    case 'in_production':
      return 'bg-orange-100 text-orange-800';
    case 'quality_control':
      return 'bg-cyan-100 text-cyan-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
};

/** Maps order status values to their i18n keys */
export const ORDER_STATUS_I18N: Record<string, string> = {
  pending: 'orders.statusPending',
  designing: 'orders.statusDesigning',
  approved: 'orders.statusApproved',
  production: 'orders.statusProduction',
  in_production: 'orders.statusProduction',
  quality_control: 'orders.statusQualityControl',
  completed: 'orders.statusCompleted',
  cancelled: 'orders.statusCancelled',
};
