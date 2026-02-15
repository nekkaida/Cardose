import React, { createContext, useContext, ReactNode } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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
  getTransactions: () => Promise<any>;
  createTransaction: (transactionData: any) => Promise<any>;
  calculatePricing: (pricingData: any) => Promise<any>;
  getInvoices: (params?: Record<string, any>) => Promise<any>;
  createInvoice: (invoiceData: any) => Promise<any>;
  updateInvoiceStatus: (id: string, status: string) => Promise<any>;

  // Analytics
  getDashboardAnalytics: () => Promise<any>;
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

  // Reports
  getSalesReport: (params?: Record<string, any>) => Promise<any>;
  getInventoryReport: () => Promise<any>;
  getProductionReport: () => Promise<any>;
  getCustomerReport: () => Promise<any>;
  getFinancialReport: () => Promise<any>;

  // Users
  getUsers: (params?: Record<string, any>) => Promise<any>;
  createUser: (userData: any) => Promise<any>;
  updateUser: (id: string, updates: any) => Promise<any>;
  updateUserStatus: (id: string, status: any) => Promise<any>;
  deleteUser: (id: string) => Promise<any>;

  // Settings
  getSettings: () => Promise<any>;
  updateSetting: (key: string, data: any) => Promise<any>;
  deleteSetting: (key: string) => Promise<any>;
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
    const response = await api.get(`/orders`, { params });
    return response.data;
  };

  const getOrderStats = async () => {
    const response = await api.get(`/orders/stats`);
    return response.data;
  };

  const createOrder = async (orderData: any) => {
    const response = await api.post(`/orders`, orderData);
    return response.data;
  };

  const updateOrder = async (id: string, updates: any) => {
    const response = await api.put(`/orders/${id}`, updates);
    return response.data;
  };

  const updateOrderStatus = async (id: string, status: string) => {
    const response = await api.patch(`/orders/${id}/status`, { status });
    return response.data;
  };

  const deleteOrder = async (id: string) => {
    const response = await api.delete(`/orders/${id}`);
    return response.data;
  };

  // Customers API
  const getCustomers = async (params?: Record<string, any>) => {
    const response = await api.get(`/customers`, { params });
    return response.data;
  };

  const createCustomer = async (customerData: any) => {
    const response = await api.post(`/customers`, customerData);
    return response.data;
  };

  const updateCustomer = async (id: string, updates: any) => {
    const response = await api.put(`/customers/${id}`, updates);
    return response.data;
  };

  const deleteCustomer = async (id: string) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  };

  // Inventory API
  const getInventory = async (params?: Record<string, any>) => {
    const response = await api.get(`/inventory`, { params });
    return response.data;
  };

  const getInventoryStats = async () => {
    const response = await api.get(`/inventory/stats`);
    return response.data;
  };

  const createInventoryItem = async (itemData: any) => {
    const response = await api.post(`/inventory`, itemData);
    return response.data;
  };

  const updateInventoryItem = async (id: string, updates: any) => {
    const response = await api.put(`/inventory/${id}`, updates);
    return response.data;
  };

  const updateInventoryStock = async (id: string, stockData: any) => {
    const response = await api.put(`/inventory/${id}/stock`, stockData);
    return response.data;
  };

  const deleteInventoryItem = async (id: string) => {
    const response = await api.delete(`/inventory/${id}`);
    return response.data;
  };

  const createInventoryMovement = async (movementData: any) => {
    const response = await api.post(`/inventory/movements`, movementData);
    return response.data;
  };

  // Financial API
  const getFinancialSummary = async () => {
    const response = await api.get(`/financial/summary`);
    return response.data;
  };

  const getTransactions = async () => {
    const response = await api.get(`/financial/transactions`);
    return response.data;
  };

  const createTransaction = async (transactionData: any) => {
    const response = await api.post(`/financial/transactions`, transactionData);
    return response.data;
  };

  const calculatePricing = async (pricingData: any) => {
    const response = await api.post(`/financial/calculate-price`, pricingData);
    return response.data;
  };

  const getInvoices = async (params?: Record<string, any>) => {
    const response = await api.get(`/financial/invoices`, { params });
    return response.data;
  };

  const createInvoice = async (invoiceData: any) => {
    const response = await api.post(`/financial/invoices`, invoiceData);
    return response.data;
  };

  const updateInvoiceStatus = async (id: string, status: string) => {
    const response = await api.patch(`/financial/invoices/${id}/status`, { status });
    return response.data;
  };

  // Analytics API
  const getDashboardAnalytics = async () => {
    const response = await api.get(`/analytics/dashboard`);
    return response.data;
  };

  const getRevenueAnalytics = async () => {
    const response = await api.get(`/analytics/revenue`);
    return response.data;
  };

  const getCustomerAnalytics = async () => {
    const response = await api.get(`/analytics/customers`);
    return response.data;
  };

  const getInventoryAnalytics = async () => {
    const response = await api.get(`/analytics/inventory`);
    return response.data;
  };

  const getProductionAnalytics = async () => {
    const response = await api.get(`/analytics/production`);
    return response.data;
  };

  // Production API
  const getProductionBoard = async () => {
    const response = await api.get(`/production/board`);
    return response.data;
  };

  const getProductionTasks = async (params?: Record<string, any>) => {
    const response = await api.get(`/production/tasks`, { params });
    return response.data;
  };

  const getProductionStats = async () => {
    const response = await api.get(`/production/stats`);
    return response.data;
  };

  const createProductionTask = async (taskData: any) => {
    const response = await api.post(`/production/tasks`, taskData);
    return response.data;
  };

  const updateProductionTask = async (id: string, updates: any) => {
    const response = await api.put(`/production/tasks/${id}`, updates);
    return response.data;
  };

  const updateTaskStatus = async (id: string, status: string) => {
    const response = await api.patch(`/production/tasks/${id}/status`, { status });
    return response.data;
  };

  const deleteProductionTask = async (id: string) => {
    const response = await api.delete(`/production/tasks/${id}`);
    return response.data;
  };

  // Reports API
  const getSalesReport = async (params?: Record<string, any>) => {
    const response = await api.get(`/reports/sales`, { params });
    return response.data;
  };

  const getInventoryReport = async () => {
    const response = await api.get(`/reports/inventory`);
    return response.data;
  };

  const getProductionReport = async () => {
    const response = await api.get(`/reports/production`);
    return response.data;
  };

  const getCustomerReport = async () => {
    const response = await api.get(`/reports/customers`);
    return response.data;
  };

  const getFinancialReport = async () => {
    const response = await api.get(`/reports/financial`);
    return response.data;
  };

  // Users API
  const getUsers = async (params?: Record<string, any>) => {
    const response = await api.get(`/users`, { params });
    return response.data;
  };

  const createUser = async (userData: any) => {
    const response = await api.post(`/users`, userData);
    return response.data;
  };

  const updateUser = async (id: string, updates: any) => {
    const response = await api.put(`/users/${id}`, updates);
    return response.data;
  };

  const updateUserStatus = async (id: string, status: any) => {
    const response = await api.patch(`/users/${id}/status`, status);
    return response.data;
  };

  const deleteUser = async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  };

  // Settings API
  const getSettings = async () => {
    const response = await api.get(`/settings`);
    return response.data;
  };

  const updateSetting = async (key: string, data: any) => {
    const response = await api.put(`/settings/${key}`, data);
    return response.data;
  };

  const deleteSetting = async (key: string) => {
    const response = await api.delete(`/settings/${key}`);
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
  };

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
};
