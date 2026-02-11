/**
 * ApiContext Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { ApiProvider, useApi } from '../../contexts/ApiContext';

// Mock axios.create to return a mock instance
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

jest.mock('axios', () => {
  const mockInterceptors = {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  };
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => ({
        get: (...args: any[]) => mockGet(...args),
        post: (...args: any[]) => mockPost(...args),
        put: (...args: any[]) => mockPut(...args),
        patch: (...args: any[]) => mockPatch(...args),
        delete: (...args: any[]) => mockDelete(...args),
        interceptors: mockInterceptors,
      })),
    },
  };
});

// Test component that exercises various API methods
const TestComponent: React.FC = () => {
  const {
    getOrders, createOrder, updateOrder,
    getCustomers, getInventory,
    getDashboardAnalytics,
    getFinancialSummary,
    getUsers,
    getSettings,
  } = useApi();

  const [result, setResult] = React.useState<string>('idle');

  const handleGetOrders = async () => {
    try {
      const data = await getOrders({ status: 'pending' });
      setResult(JSON.stringify(data));
    } catch {
      setResult('error');
    }
  };

  const handleCreateOrder = async () => {
    try {
      const data = await createOrder({ customer: 'test' });
      setResult(JSON.stringify(data));
    } catch {
      setResult('error');
    }
  };

  const handleUpdateOrder = async () => {
    try {
      const data = await updateOrder('123', { status: 'completed' });
      setResult(JSON.stringify(data));
    } catch {
      setResult('error');
    }
  };

  const handleGetDashboard = async () => {
    try {
      const data = await getDashboardAnalytics();
      setResult(JSON.stringify(data));
    } catch {
      setResult('error');
    }
  };

  const handleGetCustomers = async () => {
    try {
      const data = await getCustomers();
      setResult(JSON.stringify(data));
    } catch {
      setResult('error');
    }
  };

  return (
    <div>
      <div data-testid="result">{result}</div>
      <button onClick={handleGetOrders}>Get Orders</button>
      <button onClick={handleCreateOrder}>Create Order</button>
      <button onClick={handleUpdateOrder}>Update Order</button>
      <button onClick={handleGetDashboard}>Get Dashboard</button>
      <button onClick={handleGetCustomers}>Get Customers</button>
    </div>
  );
};

describe('ApiContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useApi hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useApi must be used within an ApiProvider');

      consoleError.mockRestore();
    });
  });

  describe('Orders API', () => {
    it('should call getOrders with params', async () => {
      const mockData = { orders: [{ id: '1', customer: 'Customer A' }] };
      mockGet.mockResolvedValueOnce({ data: mockData });

      render(
        <ApiProvider>
          <TestComponent />
        </ApiProvider>
      );

      await userEvent.click(screen.getByText('Get Orders'));

      await waitFor(() => {
        expect(screen.getByTestId('result').textContent).toBe(JSON.stringify(mockData));
      });

      expect(mockGet).toHaveBeenCalledWith('/orders', { params: { status: 'pending' } });
    });

    it('should call createOrder with order data', async () => {
      const mockData = { success: true, id: 'new-1' };
      mockPost.mockResolvedValueOnce({ data: mockData });

      render(
        <ApiProvider>
          <TestComponent />
        </ApiProvider>
      );

      await userEvent.click(screen.getByText('Create Order'));

      await waitFor(() => {
        expect(screen.getByTestId('result').textContent).toBe(JSON.stringify(mockData));
      });

      expect(mockPost).toHaveBeenCalledWith('/orders', { customer: 'test' });
    });

    it('should call updateOrder with id and updates', async () => {
      const mockData = { success: true };
      mockPut.mockResolvedValueOnce({ data: mockData });

      render(
        <ApiProvider>
          <TestComponent />
        </ApiProvider>
      );

      await userEvent.click(screen.getByText('Update Order'));

      await waitFor(() => {
        expect(screen.getByTestId('result').textContent).toBe(JSON.stringify(mockData));
      });

      expect(mockPut).toHaveBeenCalledWith('/orders/123', { status: 'completed' });
    });
  });

  describe('Analytics API', () => {
    it('should call getDashboardAnalytics', async () => {
      const mockData = { revenue: { total: 1000000 }, orders: { total: 50 } };
      mockGet.mockResolvedValueOnce({ data: mockData });

      render(
        <ApiProvider>
          <TestComponent />
        </ApiProvider>
      );

      await userEvent.click(screen.getByText('Get Dashboard'));

      await waitFor(() => {
        expect(screen.getByTestId('result').textContent).toBe(JSON.stringify(mockData));
      });

      expect(mockGet).toHaveBeenCalledWith('/analytics/dashboard');
    });
  });

  describe('Customers API', () => {
    it('should call getCustomers', async () => {
      const mockData = { customers: [{ id: '1', name: 'Customer A' }] };
      mockGet.mockResolvedValueOnce({ data: mockData });

      render(
        <ApiProvider>
          <TestComponent />
        </ApiProvider>
      );

      await userEvent.click(screen.getByText('Get Customers'));

      await waitFor(() => {
        expect(screen.getByTestId('result').textContent).toBe(JSON.stringify(mockData));
      });

      expect(mockGet).toHaveBeenCalledWith('/customers', { params: undefined });
    });
  });

  describe('Error handling', () => {
    it('should propagate errors from API calls', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      render(
        <ApiProvider>
          <TestComponent />
        </ApiProvider>
      );

      await userEvent.click(screen.getByText('Get Orders'));

      await waitFor(() => {
        expect(screen.getByTestId('result').textContent).toBe('error');
      });
    });
  });
});
