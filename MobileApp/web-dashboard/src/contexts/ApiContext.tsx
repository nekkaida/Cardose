import React, { createContext, useContext, ReactNode } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface ApiContextType {
  // Orders
  getOrders: () => Promise<any>;
  createOrder: (orderData: any) => Promise<any>;
  updateOrder: (id: string, updates: any) => Promise<any>;
  
  // Customers
  getCustomers: () => Promise<any>;
  createCustomer: (customerData: any) => Promise<any>;
  updateCustomer: (id: string, updates: any) => Promise<any>;
  
  // Inventory
  getInventory: () => Promise<any>;
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
  const getOrders = async () => {
    const response = await axios.get(`${API_BASE_URL}/orders`);
    return response.data;
  };

  const createOrder = async (orderData: any) => {
    const response = await axios.post(`${API_BASE_URL}/orders`, orderData);
    return response.data;
  };

  const updateOrder = async (id: string, updates: any) => {
    const response = await axios.put(`${API_BASE_URL}/orders/${id}`, updates);
    return response.data;
  };

  // Customers API
  const getCustomers = async () => {
    const response = await axios.get(`${API_BASE_URL}/customers`);
    return response.data;
  };

  const createCustomer = async (customerData: any) => {
    const response = await axios.post(`${API_BASE_URL}/customers`, customerData);
    return response.data;
  };

  const updateCustomer = async (id: string, updates: any) => {
    const response = await axios.put(`${API_BASE_URL}/customers/${id}`, updates);
    return response.data;
  };

  // Inventory API
  const getInventory = async () => {
    const response = await axios.get(`${API_BASE_URL}/inventory`);
    return response.data;
  };

  const createInventoryItem = async (itemData: any) => {
    const response = await axios.post(`${API_BASE_URL}/inventory`, itemData);
    return response.data;
  };

  const updateInventoryStock = async (id: string, stockData: any) => {
    const response = await axios.put(`${API_BASE_URL}/inventory/${id}/stock`, stockData);
    return response.data;
  };

  // Financial API
  const getFinancialSummary = async () => {
    const response = await axios.get(`${API_BASE_URL}/financial/summary`);
    return response.data;
  };

  const getTransactions = async () => {
    const response = await axios.get(`${API_BASE_URL}/financial/transactions`);
    return response.data;
  };

  const createTransaction = async (transactionData: any) => {
    const response = await axios.post(`${API_BASE_URL}/financial/transactions`, transactionData);
    return response.data;
  };

  const calculatePricing = async (pricingData: any) => {
    const response = await axios.post(`${API_BASE_URL}/financial/calculate-price`, pricingData);
    return response.data;
  };

  // Analytics API
  const getDashboardAnalytics = async () => {
    const response = await axios.get(`${API_BASE_URL}/analytics/dashboard`);
    return response.data;
  };

  const getRevenueAnalytics = async () => {
    const response = await axios.get(`${API_BASE_URL}/analytics/revenue`);
    return response.data;
  };

  const getCustomerAnalytics = async () => {
    const response = await axios.get(`${API_BASE_URL}/analytics/customers`);
    return response.data;
  };

  const getInventoryAnalytics = async () => {
    const response = await axios.get(`${API_BASE_URL}/analytics/inventory`);
    return response.data;
  };

  const getProductionAnalytics = async () => {
    const response = await axios.get(`${API_BASE_URL}/analytics/production`);
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