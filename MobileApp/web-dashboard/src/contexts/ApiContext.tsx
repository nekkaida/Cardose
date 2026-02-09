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
  createOrder: (orderData: any) => Promise<any>;
  updateOrder: (id: string, updates: any) => Promise<any>;

  // Customers
  getCustomers: (params?: Record<string, any>) => Promise<any>;
  createCustomer: (customerData: any) => Promise<any>;
  updateCustomer: (id: string, updates: any) => Promise<any>;

  // Inventory
  getInventory: (params?: Record<string, any>) => Promise<any>;
  createInventoryItem: (itemData: any) => Promise<any>;
  updateInventoryStock: (id: string, stockData: any) => Promise<any>;
  
  // Financial
  getFinancialSummary: () => Promise<any>;
  getTransactions: () => Promise<any>;
  createTransaction: (transactionData: any) => Promise<any>;
  calculatePricing: (pricingData: any) => Promise<any>;
  
  // Analytics
  getDashboardAnalytics: () => Promise<any>;
  getRevenueAnalytics: () => Promise<any>;
  getCustomerAnalytics: () => Promise<any>;
  getInventoryAnalytics: () => Promise<any>;
  getProductionAnalytics: () => Promise<any>;
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

  const createOrder = async (orderData: any) => {
    const response = await api.post(`/orders`, orderData);
    return response.data;
  };

  const updateOrder = async (id: string, updates: any) => {
    const response = await api.put(`/orders/${id}`, updates);
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

  // Inventory API
  const getInventory = async (params?: Record<string, any>) => {
    const response = await api.get(`/inventory`, { params });
    return response.data;
  };

  const createInventoryItem = async (itemData: any) => {
    const response = await api.post(`/inventory`, itemData);
    return response.data;
  };

  const updateInventoryStock = async (id: string, stockData: any) => {
    const response = await api.put(`/inventory/${id}/stock`, stockData);
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

  const value: ApiContextType = {
    // Orders
    getOrders,
    createOrder,
    updateOrder,
    
    // Customers
    getCustomers,
    createCustomer,
    updateCustomer,
    
    // Inventory
    getInventory,
    createInventoryItem,
    updateInventoryStock,
    
    // Financial
    getFinancialSummary,
    getTransactions,
    createTransaction,
    calculatePricing,
    
    // Analytics
    getDashboardAnalytics,
    getRevenueAnalytics,
    getCustomerAnalytics,
    getInventoryAnalytics,
    getProductionAnalytics,
  };

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
};