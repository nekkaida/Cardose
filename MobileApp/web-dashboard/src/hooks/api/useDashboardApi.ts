import { useCallback } from 'react';
import { apiClient } from '../../contexts/AuthContext';

export const useDashboardApi = () => {
  const getRecentOrders = useCallback(async (limit = 5) => {
    const response = await apiClient.get('/dashboard/recent-orders', { params: { limit } });
    return response.data;
  }, []);

  return {
    getRecentOrders,
  };
};
