/**
 * Dashboard Page Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../../pages/Dashboard';

// Mock useNavigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock ApiContext
const mockGetDashboardAnalytics = vi.fn();

vi.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: mockGetDashboardAnalytics,
    getOrders: vi.fn(),
    createOrder: vi.fn(),
    updateOrder: vi.fn(),
    getCustomers: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    getInventory: vi.fn(),
    createInventoryItem: vi.fn(),
    updateInventoryStock: vi.fn(),
    getFinancialSummary: vi.fn(),
    getTransactions: vi.fn(),
    createTransaction: vi.fn(),
    calculatePricing: vi.fn(),
    getRevenueAnalytics: vi.fn(),
    getCustomerAnalytics: vi.fn(),
    getInventoryAnalytics: vi.fn(),
    getProductionAnalytics: vi.fn(),
    getProductionBoard: vi.fn(),
    getProductionTasks: vi.fn(),
    getProductionStats: vi.fn(),
    getSalesReport: vi.fn(),
    getInventoryReport: vi.fn(),
    getProductionReport: vi.fn(),
    getCustomerReport: vi.fn(),
    getFinancialReport: vi.fn(),
    getUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    updateUserStatus: vi.fn(),
    deleteUser: vi.fn(),
    getSettings: vi.fn(),
    updateSetting: vi.fn(),
    deleteSetting: vi.fn(),
  }),
}));

// Mock LanguageContext
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string) => {
      const translations: Record<string, string> = {
        'dashboard.title': 'Premium Gift Box Dashboard',
        'dashboard.welcome': 'Welcome to your business management system',
        'metrics.revenue': 'Total Revenue',
        'metrics.orders': 'Orders',
        'metrics.customers': 'Customers',
        'common.loading': 'Loading...',
        'common.error': 'Error',
      };
      return translations[key] || key;
    },
  }),
}));

const mockDashboardData = {
  revenue: {
    total_revenue: 150000000,
    paid_revenue: 120000000,
    pending_revenue: 30000000,
    average_order_value: 5000000,
    invoice_count: 30,
  },
  orders: {
    total_orders: 50,
    active_orders: 15,
    completed_orders: 30,
    completion_rate: 60,
  },
  customers: {
    total_customers: 100,
    vip_customers: 20,
  },
  inventory: {
    total_materials: 200,
    low_stock: 5,
    out_of_stock: 2,
    total_value: 75000000,
  },
  production: {
    designing: 3,
    in_production: 8,
    quality_control: 2,
    urgent_orders: 1,
  },
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading spinner initially', () => {
      mockGetDashboardAnalytics.mockImplementation(() => new Promise(() => {}));
      render(<Dashboard />);

      // The loading state renders a spinner div, no specific text
      const spinnerContainer = document.querySelector('.animate-spin');
      expect(spinnerContainer).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when API call fails', async () => {
      mockGetDashboardAnalytics.mockRejectedValueOnce(new Error('Network error'));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
      });
    });

    it('should show Try Again button on error', async () => {
      mockGetDashboardAnalytics.mockRejectedValueOnce(new Error('Network error'));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry loading data when Try Again is clicked', async () => {
      // First call fails
      mockGetDashboardAnalytics.mockRejectedValueOnce(new Error('Network error'));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      // Second call succeeds
      mockGetDashboardAnalytics.mockResolvedValueOnce(mockDashboardData);

      await userEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      });

      expect(mockGetDashboardAnalytics).toHaveBeenCalledTimes(2);
    });
  });

  describe('Loaded state', () => {
    beforeEach(() => {
      mockGetDashboardAnalytics.mockResolvedValueOnce(mockDashboardData);
    });

    it('should display KPI cards', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
        expect(screen.getByText('Total Orders')).toBeInTheDocument();
        expect(screen.getByText('Customers')).toBeInTheDocument();
        expect(screen.getByText('Completion Rate')).toBeInTheDocument();
      });
    });

    it('should display formatted order count', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument();
      });
    });

    it('should display completion rate percentage', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('60%')).toBeInTheDocument();
      });
    });

    it('should display Inventory Status section', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Inventory Status')).toBeInTheDocument();
        expect(screen.getByText('Total Materials')).toBeInTheDocument();
        expect(screen.getByText('Low Stock')).toBeInTheDocument();
        expect(screen.getByText('Out of Stock')).toBeInTheDocument();
      });
    });

    it('should display Production section', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Production')).toBeInTheDocument();
        expect(screen.getByText('Designing')).toBeInTheDocument();
        expect(screen.getByText('In Production')).toBeInTheDocument();
        expect(screen.getByText('Quality Control')).toBeInTheDocument();
        expect(screen.getByText('Urgent Orders')).toBeInTheDocument();
      });
    });

    it('should display Quick Actions section', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      });
    });

    it('should display Revenue Summary section', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Revenue Summary')).toBeInTheDocument();
        expect(screen.getByText('Paid Revenue')).toBeInTheDocument();
        expect(screen.getByText('Pending Revenue')).toBeInTheDocument();
        expect(screen.getByText('Avg Order Value')).toBeInTheDocument();
        expect(screen.getByText('Invoice Count')).toBeInTheDocument();
      });
    });
  });

  describe('Quick Actions navigation', () => {
    beforeEach(() => {
      mockGetDashboardAnalytics.mockResolvedValueOnce(mockDashboardData);
    });

    it('should navigate to /orders when View Orders is clicked', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/View Orders/)).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText(/View Orders/));
      expect(mockNavigate).toHaveBeenCalledWith('/orders');
    });

    it('should navigate to /customers when View Customers is clicked', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/View Customers/)).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText(/View Customers/));
      expect(mockNavigate).toHaveBeenCalledWith('/customers');
    });

    it('should navigate to /inventory when View Inventory is clicked', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/View Inventory/)).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText(/View Inventory/));
      expect(mockNavigate).toHaveBeenCalledWith('/inventory');
    });

    it('should navigate to /analytics when View Reports is clicked', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/View Reports/)).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText(/View Reports/));
      expect(mockNavigate).toHaveBeenCalledWith('/analytics');
    });
  });
});
