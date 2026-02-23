import { useCallback } from 'react';
import { apiClient } from '../../contexts/AuthContext';
import type { ApiResponse } from '@shared/types/api';
import type { SettingsListResponse, UpdateSettingPayload } from '@shared/types/settings';
import { validateResponse, settingsListResponseSchema } from '../../utils/apiValidation';
import { z } from 'zod';

// Lightweight schema for mutation responses (update/delete/batch)
const mutationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export const useSettingsApi = () => {
  const getSettings = useCallback(async (): Promise<SettingsListResponse> => {
    const response = await apiClient.get(`/settings`);
    validateResponse(settingsListResponseSchema, response.data, 'GET /settings');
    return response.data as SettingsListResponse;
  }, []);

  const updateSetting = useCallback(
    async (key: string, data: UpdateSettingPayload): Promise<ApiResponse> => {
      const response = await apiClient.put(`/settings/${key}`, data);
      validateResponse(mutationResponseSchema, response.data, `PUT /settings/${key}`);
      return response.data;
    },
    []
  );

  const deleteSetting = useCallback(async (key: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/settings/${key}`);
    validateResponse(mutationResponseSchema, response.data, `DELETE /settings/${key}`);
    return response.data;
  }, []);

  const batchUpdateSettings = useCallback(
    async (
      settings: Record<string, string | { value: string; description?: string | null }>
    ): Promise<ApiResponse> => {
      const response = await apiClient.post(`/settings/batch`, { settings });
      validateResponse(mutationResponseSchema, response.data, 'POST /settings/batch');
      return response.data;
    },
    []
  );

  return {
    getSettings,
    updateSetting,
    deleteSetting,
    batchUpdateSettings,
  };
};
