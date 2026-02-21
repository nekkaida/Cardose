import React, { createContext, useContext, ReactNode } from 'react';
import { apiClient } from './AuthContext';
import type { DashboardData } from '@shared/types/analytics';
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
  orderStatsSchema,
  listResponseSchema,
  usersListResponseSchema,
  settingsListResponseSchema,
} from '../utils/apiValidation';

// NOTE: Shared types exist in @shared/types but most pages haven't been updated
// to consume them yet. Return types are `any` until pages are individually audited.
// The validateResponse() calls still provide runtime shape-mismatch warnings.

interface ApiContextType {
  // Orders
  getOrders: (params?: Record<string, any>) => Promise<any>;
  getOrderStats: () => Promise<any>;
  createOrder: (orderData: any) => Promise<any>;
  updateOrder: (id: string, updates: any) => Promise<any>;
  updateOrderStatus: (id: string, status: string) => Promise<any>;
  deleteOrder: (id: string) => Promise<any>;

  // Customers
  getCustomers: (params?: Record<string, any>) => Promise<any>;
  createCustomer: (customerData: any) => Promise<any>;
  updateCustomer: (id: string, updates: any) => Promise<any>;
  deleteCustomer: (id: string) => Promise<any>;

  // Inventory
  getInventory: (params?: Record<string, any>) => Promise<any>;
  getInventoryStats: () => Promise<any>;
  createInventoryItem: (itemData: any) => Promise<any>;
  updateInventoryItem: (id: string, updates: any) => Promise<any>;
  updateInventoryStock: (id: string, stockData: any) => Promise<any>;
  deleteInventoryItem: (id: string) => Promise<any>;
  createInventoryMovement: (movementData: any) => Promise<any>;

  // Financial
  getFinancialSummary: () => Promise<any>;
  getTransactions: (params?: Record<string, any>) => Promise<any>;
  createTransaction: (transactionData: any) => Promise<any>;
  calculatePricing: (pricingData: any) => Promise<any>;
  getInvoices: (params?: Record<string, any>) => Promise<any>;
  createInvoice: (invoiceData: any) => Promise<any>;
  updateInvoiceStatus: (id: string, status: string) => Promise<any>;

  // Analytics
  getDashboardAnalytics: (params?: Record<string, any>) => Promise<DashboardData>;
  getRevenueAnalytics: () => Promise<any>;
  getCustomerAnalytics: () => Promise<any>;
  getInventoryAnalytics: () => Promise<any>;
  getProductionAnalytics: () => Promise<any>;

  // Production
  getProductionBoard: () => Promise<any>;
  getProductionTasks: (params?: Record<string, any>) => Promise<any>;
  getProductionStats: () => Promise<any>;
  createProductionTask: (taskData: any) => Promise<any>;
  updateProductionTask: (id: string, updates: any) => Promise<any>;
  updateTaskStatus: (id: string, status: string) => Promise<any>;
  deleteProductionTask: (id: string) => Promise<any>;
  updateProductionStage: (id: string, stage: string, notes?: string) => Promise<any>;

  // Reports
  getSalesReport: (params?: Record<string, any>) => Promise<any>;
  getInventoryReport: () => Promise<any>;
  getProductionReport: (params?: Record<string, any>) => Promise<any>;
  getCustomerReport: () => Promise<any>;
  getFinancialReport: (params?: Record<string, any>) => Promise<any>;

  // Users
  getUsers: (params?: Record<string, any>) => Promise<any>;
  createUser: (userData: Record<string, any>) => Promise<any>;
  updateUser: (id: string, updates: Record<string, any>) => Promise<any>;
  updateUserStatus: (id: string, status: { is_active: boolean }) => Promise<any>;
  deleteUser: (id: string) => Promise<any>;

  // Settings
  getSettings: () => Promise<any>;
  updateSetting: (key: string, data: { value: string; description?: string }) => Promise<any>;
  deleteSetting: (key: string) => Promise<any>;

  // Dashboard
  getRecentOrders: (
    limit?: number
  ) => Promise<{
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
  const getOrders = async (params?: Record<string, any>) => {
    const response = await apiClient.get(`/orders`, { params });
    validateResponse(listResponseSchema, response.data, 'GET /orders');
    return response.data;
  };

  const getOrderStats = async () => {
    const response = await apiClient.get(`/orders/stats`);
    validateResponse(orderStatsSchema, response.data, 'GET /orders/stats');
    return response.data;
  };

  const createOrder = async (orderData: any) => {
    const response = await apiClient.post(`/orders`, orderData);
    return response.data;
  };

  const updateOrder = async (id: string, updates: any) => {
    const response = await apiClient.put(`/orders/${id}`, updates);
    return response.data;
  };

  const updateOrderStatus = async (id: string, status: string) => {
    const response = await apiClient.patch(`/orders/${id}/status`, { status });
    return response.data;
  };

  const deleteOrder = async (id: string) => {
    const response = await apiClient.delete(`/orders/${id}`);
    return response.data;
  };

  // Customers API
  const getCustomers = async (params?: Record<string, any>) => {
    const response = await apiClient.get(`/customers`, { params });
    validateResponse(listResponseSchema, response.data, 'GET /customers');
    return response.data;
  };

  const createCustomer = async (customerData: any) => {
    const response = await apiClient.post(`/customers`, customerData);
    return response.data;
  };

  const updateCustomer = async (id: string, updates: any) => {
    const response = await apiClient.put(`/customers/${id}`, updates);
    return response.data;
  };

  const deleteCustomer = async (id: string) => {
    const response = await apiClient.delete(`/customers/${id}`);
    return response.data;
  };

  // Inventory API
  const getInventory = async (params?: Record<string, any>) => {
    const response = await apiClient.get(`/inventory`, { params });
    validateResponse(listResponseSchema, response.data, 'GET /inventory');
    return response.data;
  };

  const getInventoryStats = async () => {
    const response = await apiClient.get(`/inventory/stats`);
    return response.data;
  };

  const createInventoryItem = async (itemData: any) => {
    const response = await apiClient.post(`/inventory`, itemData);
    return response.data;
  };

  const updateInventoryItem = async (id: string, updates: any) => {
    const response = await apiClient.put(`/inventory/${id}`, updates);
    return response.data;
  };

  const updateInventoryStock = async (id: string, stockData: any) => {
    const response = await apiClient.put(`/inventory/${id}/stock`, stockData);
    return response.data;
  };

  const deleteInventoryItem = async (id: string) => {
    const response = await apiClient.delete(`/inventory/${id}`);
    return response.data;
  };

  const createInventoryMovement = async (movementData: any) => {
    const response = await apiClient.post(`/inventory/movements`, movementData);
    return response.data;
  };

  // Financial API
  const getFinancialSummary = async () => {
    const response = await apiClient.get(`/financial/summary`);
    validateResponse(financialSummarySchema, response.data, 'GET /financial/summary');
    return response.data;
  };

  const getTransactions = async (params?: Record<string, any>) => {
    const response = await apiClient.get(`/financial/transactions`, { params });
    return response.data;
  };

  const createTransaction = async (transactionData: any) => {
    const response = await apiClient.post(`/financial/transactions`, transactionData);
    return response.data;
  };

  const calculatePricing = async (pricingData: any) => {
    const response = await apiClient.post(`/financial/calculate-price`, pricingData);
    return response.data;
  };

  const getInvoices = async (params?: Record<string, any>) => {
    const response = await apiClient.get(`/financial/invoices`, { params });
    return response.data;
  };

  const createInvoice = async (invoiceData: any) => {
    const response = await apiClient.post(`/financial/invoices`, invoiceData);
    return response.data;
  };

  const updateInvoiceStatus = async (id: string, status: string) => {
    const response = await apiClient.patch(`/financial/invoices/${id}/status`, { status });
    return response.data;
  };

  // Analytics API
  const getDashboardAnalytics = async (params?: Record<string, any>) => {
    const response = await apiClient.get(`/analytics/dashboard`, { params });
    return validateResponse(dashboardAnalyticsSchema, response.data, 'GET /analytics/dashboard');
  };

  const getRevenueAnalytics = async () => {
    const response = await apiClient.get(`/analytics/revenue-trend`);
    return response.data;
  };

  const getCustomerAnalytics = async () => {
    const response = await apiClient.get(`/analytics/customers`);
    return response.data;
  };

  const getInventoryAnalytics = async () => {
    const response = await apiClient.get(`/analytics/inventory`);
    return response.data;
  };

  const getProductionAnalytics = async () => {
    const response = await apiClient.get(`/analytics/production`);
    return response.data;
  };

  // Production API
  const getProductionBoard = async () => {
    const response = await apiClient.get(`/production/board`);
    validateResponse(productionBoardSchema, response.data, 'GET /production/board');
    return response.data;
  };

  const getProductionTasks = async (params?: Record<string, any>) => {
    const response = await apiClient.get(`/production/tasks`, { params });
    return response.data;
  };

  const getProductionStats = async () => {
    const response = await apiClient.get(`/production/stats`);
    validateResponse(productionStatsSchema, response.data, 'GET /production/stats');
    return response.data;
  };

  const createProductionTask = async (taskData: any) => {
    const response = await apiClient.post(`/production/tasks`, taskData);
    return response.data;
  };

  const updateProductionTask = async (id: string, updates: any) => {
    const response = await apiClient.put(`/production/tasks/${id}`, updates);
    return response.data;
  };

  const updateTaskStatus = async (id: string, status: string) => {
    const response = await apiClient.patch(`/production/tasks/${id}/status`, { status });
    return response.data;
  };

  const deleteProductionTask = async (id: string) => {
    const response = await apiClient.delete(`/production/tasks/${id}`);
    return response.data;
  };

  const updateProductionStage = async (id: string, stage: string, notes?: string) => {
    const response = await apiClient.patch(`/production/orders/${id}/stage`, { stage, notes });
    return response.data;
  };

  // Reports API
  const getSalesReport = async (params?: Record<string, any>) => {
    const response = await apiClient.get(`/reports/sales`, { params });
    validateResponse(salesReportResponseSchema, response.data, 'GET /reports/sales');
    return response.data;
  };

  const getInventoryReport = async () => {
    const response = await apiClient.get(`/reports/inventory`);
    validateResponse(inventoryReportResponseSchema, response.data, 'GET /reports/inventory');
    return response.data;
  };

  const getProductionReport = async (params?: Record<string, any>) => {
    const response = await apiClient.get(`/reports/production`, { params });
    validateResponse(productionReportResponseSchema, response.data, 'GET /reports/production');
    return response.data;
  };

  const getCustomerReport = async () => {
    const response = await apiClient.get(`/reports/customers`);
    validateResponse(customerReportResponseSchema, response.data, 'GET /reports/customers');
    return response.data;
  };

  const getFinancialReport = async (params?: Record<string, any>) => {
    const response = await apiClient.get(`/reports/financial`, { params });
    validateResponse(financialReportResponseSchema, response.data, 'GET /reports/financial');
    return response.data;
  };

  // Users API
  const getUsers = async (params?: Record<string, any>) => {
    const response = await apiClient.get(`/users`, { params });
    validateResponse(usersListResponseSchema, response.data, 'GET /users');
    return response.data;
  };

  const createUser = async (userData: Record<string, any>) => {
    const response = await apiClient.post(`/users`, userData);
    return response.data;
  };

  const updateUser = async (id: string, updates: Record<string, any>) => {
    const response = await apiClient.put(`/users/${id}`, updates);
    return response.data;
  };

  const updateUserStatus = async (id: string, status: { is_active: boolean }) => {
    const response = await apiClient.patch(`/users/${id}/status`, status);
    return response.data;
  };

  const deleteUser = async (id: string) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  };

  // Settings API
  const getSettings = async () => {
    const response = await apiClient.get(`/settings`);
    validateResponse(settingsListResponseSchema, response.data, 'GET /settings');
    return response.data;
  };

  const updateSetting = async (key: string, data: { value: string; description?: string }) => {
    const response = await apiClient.put(`/settings/${key}`, data);
    return response.data;
  };

  const deleteSetting = async (key: string) => {
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
