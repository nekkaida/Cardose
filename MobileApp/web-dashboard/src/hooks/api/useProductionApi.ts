import { useCallback } from 'react';
import { apiClient } from '../../contexts/AuthContext';
import type { ApiResponse } from '@shared/types/api';
import type { OrderStatus } from '@shared/types/orders';
import type {
  ProductionBoardResponse,
  ProductionStatsResponse,
  ProductionTask,
  TaskStatus,
} from '@shared/types/production';
import {
  validateResponse,
  productionBoardSchema,
  productionStatsSchema,
} from '../../utils/apiValidation';

export const useProductionApi = () => {
  const getProductionBoard = useCallback(async (): Promise<ProductionBoardResponse> => {
    const response = await apiClient.get(`/production/board`);
    validateResponse(productionBoardSchema, response.data, 'GET /production/board');
    return response.data as ProductionBoardResponse;
  }, []);

  const getProductionTasks = useCallback(
    async (params?: Record<string, string | number>): Promise<ApiResponse<ProductionTask[]>> => {
      const response = await apiClient.get(`/production/tasks`, { params });
      return response.data;
    },
    []
  );

  const getProductionStats = useCallback(async (): Promise<ProductionStatsResponse> => {
    const response = await apiClient.get(`/production/stats`);
    validateResponse(productionStatsSchema, response.data, 'GET /production/stats');
    return response.data as ProductionStatsResponse;
  }, []);

  const createProductionTask = useCallback(
    async (
      taskData: Omit<ProductionTask, 'id' | 'created_at' | 'updated_at'>
    ): Promise<ApiResponse<ProductionTask>> => {
      const response = await apiClient.post(`/production/tasks`, taskData);
      return response.data;
    },
    []
  );

  const updateProductionTask = useCallback(
    async (
      id: string,
      updates: Partial<Omit<ProductionTask, 'id' | 'created_at' | 'updated_at'>>
    ): Promise<ApiResponse<ProductionTask>> => {
      const response = await apiClient.put(`/production/tasks/${id}`, updates);
      return response.data;
    },
    []
  );

  const updateTaskStatus = useCallback(
    async (id: string, status: TaskStatus): Promise<ApiResponse<ProductionTask>> => {
      const response = await apiClient.patch(`/production/tasks/${id}/status`, { status });
      return response.data;
    },
    []
  );

  const deleteProductionTask = useCallback(async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/production/tasks/${id}`);
    return response.data;
  }, []);

  const updateProductionStage = useCallback(
    async (id: string, stage: OrderStatus, notes?: string): Promise<ApiResponse> => {
      const response = await apiClient.patch(`/production/orders/${id}/stage`, { stage, notes });
      return response.data;
    },
    []
  );

  return {
    getProductionBoard,
    getProductionTasks,
    getProductionStats,
    createProductionTask,
    updateProductionTask,
    updateTaskStatus,
    deleteProductionTask,
    updateProductionStage,
  };
};
