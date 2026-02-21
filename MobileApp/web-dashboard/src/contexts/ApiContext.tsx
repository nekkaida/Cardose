import React, { createContext, useContext, ReactNode } from 'react';
import { apiClient } from './AuthContext';
import type { DashboardData, RevenueAnalytics, CustomerAnalytics } from '@shared/types/analytics';
import type { ApiResponse } from '@shared/types/api';
import type {
  CustomersListResponse,
  CustomerCreatePayload,
  CustomerUpdatePayload,
  Customer,
} from '@shared/types/customers';
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
import type {
  InventoryListResponse,
  InventoryStatsResponse,
  InventoryItem,
  InventoryMovementPayload,
  InventoryMovementResponse,
} from '@shared/types/inventory';
import type {
  Order,
  OrdersListResponse,
  OrderCreatePayload,
  OrderUpdatePayload,
  OrderStatsResponse,
  OrderStatus,
} from '@shared/types/orders';
import type {
  ProductionBoardResponse,
  ProductionStatsResponse,
  ProductionTask,
  TaskStatus,
} from '@shared/types/production';
import type {
  SalesReportData,
  InventoryReportData,
  ProductionReportData,
  CustomerReportData,
  FinancialReportData,
} from '@shared/types/reports';
import type { SettingsListResponse, UpdateSettingPayload } from '@shared/types/settings';
import type {
  UsersListResponse,
  CreateUserPayload,
  UpdateUserPayload,
  UserData,
} from '@shared/types/users';
import {
  validateResponse,
  salesReportResponseSchema,
  inventoryReportResponseSchema,
  productionReportResponseSchema,
  customerReportResponseSchema,
  financialReportResponseSchema,
  dashboardAnalyticsSchema,
  productionBoardSchema,
  productionStatsSchema,
  financialSummarySchema,
  inventoryMovementResponseSchema,
  createTransactionPayloadSchema,
  transactionsListSchema,
  customersListSchema,
  orderStatsResponseSchema,
  ordersListSchema,
  listResponseSchema,
  usersListResponseSchema,
  settingsListResponseSchema,
} from '../utils/apiValidation';

interface ApiContextType {
  // Orders
  getOrders: (params?: Record<string, string | number>) => Promise<OrdersListResponse>;
  getOrderStats: () => Promise<OrderStatsResponse>;
  createOrder: (orderData: OrderCreatePayload) => Promise<ApiResponse<Order>>;
  updateOrder: (id: string, updates: OrderUpdatePayload) => Promise<ApiResponse<Order>>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<ApiResponse<Order>>;
  deleteOrder: (id: string) => Promise<ApiResponse>;

  // Customers
  getCustomers: (params?: Record<string, string | number>) => Promise<CustomersListResponse>;
  createCustomer: (customerData: CustomerCreatePayload) => Promise<ApiResponse<Customer>>;
  updateCustomer: (id: string, updates: CustomerUpdatePayload) => Promise<ApiResponse<Customer>>;
  deleteCustomer: (id: string) => Promise<ApiResponse>;

  // Inventory
  getInventory: (params?: Record<string, string | number>) => Promise<InventoryListResponse>;
  getInventoryStats: () => Promise<InventoryStatsResponse>;
  createInventoryItem: (
    itemData: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<ApiResponse<InventoryItem>>;
  updateInventoryItem: (
    id: string,
    updates: Partial<Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>>
  ) => Promise<ApiResponse<InventoryItem>>;
  updateInventoryStock: (
    id: string,
    stockData: { quantity: number; type?: string; notes?: string }
  ) => Promise<ApiResponse<InventoryItem>>;
  deleteInventoryItem: (id: string) => Promise<ApiResponse>;
  createInventoryMovement: (
    movementData: InventoryMovementPayload
  ) => Promise<InventoryMovementResponse>;

  // Financial
  getFinancialSummary: () => Promise<FinancialSummaryResponse>;
  getTransactions: (params?: Record<string, string | number>) => Promise<TransactionsListResponse>;
  createTransaction: (
    transactionData: CreateTransactionPayload
  ) => Promise<ApiResponse<Transaction>>;
  calculatePricing: (pricingData: Record<string, unknown>) => Promise<ApiResponse>;
  getInvoices: (params?: Record<string, string | number>) => Promise<InvoicesListResponse>;
  createInvoice: (invoiceData: CreateInvoicePayload) => Promise<ApiResponse<Invoice>>;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<ApiResponse<Invoice>>;

  // Analytics
  getDashboardAnalytics: (params?: Record<string, string | number>) => Promise<DashboardData>;
  getRevenueAnalytics: () => Promise<RevenueAnalytics>;
  getCustomerAnalytics: () => Promise<CustomerAnalytics>;
  getInventoryAnalytics: () => Promise<InventoryStatsResponse>;
  getProductionAnalytics: () => Promise<ProductionStatsResponse>;

  // Production
  getProductionBoard: () => Promise<ProductionBoardResponse>;
  getProductionTasks: (
    params?: Record<string, string | number>
  ) => Promise<ApiResponse<ProductionTask[]>>;
  getProductionStats: () => Promise<ProductionStatsResponse>;
  createProductionTask: (
    taskData: Omit<ProductionTask, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<ApiResponse<ProductionTask>>;
  updateProductionTask: (
    id: string,
    updates: Partial<Omit<ProductionTask, 'id' | 'created_at' | 'updated_at'>>
  ) => Promise<ApiResponse<ProductionTask>>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<ApiResponse<ProductionTask>>;
  deleteProductionTask: (id: string) => Promise<ApiResponse>;
  updateProductionStage: (id: string, stage: OrderStatus, notes?: string) => Promise<ApiResponse>;

  // Reports
  getSalesReport: (
    params?: Record<string, string | number>
  ) => Promise<{ success: boolean; report: SalesReportData }>;
  getInventoryReport: () => Promise<{ success: boolean; report: InventoryReportData }>;
  getProductionReport: (
    params?: Record<string, string | number>
  ) => Promise<{ success: boolean; report: ProductionReportData }>;
  getCustomerReport: () => Promise<{ success: boolean; report: CustomerReportData }>;
  getFinancialReport: (
    params?: Record<string, string | number>
  ) => Promise<{ success: boolean; report: FinancialReportData }>;

  // Users
  getUsers: (params?: Record<string, string | number>) => Promise<UsersListResponse>;
  createUser: (userData: CreateUserPayload) => Promise<ApiResponse<UserData>>;
  updateUser: (id: string, updates: UpdateUserPayload) => Promise<ApiResponse<UserData>>;
  updateUserStatus: (id: string, status: { is_active: boolean }) => Promise<ApiResponse<UserData>>;
  deleteUser: (id: string) => Promise<ApiResponse>;

  // Settings
  getSettings: () => Promise<SettingsListResponse>;
  updateSetting: (key: string, data: UpdateSettingPayload) => Promise<ApiResponse>;
  deleteSetting: (key: string) => Promise<ApiResponse>;

  // Dashboard
  getRecentOrders: (limit?: number) => Promise<{
    orders: Array<{
      id: string;
      customer_name: string;
      total_amount: number;
      status: string;
      created_at: string;
    }>;
  }>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const useApi = () => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

interface ApiProviderProps {
  children: ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  // Orders API
  const getOrders = async (
    params?: Record<string, string | number>
  ): Promise<OrdersListResponse> => {
    const response = await apiClient.get(`/orders`, { params });
    validateResponse(ordersListSchema, response.data, 'GET /orders');
    return response.data as OrdersListResponse;
  };

  const getOrderStats = async (): Promise<OrderStatsResponse> => {
    const response = await apiClient.get(`/orders/stats`);
    validateResponse(orderStatsResponseSchema, response.data, 'GET /orders/stats');
    return response.data as OrderStatsResponse;
  };

  const createOrder = async (orderData: OrderCreatePayload): Promise<ApiResponse<Order>> => {
    const response = await apiClient.post(`/orders`, orderData);
    return response.data;
  };

  const updateOrder = async (
    id: string,
    updates: OrderUpdatePayload
  ): Promise<ApiResponse<Order>> => {
    const response = await apiClient.put(`/orders/${id}`, updates);
    return response.data;
  };

  const updateOrderStatus = async (
    id: string,
    status: OrderStatus
  ): Promise<ApiResponse<Order>> => {
    const response = await apiClient.patch(`/orders/${id}/status`, { status });
    return response.data;
  };

  const deleteOrder = async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/orders/${id}`);
    return response.data;
  };

  // Customers API
  const getCustomers = async (
    params?: Record<string, string | number>
  ): Promise<CustomersListResponse> => {
    const response = await apiClient.get(`/customers`, { params });
    validateResponse(customersListSchema, response.data, 'GET /customers');
    return response.data as CustomersListResponse;
  };

  const createCustomer = async (
    customerData: CustomerCreatePayload
  ): Promise<ApiResponse<Customer>> => {
    const response = await apiClient.post(`/customers`, customerData);
    return response.data;
  };

  const updateCustomer = async (
    id: string,
    updates: CustomerUpdatePayload
  ): Promise<ApiResponse<Customer>> => {
    const response = await apiClient.put(`/customers/${id}`, updates);
    return response.data;
  };

  const deleteCustomer = async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/customers/${id}`);
    return response.data;
  };

  // Inventory API
  const getInventory = async (
    params?: Record<string, string | number>
  ): Promise<InventoryListResponse> => {
    const response = await apiClient.get(`/inventory`, { params });
    validateResponse(listResponseSchema, response.data, 'GET /inventory');
    return response.data as InventoryListResponse;
  };

  const getInventoryStats = async (): Promise<InventoryStatsResponse> => {
    const response = await apiClient.get(`/inventory/stats`);
    return response.data as InventoryStatsResponse;
  };

  const createInventoryItem = async (
    itemData: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ApiResponse<InventoryItem>> => {
    const response = await apiClient.post(`/inventory`, itemData);
    return response.data;
  };

  const updateInventoryItem = async (
    id: string,
    updates: Partial<Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<ApiResponse<InventoryItem>> => {
    const response = await apiClient.put(`/inventory/${id}`, updates);
    return response.data;
  };

  const updateInventoryStock = async (
    id: string,
    stockData: { quantity: number; type?: string; notes?: string }
  ): Promise<ApiResponse<InventoryItem>> => {
    const response = await apiClient.put(`/inventory/${id}/stock`, stockData);
    return response.data;
  };

  const deleteInventoryItem = async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/inventory/${id}`);
    return response.data;
  };

  const createInventoryMovement = async (
    movementData: InventoryMovementPayload
  ): Promise<InventoryMovementResponse> => {
    const response = await apiClient.post(`/inventory/movements`, movementData);
    validateResponse(inventoryMovementResponseSchema, response.data, 'POST /inventory/movements');
    return response.data;
  };

  // Financial API
  const getFinancialSummary = async (): Promise<FinancialSummaryResponse> => {
    const response = await apiClient.get(`/financial/summary`);
    validateResponse(financialSummarySchema, response.data, 'GET /financial/summary');
    return response.data as FinancialSummaryResponse;
  };

  const getTransactions = async (
    params?: Record<string, string | number>
  ): Promise<TransactionsListResponse> => {
    const response = await apiClient.get(`/financial/transactions`, { params });
    validateResponse(transactionsListSchema, response.data, 'GET /financial/transactions');
    return response.data as TransactionsListResponse;
  };

  const createTransaction = async (
    transactionData: CreateTransactionPayload
  ): Promise<ApiResponse<Transaction>> => {
    validateResponse(
      createTransactionPayloadSchema,
      transactionData,
      'POST /financial/transactions (payload)'
    );
    const response = await apiClient.post(`/financial/transactions`, transactionData);
    return response.data;
  };

  const calculatePricing = async (pricingData: Record<string, unknown>): Promise<ApiResponse> => {
    const response = await apiClient.post(`/financial/calculate-price`, pricingData);
    return response.data;
  };

  const getInvoices = async (
    params?: Record<string, string | number>
  ): Promise<InvoicesListResponse> => {
    const response = await apiClient.get(`/financial/invoices`, { params });
    return response.data;
  };

  const createInvoice = async (
    invoiceData: CreateInvoicePayload
  ): Promise<ApiResponse<Invoice>> => {
    const response = await apiClient.post(`/financial/invoices`, invoiceData);
    return response.data;
  };

  const updateInvoiceStatus = async (
    id: string,
    status: InvoiceStatus
  ): Promise<ApiResponse<Invoice>> => {
    const response = await apiClient.patch(`/financial/invoices/${id}/status`, { status });
    return response.data;
  };

  // Analytics API
  const getDashboardAnalytics = async (params?: Record<string, string | number>) => {
    const response = await apiClient.get(`/analytics/dashboard`, { params });
    return validateResponse(dashboardAnalyticsSchema, response.data, 'GET /analytics/dashboard');
  };

  const getRevenueAnalytics = async (): Promise<RevenueAnalytics> => {
    const response = await apiClient.get(`/analytics/revenue-trend`);
    return response.data as RevenueAnalytics;
  };

  const getCustomerAnalytics = async (): Promise<CustomerAnalytics> => {
    const response = await apiClient.get(`/analytics/customers`);
    return response.data as CustomerAnalytics;
  };

  const getInventoryAnalytics = async (): Promise<InventoryStatsResponse> => {
    const response = await apiClient.get(`/analytics/inventory`);
    return response.data as InventoryStatsResponse;
  };

  const getProductionAnalytics = async (): Promise<ProductionStatsResponse> => {
    const response = await apiClient.get(`/analytics/production`);
    return response.data as ProductionStatsResponse;
  };

  // Production API
  const getProductionBoard = async (): Promise<ProductionBoardResponse> => {
    const response = await apiClient.get(`/production/board`);
    validateResponse(productionBoardSchema, response.data, 'GET /production/board');
    return response.data as ProductionBoardResponse;
  };

  const getProductionTasks = async (
    params?: Record<string, string | number>
  ): Promise<ApiResponse<ProductionTask[]>> => {
    const response = await apiClient.get(`/production/tasks`, { params });
    return response.data;
  };

  const getProductionStats = async (): Promise<ProductionStatsResponse> => {
    const response = await apiClient.get(`/production/stats`);
    validateResponse(productionStatsSchema, response.data, 'GET /production/stats');
    return response.data as ProductionStatsResponse;
  };

  const createProductionTask = async (
    taskData: Omit<ProductionTask, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ApiResponse<ProductionTask>> => {
    const response = await apiClient.post(`/production/tasks`, taskData);
    return response.data;
  };

  const updateProductionTask = async (
    id: string,
    updates: Partial<Omit<ProductionTask, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<ApiResponse<ProductionTask>> => {
    const response = await apiClient.put(`/production/tasks/${id}`, updates);
    return response.data;
  };

  const updateTaskStatus = async (
    id: string,
    status: TaskStatus
  ): Promise<ApiResponse<ProductionTask>> => {
    const response = await apiClient.patch(`/production/tasks/${id}/status`, { status });
    return response.data;
  };

  const deleteProductionTask = async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/production/tasks/${id}`);
    return response.data;
  };

  const updateProductionStage = async (
    id: string,
    stage: OrderStatus,
    notes?: string
  ): Promise<ApiResponse> => {
    const response = await apiClient.patch(`/production/orders/${id}/stage`, { stage, notes });
    return response.data;
  };

  // Reports API
  const getSalesReport = async (
    params?: Record<string, string | number>
  ): Promise<{ success: boolean; report: SalesReportData }> => {
    const response = await apiClient.get(`/reports/sales`, { params });
    validateResponse(salesReportResponseSchema, response.data, 'GET /reports/sales');
    return response.data;
  };

  const getInventoryReport = async (): Promise<{
    success: boolean;
    report: InventoryReportData;
  }> => {
    const response = await apiClient.get(`/reports/inventory`);
    validateResponse(inventoryReportResponseSchema, response.data, 'GET /reports/inventory');
    return response.data;
  };

  const getProductionReport = async (
    params?: Record<string, string | number>
  ): Promise<{ success: boolean; report: ProductionReportData }> => {
    const response = await apiClient.get(`/reports/production`, { params });
    validateResponse(productionReportResponseSchema, response.data, 'GET /reports/production');
    return response.data;
  };

  const getCustomerReport = async (): Promise<{ success: boolean; report: CustomerReportData }> => {
    const response = await apiClient.get(`/reports/customers`);
    validateResponse(customerReportResponseSchema, response.data, 'GET /reports/customers');
    return response.data;
  };

  const getFinancialReport = async (
    params?: Record<string, string | number>
  ): Promise<{ success: boolean; report: FinancialReportData }> => {
    const response = await apiClient.get(`/reports/financial`, { params });
    validateResponse(financialReportResponseSchema, response.data, 'GET /reports/financial');
    return response.data;
  };

  // Users API
  const getUsers = async (params?: Record<string, string | number>): Promise<UsersListResponse> => {
    const response = await apiClient.get(`/users`, { params });
    validateResponse(usersListResponseSchema, response.data, 'GET /users');
    return response.data as UsersListResponse;
  };

  const createUser = async (userData: CreateUserPayload): Promise<ApiResponse<UserData>> => {
    const response = await apiClient.post(`/users`, userData);
    return response.data;
  };

  const updateUser = async (
    id: string,
    updates: UpdateUserPayload
  ): Promise<ApiResponse<UserData>> => {
    const response = await apiClient.put(`/users/${id}`, updates);
    return response.data;
  };

  const updateUserStatus = async (
    id: string,
    status: { is_active: boolean }
  ): Promise<ApiResponse<UserData>> => {
    const response = await apiClient.patch(`/users/${id}/status`, status);
    return response.data;
  };

  const deleteUser = async (id: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  };

  // Settings API
  const getSettings = async (): Promise<SettingsListResponse> => {
    const response = await apiClient.get(`/settings`);
    validateResponse(settingsListResponseSchema, response.data, 'GET /settings');
    return response.data as SettingsListResponse;
  };

  const updateSetting = async (key: string, data: UpdateSettingPayload): Promise<ApiResponse> => {
    const response = await apiClient.put(`/settings/${key}`, data);
    return response.data;
  };

  const deleteSetting = async (key: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/settings/${key}`);
    return response.data;
  };

  // Dashboard API
  const getRecentOrders = async (limit = 5) => {
    const response = await apiClient.get('/dashboard/recent-orders', { params: { limit } });
    return response.data;
  };

  const value: ApiContextType = {
    // Orders
    getOrders,
    getOrderStats,
    createOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,

    // Customers
    getCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,

    // Inventory
    getInventory,
    getInventoryStats,
    createInventoryItem,
    updateInventoryItem,
    updateInventoryStock,
    deleteInventoryItem,
    createInventoryMovement,

    // Financial
    getFinancialSummary,
    getTransactions,
    createTransaction,
    calculatePricing,
    getInvoices,
    createInvoice,
    updateInvoiceStatus,

    // Analytics
    getDashboardAnalytics,
    getRevenueAnalytics,
    getCustomerAnalytics,
    getInventoryAnalytics,
    getProductionAnalytics,

    // Production
    getProductionBoard,
    getProductionTasks,
    getProductionStats,
    createProductionTask,
    updateProductionTask,
    updateTaskStatus,
    deleteProductionTask,
    updateProductionStage,

    // Reports
    getSalesReport,
    getInventoryReport,
    getProductionReport,
    getCustomerReport,
    getFinancialReport,

    // Users
    getUsers,
    createUser,
    updateUser,
    updateUserStatus,
    deleteUser,

    // Settings
    getSettings,
    updateSetting,
    deleteSetting,

    // Dashboard
    getRecentOrders,
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
};
