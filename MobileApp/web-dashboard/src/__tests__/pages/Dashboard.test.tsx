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

// Mock recharts to avoid ResizeObserver issues in tests
vi.mock('recharts', () => ({
  BarChart: () => null,
  Bar: () => null,
  PieChart: () => null,
  Pie: () => null,
  Cell: () => null,
  AreaChart: () => null,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

// Mock ApiContext
const mockGetRevenueAnalytics = vi.fn();

vi.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: vi.fn().mockResolvedValue({}),
    getOrders: vi.fn().mockResolvedValue({}),
    createOrder: vi.fn().mockResolvedValue({}),
    updateOrder: vi.fn().mockResolvedValue({}),
    getCustomers: vi.fn().mockResolvedValue({}),
    createCustomer: vi.fn().mockResolvedValue({}),
    updateCustomer: vi.fn().mockResolvedValue({}),
    getInventory: vi.fn().mockResolvedValue({}),
    createInventoryItem: vi.fn().mockResolvedValue({}),
    updateInventoryStock: vi.fn().mockResolvedValue({}),
    getFinancialSummary: vi.fn().mockResolvedValue({}),
    getTransactions: vi.fn().mockResolvedValue({}),
    createTransaction: vi.fn().mockResolvedValue({}),
    calculatePricing: vi.fn().mockResolvedValue({}),
    getRevenueAnalytics: mockGetRevenueAnalytics,
    getCustomerAnalytics: vi.fn().mockResolvedValue({}),
    getInventoryAnalytics: vi.fn().mockResolvedValue({}),
    getProductionAnalytics: vi.fn().mockResolvedValue({}),
    getProductionBoard: vi.fn().mockResolvedValue({}),
    getProductionTasks: vi.fn().mockResolvedValue({}),
    getProductionStats: vi.fn().mockResolvedValue({}),
    getSalesReport: vi.fn().mockResolvedValue({}),
    getInventoryReport: vi.fn().mockResolvedValue({}),
    getProductionReport: vi.fn().mockResolvedValue({}),
    getCustomerReport: vi.fn().mockResolvedValue({}),
    getFinancialReport: vi.fn().mockResolvedValue({}),
    getUsers: vi.fn().mockResolvedValue({}),
    createUser: vi.fn().mockResolvedValue({}),
    updateUser: vi.fn().mockResolvedValue({}),
    updateUserStatus: vi.fn().mockResolvedValue({}),
    deleteUser: vi.fn().mockResolvedValue({}),
    getSettings: vi.fn().mockResolvedValue({}),
    updateSetting: vi.fn().mockResolvedValue({}),
    deleteSetting: vi.fn().mockResolvedValue({}),
  }),
}));

// Mock AuthContext with apiClient
const mockApiClientGet = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'admin', email: 'admin@test.com', role: 'admin' },
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    token: 'test-token',
  }),
  apiClient: {
    get: (...args: any[]) => mockApiClientGet(...args),
  },
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
    it('should show loading skeleton initially', () => {
      // Make apiClient.get hang forever (loading state)
      mockApiClientGet.mockImplementation(() => new Promise(() => {}));
      mockGetRevenueAnalytics.mockImplementation(() => new Promise(() => {}));
      render(<Dashboard />);

      // Dashboard uses skeleton loading (animate-pulse), not spinner (animate-spin)
      const skeletonElement = document.querySelector('.animate-pulse');
      expect(skeletonElement).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when analytics API call fails', async () => {
      mockApiClientGet.mockRejectedValue(new Error('Network error'));
      mockGetRevenueAnalytics.mockRejectedValue(new Error('Network error'));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load dashboard analytics')).toBeInTheDocument();
      });
    });

    it('should show Retry button on error', async () => {
      mockApiClientGet.mockRejectedValue(new Error('Network error'));
      mockGetRevenueAnalytics.mockRejectedValue(new Error('Network error'));

      render(<Dashboard />);

      await waitFor(() => {
        // The SectionError component renders a "Retry" link, not "Try Again"
        const retryButtons = screen.getAllByText('Retry');
        expect(retryButtons.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should retry loading data when Retry is clicked', async () => {
      // First call fails
      mockApiClientGet.mockRejectedValue(new Error('Network error'));
      mockGetRevenueAnalytics.mockRejectedValue(new Error('Network error'));

      render(<Dashboard />);

      await waitFor(() => {
        const retryButtons = screen.getAllByText('Retry');
        expect(retryButtons.length).toBeGreaterThanOrEqual(1);
      });

      // Second call succeeds
      mockApiClientGet.mockImplementation((url: string) => {
        if (url.includes('/analytics/dashboard')) {
          return Promise.resolve({ data: mockDashboardData });
        }
        if (url.includes('/dashboard/recent-orders')) {
          return Promise.resolve({ data: { orders: [] } });
        }
        return Promise.resolve({ data: {} });
      });
      mockGetRevenueAnalytics.mockResolvedValue({ trend: [] });

      // Click the first Retry button
      const retryButtons = screen.getAllByText('Retry');
      await userEvent.click(retryButtons[0]);

      await waitFor(() => {
        // After successful reload, KPI cards should appear
        expect(screen.getByText('Revenue')).toBeInTheDocument();
      });
    });
  });

  describe('Loaded state', () => {
    beforeEach(() => {
      mockApiClientGet.mockImplementation((url: string) => {
        if (url.includes('/analytics/dashboard')) {
          return Promise.resolve({ data: mockDashboardData });
        }
        if (url.includes('/dashboard/recent-orders')) {
          return Promise.resolve({ data: { orders: [] } });
        }
        return Promise.resolve({ data: {} });
      });
      mockGetRevenueAnalytics.mockResolvedValue({ trend: [] });
    });

    it('should display KPI cards', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        // The actual page renders "Revenue", "Orders", "Customers", "Completion"
        expect(screen.getByText('Revenue')).toBeInTheDocument();
        expect(screen.getByText('Orders')).toBeInTheDocument();
        expect(screen.getByText('Customers')).toBeInTheDocument();
        expect(screen.getByText('Completion')).toBeInTheDocument();
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

    it('should display Inventory section', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        // The dashboard has an "Inventory" section heading
        expect(screen.getByText('Inventory')).toBeInTheDocument();
        expect(screen.getByText('Total Materials')).toBeInTheDocument();
        expect(screen.getByText('Low Stock')).toBeInTheDocument();
        expect(screen.getByText('Out of Stock')).toBeInTheDocument();
      });
    });

    it('should display Production Pipeline section', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Production Pipeline')).toBeInTheDocument();
      });
    });

    it('should display Recent Activity section', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
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

  describe('Navigation', () => {
    beforeEach(() => {
      mockApiClientGet.mockImplementation((url: string) => {
        if (url.includes('/analytics/dashboard')) {
          return Promise.resolve({ data: mockDashboardData });
        }
        if (url.includes('/dashboard/recent-orders')) {
          return Promise.resolve({ data: { orders: [] } });
        }
        return Promise.resolve({ data: {} });
      });
      mockGetRevenueAnalytics.mockResolvedValue({ trend: [] });
    });

    it('should navigate to /orders when View all is clicked', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('View all')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('View all'));
      expect(mockNavigate).toHaveBeenCalledWith('/orders');
    });

    it('should display period selector', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Revenue')).toBeInTheDocument();
      });

      // The period selector exists with options
      const select = screen.getByDisplayValue('This Month');
      expect(select).toBeInTheDocument();
    });
  });
});
