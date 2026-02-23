import { useCallback } from 'react';
import { apiClient } from '../../contexts/AuthContext';
import { validateResponse, recentOrdersResponseSchema } from '../../utils/apiValidation';

export interface RecentOrder {
  id: string;
  order_number?: string;
  customer_name?: string | null;
  status: string;
  priority?: string;
  total_amount?: number;
  created_at: string;
}

interface RecentOrdersResponse {
  success: boolean;
  orders: RecentOrder[];
}

export const useDashboardApi = () => {
  const getRecentOrders = useCallback(
    async (limit = 5, signal?: AbortSignal): Promise<RecentOrdersResponse> => {
      const response = await apiClient.get('/dashboard/recent-orders', {
        params: { limit },
        signal,
      });
      return validateResponse(
        recentOrdersResponseSchema,
        response.data,
        'GET /dashboard/recent-orders'
      );
    },
    []
  );

  return {
    getRecentOrders,
  };
};
