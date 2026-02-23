import { useCallback } from 'react';
import { apiClient } from '../../contexts/AuthContext';
import type { DashboardData, RevenueAnalytics, CustomerAnalytics } from '@shared/types/analytics';
import {
  validateResponse,
  dashboardAnalyticsSchema,
  revenueAnalyticsSchema,
  customerAnalyticsSchema,
} from '../../utils/apiValidation';

export const useAnalyticsApi = () => {
  const getDashboardAnalytics = useCallback(
    async (
      params?: Record<string, string | number>,
      signal?: AbortSignal
    ): Promise<DashboardData> => {
      const response = await apiClient.get('/analytics/dashboard', { params, signal });
      return validateResponse(dashboardAnalyticsSchema, response.data, 'GET /analytics/dashboard');
    },
    []
  );

  const getRevenueAnalytics = useCallback(
    async (
      params?: Record<string, string | number>,
      signal?: AbortSignal
    ): Promise<RevenueAnalytics> => {
      const response = await apiClient.get('/analytics/revenue-trend', { params, signal });
      return validateResponse(
        revenueAnalyticsSchema,
        response.data,
        'GET /analytics/revenue-trend'
      );
    },
    []
  );

  const getCustomerAnalytics = useCallback(
    async (
      params?: Record<string, string | number>,
      signal?: AbortSignal
    ): Promise<CustomerAnalytics> => {
      const response = await apiClient.get('/analytics/customers', { params, signal });
      return validateResponse(customerAnalyticsSchema, response.data, 'GET /analytics/customers');
    },
    []
  );

  return {
    getDashboardAnalytics,
    getRevenueAnalytics,
    getCustomerAnalytics,
  };
};
