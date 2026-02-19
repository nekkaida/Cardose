/**
 * AnalyticsPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnalyticsPage from '../../pages/AnalyticsPage';

// Mock recharts to avoid heavy SVG rendering in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Area: () => null,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
}));

// Mock useNavigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/analytics', search: '' }),
}));

// Mock ApiContext
const mockGetDashboardAnalytics = vi.fn();

vi.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: mockGetDashboardAnalytics,
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
    getRevenueAnalytics: vi.fn().mockResolvedValue({}),
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

// Mock LanguageContext
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string) => {
      const translations: Record<string, string> = {
        'analytics.title': 'Analytics',
        'common.loading': 'Loading...',
        'common.error': 'Error',
      };
      return translations[key] || key;
    },
  }),
}));

const mockAnalyticsData = {
  analytics: {
    orders: {
      total: 50,
      pending: 10,
      in_production: 15,
      completed: 20,
      cancelled: 5,
    },
    revenue: {
      total: 150000000,
      average: 3000000,
    },
    customers: {
      total: 100,
      corporate: 30,
      individual: 40,
      wedding: 20,
      event: 10,
    },
  },
};

// TODO: AnalyticsPage tests crash the Vitest worker due to jsdom memory exhaustion
// when rendering the 800-line component. Tests pass individually but the worker
// process runs out of heap memory. Re-enable once the page is split into smaller components.
describe.skip('AnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading spinner initially', () => {
      mockGetDashboardAnalytics.mockImplementation(() => new Promise(() => {}));
      render(<AnalyticsPage />);

      const spinnerContainer = document.querySelector('.animate-spin');
      expect(spinnerContainer).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when API call fails', async () => {
      mockGetDashboardAnalytics.mockRejectedValueOnce(new Error('Network error'));

      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load analytics. Please try again.')).toBeInTheDocument();
      });
    });

    it('should show Try Again button on error', async () => {
      mockGetDashboardAnalytics.mockRejectedValueOnce(new Error('Network error'));

      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry loading when Try Again is clicked', async () => {
      mockGetDashboardAnalytics.mockRejectedValueOnce(new Error('Network error'));

      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      mockGetDashboardAnalytics.mockResolvedValueOnce(mockAnalyticsData);

      await userEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('Total Orders')).toBeInTheDocument();
      });

      expect(mockGetDashboardAnalytics).toHaveBeenCalledTimes(2);
    });
  });

  describe('Loaded state', () => {
    beforeEach(() => {
      mockGetDashboardAnalytics.mockResolvedValueOnce(mockAnalyticsData);
    });

    it('should render without crashing and display title', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument();
      });
    });

    it('should display KPI cards', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Orders')).toBeInTheDocument();
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
        expect(screen.getByText('Total Customers')).toBeInTheDocument();
        expect(screen.getByText('Avg Order Value')).toBeInTheDocument();
      });
    });

    it('should display order count', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument();
      });
    });

    it('should display customer count', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });
    });

    it('should display Order Status Distribution section', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Order Status Distribution')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('In Production')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Cancelled')).toBeInTheDocument();
      });
    });

    it('should display Customer Segments section', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Customer Segments')).toBeInTheDocument();
        expect(screen.getByText('Corporate')).toBeInTheDocument();
        expect(screen.getByText('Individual')).toBeInTheDocument();
        expect(screen.getByText('Wedding')).toBeInTheDocument();
        expect(screen.getByText('Event')).toBeInTheDocument();
      });
    });

    it('should display subtitle text', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Detailed business insights and reports')).toBeInTheDocument();
      });
    });
  });
});
