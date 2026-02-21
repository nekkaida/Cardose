import { useCallback } from 'react';
import { apiClient } from '../../contexts/AuthContext';
import type { ApiResponse } from '@shared/types/api';
import type {
  InventoryListResponse,
  InventoryStatsResponse,
  InventoryItem,
  InventoryMovementPayload,
  InventoryMovementResponse,
} from '@shared/types/inventory';
import {
  validateResponse,
  listResponseSchema,
  inventoryMovementResponseSchema,
} from '../../utils/apiValidation';

export const useInventoryApi = () => {
  const getInventory = useCallback(
    async (params?: Record<string, string | number>): Promise<InventoryListResponse> => {
      const response = await apiClient.get(`/inventory`, { params });
      validateResponse(listResponseSchema, response.data, 'GET /inventory');
      return response.data as InventoryListResponse;
    },
    []
  );

  const getInventoryStats = useCallback(async (): Promise<InventoryStatsResponse> => {
    const response = await apiClient.get(`/inventory/stats`);
    return response.data as InventoryStatsResponse;
  }, []);

  const createInventoryItem = useCallback(
    async (
      itemData: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>
    ): Promise<ApiResponse<InventoryItem>> => {
      const response = await apiClient.post(`/inventory`, itemData);
      return response.data;
    },
    []
  );

  const updateInventoryItem = useCallback(
    async (
      id: string,
      updates: Partial<Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>>
    ): Promise<ApiResponse<InventoryItem>> => {
      const response = await apiClient.put(`/inventory/${id}`, updates);
      return response.data;
    },
    []
  );

  const updateInventoryStock = useCallback(
    async (
      id: string,
      stockData: { quantity: number; type?: string; notes?: string }
    ): Promise<ApiResponse<InventoryItem>> => {
      const response = await apiClient.put(`/inventory/${id}/stock`, stockData);
      return response.data;
    },
    []
  );

  const deleteInventoryItem = useCallback(async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/inventory/${id}`);
    return response.data;
  }, []);

  const createInventoryMovement = useCallback(
    async (movementData: InventoryMovementPayload): Promise<InventoryMovementResponse> => {
      const response = await apiClient.post(`/inventory/movements`, movementData);
      validateResponse(inventoryMovementResponseSchema, response.data, 'POST /inventory/movements');
      return response.data;
    },
    []
  );

  return {
    getInventory,
    getInventoryStats,
    createInventoryItem,
    updateInventoryItem,
    updateInventoryStock,
    deleteInventoryItem,
    createInventoryMovement,
  };
};
