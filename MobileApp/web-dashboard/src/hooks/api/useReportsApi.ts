import { useCallback } from 'react';
import { apiClient } from '../../contexts/AuthContext';
import type {
  SalesReportData,
  InventoryReportData,
  ProductionReportData,
  CustomerReportData,
  FinancialReportData,
} from '@shared/types/reports';
import {
  validateResponse,
  salesReportResponseSchema,
  inventoryReportResponseSchema,
  productionReportResponseSchema,
  customerReportResponseSchema,
  financialReportResponseSchema,
} from '../../utils/apiValidation';

export const useReportsApi = () => {
  const getSalesReport = useCallback(
    async (
      params?: Record<string, string | number>
    ): Promise<{ success: boolean; report: SalesReportData }> => {
      const response = await apiClient.get(`/reports/sales`, { params });
      validateResponse(salesReportResponseSchema, response.data, 'GET /reports/sales');
      return response.data;
    },
    []
  );

  const getInventoryReport = useCallback(async (): Promise<{
    success: boolean;
    report: InventoryReportData;
  }> => {
    const response = await apiClient.get(`/reports/inventory`);
    validateResponse(inventoryReportResponseSchema, response.data, 'GET /reports/inventory');
    return response.data;
  }, []);

  const getProductionReport = useCallback(
    async (
      params?: Record<string, string | number>
    ): Promise<{ success: boolean; report: ProductionReportData }> => {
      const response = await apiClient.get(`/reports/production`, { params });
      validateResponse(productionReportResponseSchema, response.data, 'GET /reports/production');
      return response.data;
    },
    []
  );

  const getCustomerReport = useCallback(async (): Promise<{
    success: boolean;
    report: CustomerReportData;
  }> => {
    const response = await apiClient.get(`/reports/customers`);
    validateResponse(customerReportResponseSchema, response.data, 'GET /reports/customers');
    return response.data;
  }, []);

  const getFinancialReport = useCallback(
    async (
      params?: Record<string, string | number>
    ): Promise<{ success: boolean; report: FinancialReportData }> => {
      const response = await apiClient.get(`/reports/financial`, { params });
      validateResponse(financialReportResponseSchema, response.data, 'GET /reports/financial');
      return response.data;
    },
    []
  );

  return {
    getSalesReport,
    getInventoryReport,
    getProductionReport,
    getCustomerReport,
    getFinancialReport,
  };
};
