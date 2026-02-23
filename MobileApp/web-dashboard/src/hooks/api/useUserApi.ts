import { useCallback } from 'react';
import { apiClient } from '../../contexts/AuthContext';
import type { ApiResponse } from '@shared/types/api';
import type {
  UsersListResponse,
  UsersListParams,
  CreateUserPayload,
  UpdateUserPayload,
  UserData,
} from '@shared/types/users';
import { validateResponse, usersListResponseSchema } from '../../utils/apiValidation';

export const useUserApi = () => {
  const getUsers = useCallback(async (params?: UsersListParams): Promise<UsersListResponse> => {
    const response = await apiClient.get(`/users`, { params });
    // Normalize is_active from SQLite integer (0/1) to boolean
    const raw = response.data;
    const normalized = {
      ...raw,
      users: (raw.users || []).map((u: Record<string, unknown>) => ({
        ...u,
        is_active: Boolean(u.is_active),
      })),
    };
    validateResponse(usersListResponseSchema, normalized, 'GET /users');
    return normalized as UsersListResponse;
  }, []);

  const createUser = useCallback(
    async (userData: CreateUserPayload): Promise<ApiResponse<UserData>> => {
      const response = await apiClient.post(`/users`, userData);
      return response.data;
    },
    []
  );

  const updateUser = useCallback(
    async (id: string, updates: UpdateUserPayload): Promise<ApiResponse<UserData>> => {
      const response = await apiClient.put(`/users/${id}`, updates);
      return response.data;
    },
    []
  );

  const updateUserStatus = useCallback(
    async (id: string, status: { is_active: boolean }): Promise<ApiResponse<UserData>> => {
      const response = await apiClient.patch(`/users/${id}/status`, status);
      return response.data;
    },
    []
  );

  const deleteUser = useCallback(async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  }, []);

  return {
    getUsers,
    createUser,
    updateUser,
    updateUserStatus,
    deleteUser,
  };
};
