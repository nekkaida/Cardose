import { useCallback } from 'react';
import { apiClient } from '../../contexts/AuthContext';
import type { ApiResponse } from '@shared/types/api';
import type {
  CustomersListResponse,
  CustomerDetailResponse,
  CustomerCreatePayload,
  CustomerUpdatePayload,
  Customer,
} from '@shared/types/customers';
import {
  validateResponse,
  customersListSchema,
  customerDetailSchema,
} from '../../utils/apiValidation';

export const useCustomerApi = () => {
  const getCustomers = useCallback(
    async (params?: Record<string, string | number>): Promise<CustomersListResponse> => {
      const response = await apiClient.get(`/customers`, { params });
      validateResponse(customersListSchema, response.data, 'GET /customers');
      return response.data as CustomersListResponse;
    },
    []
  );

  const getCustomer = useCallback(async (id: string): Promise<CustomerDetailResponse> => {
    const response = await apiClient.get(`/customers/${id}`);
    validateResponse(customerDetailSchema, response.data, `GET /customers/${id}`);
    return response.data as CustomerDetailResponse;
  }, []);

  const createCustomer = useCallback(
    async (customerData: CustomerCreatePayload): Promise<ApiResponse<Customer>> => {
      const response = await apiClient.post(`/customers`, customerData);
      return response.data;
    },
    []
  );

  const updateCustomer = useCallback(
    async (id: string, updates: CustomerUpdatePayload): Promise<ApiResponse<Customer>> => {
      const response = await apiClient.put(`/customers/${id}`, updates);
      return response.data;
    },
    []
  );

  const deleteCustomer = useCallback(async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/customers/${id}`);
    return response.data;
  }, []);

  return {
    getCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
};
