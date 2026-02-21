import { useCallback } from 'react';
import { apiClient } from '../../contexts/AuthContext';
import type { ApiResponse } from '@shared/types/api';
import type { SettingsListResponse, UpdateSettingPayload } from '@shared/types/settings';
import { validateResponse, settingsListResponseSchema } from '../../utils/apiValidation';

export const useSettingsApi = () => {
  const getSettings = useCallback(async (): Promise<SettingsListResponse> => {
    const response = await apiClient.get(`/settings`);
    validateResponse(settingsListResponseSchema, response.data, 'GET /settings');
    return response.data as SettingsListResponse;
  }, []);

  const updateSetting = useCallback(
    async (key: string, data: UpdateSettingPayload): Promise<ApiResponse> => {
      const response = await apiClient.put(`/settings/${key}`, data);
      return response.data;
    },
    []
  );

  const deleteSetting = useCallback(async (key: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/settings/${key}`);
    return response.data;
  }, []);

  return {
    getSettings,
    updateSetting,
    deleteSetting,
  };
};
