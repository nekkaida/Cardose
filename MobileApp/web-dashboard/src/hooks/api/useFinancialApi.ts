import { useCallback } from 'react';
import { apiClient } from '../../contexts/AuthContext';
import type { ApiResponse } from '@shared/types/api';
import type {
  CreateTransactionPayload,
  TransactionsListResponse,
  Transaction,
  FinancialSummaryResponse,
  Invoice,
  InvoicesListResponse,
  CreateInvoicePayload,
  InvoiceStatus,
} from '@shared/types/financial';
import {
  validateResponse,
  financialSummarySchema,
  transactionsListSchema,
  createTransactionPayloadSchema,
} from '../../utils/apiValidation';

export const useFinancialApi = () => {
  const getFinancialSummary = useCallback(async (): Promise<FinancialSummaryResponse> => {
    const response = await apiClient.get(`/financial/summary`);
    validateResponse(financialSummarySchema, response.data, 'GET /financial/summary');
    return response.data as FinancialSummaryResponse;
  }, []);

  const getTransactions = useCallback(
    async (params?: Record<string, string | number>): Promise<TransactionsListResponse> => {
      const response = await apiClient.get(`/financial/transactions`, { params });
      validateResponse(transactionsListSchema, response.data, 'GET /financial/transactions');
      return response.data as TransactionsListResponse;
    },
    []
  );

  const createTransaction = useCallback(
    async (transactionData: CreateTransactionPayload): Promise<ApiResponse<Transaction>> => {
      validateResponse(
        createTransactionPayloadSchema,
        transactionData,
        'POST /financial/transactions (payload)'
      );
      const response = await apiClient.post(`/financial/transactions`, transactionData);
      return response.data;
    },
    []
  );

  const calculatePricing = useCallback(
    async (pricingData: Record<string, unknown>): Promise<ApiResponse> => {
      const response = await apiClient.post(`/financial/calculate-price`, pricingData);
      return response.data;
    },
    []
  );

  const getInvoices = useCallback(
    async (params?: Record<string, string | number>): Promise<InvoicesListResponse> => {
      const response = await apiClient.get(`/financial/invoices`, { params });
      return response.data;
    },
    []
  );

  const createInvoice = useCallback(
    async (invoiceData: CreateInvoicePayload): Promise<ApiResponse<Invoice>> => {
      const response = await apiClient.post(`/financial/invoices`, invoiceData);
      return response.data;
    },
    []
  );

  const updateInvoiceStatus = useCallback(
    async (id: string, status: InvoiceStatus): Promise<ApiResponse<Invoice>> => {
      const response = await apiClient.patch(`/financial/invoices/${id}/status`, { status });
      return response.data;
    },
    []
  );

  return {
    getFinancialSummary,
    getTransactions,
    createTransaction,
    calculatePricing,
    getInvoices,
    createInvoice,
    updateInvoiceStatus,
  };
};
