import { useCallback } from 'react';
import { apiClient } from '../../contexts/AuthContext';
import type { ApiResponse } from '@shared/types/api';
import type {
  InventoryListResponse,
  InventoryItem,
  InventoryMovementPayload,
  InventoryMovementResponse,
  InventoryMovementsListResponse,
  ReorderAlertsResponse,
} from '@shared/types/inventory';
import {
  validateResponse,
  inventoryListResponseSchema,
  inventoryMovementResponseSchema,
} from '../../utils/apiValidation';

export const useInventoryApi = () => {
  const getInventory = useCallback(
    async (params?: Record<string, string | number>): Promise<InventoryListResponse> => {
      const response = await apiClient.get(`/inventory`, { params });
      validateResponse(inventoryListResponseSchema, response.data, 'GET /inventory');
      return response.data as InventoryListResponse;
    },
    []
  );

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

  const deleteInventoryItem = useCallback(async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/inventory/${id}`);
    return response.data;
  }, []);

  const bulkDeleteInventoryItems = useCallback(async (ids: string[]): Promise<ApiResponse> => {
    const results = await Promise.allSettled(ids.map((id) => apiClient.delete(`/inventory/${id}`)));
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      throw new Error(`Failed to delete ${failed} of ${ids.length} items`);
    }
    return { success: true };
  }, []);

  const createInventoryMovement = useCallback(
    async (movementData: InventoryMovementPayload): Promise<InventoryMovementResponse> => {
      const response = await apiClient.post(`/inventory/movements`, movementData);
      validateResponse(inventoryMovementResponseSchema, response.data, 'POST /inventory/movements');
      return response.data;
    },
    []
  );

  const getInventoryMovements = useCallback(
    async (params?: Record<string, string | number>): Promise<InventoryMovementsListResponse> => {
      const response = await apiClient.get(`/inventory/movements`, { params });
      return response.data as InventoryMovementsListResponse;
    },
    []
  );

  const getReorderAlerts = useCallback(
    async (params?: Record<string, string>): Promise<ReorderAlertsResponse> => {
      const response = await apiClient.get(`/inventory/reorder-alerts`, { params });
      return response.data as ReorderAlertsResponse;
    },
    []
  );

  return {
    getInventory,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    bulkDeleteInventoryItems,
    createInventoryMovement,
    getInventoryMovements,
    getReorderAlerts,
  };
};
