import { useCallback } from 'react';
import { apiClient } from '../../contexts/AuthContext';
import type { ApiResponse } from '@shared/types/api';
import type {
  Order,
  OrdersListResponse,
  OrderCreatePayload,
  OrderUpdatePayload,
  OrderStatsResponse,
  OrderStatus,
} from '@shared/types/orders';
import {
  validateResponse,
  ordersListSchema,
  orderStatsResponseSchema,
} from '../../utils/apiValidation';

export const useOrderApi = () => {
  const getOrders = useCallback(
    async (params?: Record<string, string | number>): Promise<OrdersListResponse> => {
      const response = await apiClient.get(`/orders`, { params });
      validateResponse(ordersListSchema, response.data, 'GET /orders');
      return response.data as OrdersListResponse;
    },
    []
  );

  const getOrderStats = useCallback(async (): Promise<OrderStatsResponse> => {
    const response = await apiClient.get(`/orders/stats`);
    validateResponse(orderStatsResponseSchema, response.data, 'GET /orders/stats');
    return response.data as OrderStatsResponse;
  }, []);

  const createOrder = useCallback(
    async (orderData: OrderCreatePayload): Promise<ApiResponse<Order>> => {
      const response = await apiClient.post(`/orders`, orderData);
      return response.data;
    },
    []
  );

  const updateOrder = useCallback(
    async (id: string, updates: OrderUpdatePayload): Promise<ApiResponse<Order>> => {
      const response = await apiClient.put(`/orders/${id}`, updates);
      return response.data;
    },
    []
  );

  const updateOrderStatus = useCallback(
    async (id: string, status: OrderStatus): Promise<ApiResponse<Order>> => {
      const response = await apiClient.patch(`/orders/${id}/status`, { status });
      return response.data;
    },
    []
  );

  const deleteOrder = useCallback(async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/orders/${id}`);
    return response.data;
  }, []);

  return {
    getOrders,
    getOrderStats,
    createOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
  };
};
