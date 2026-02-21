import { useCallback } from 'react';
import { apiClient } from '../../contexts/AuthContext';
import type { DashboardData, RevenueAnalytics, CustomerAnalytics } from '@shared/types/analytics';
import type { InventoryStatsResponse } from '@shared/types/inventory';
import type { ProductionStatsResponse } from '@shared/types/production';
import { validateResponse, dashboardAnalyticsSchema } from '../../utils/apiValidation';

export const useAnalyticsApi = () => {
  const getDashboardAnalytics = useCallback(
    async (params?: Record<string, string | number>): Promise<DashboardData> => {
      const response = await apiClient.get(`/analytics/dashboard`, { params });
      return validateResponse(dashboardAnalyticsSchema, response.data, 'GET /analytics/dashboard');
    },
    []
  );

  const getRevenueAnalytics = useCallback(async (): Promise<RevenueAnalytics> => {
    const response = await apiClient.get(`/analytics/revenue-trend`);
    return response.data as RevenueAnalytics;
  }, []);

  const getCustomerAnalytics = useCallback(async (): Promise<CustomerAnalytics> => {
    const response = await apiClient.get(`/analytics/customers`);
    return response.data as CustomerAnalytics;
  }, []);

  const getInventoryAnalytics = useCallback(async (): Promise<InventoryStatsResponse> => {
    const response = await apiClient.get(`/analytics/inventory`);
    return response.data as InventoryStatsResponse;
  }, []);

  const getProductionAnalytics = useCallback(async (): Promise<ProductionStatsResponse> => {
    const response = await apiClient.get(`/analytics/production`);
    return response.data as ProductionStatsResponse;
  }, []);

  return {
    getDashboardAnalytics,
    getRevenueAnalytics,
    getCustomerAnalytics,
    getInventoryAnalytics,
    getProductionAnalytics,
  };
};
