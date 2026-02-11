/**
 * AnalyticsPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnalyticsPage from '../../pages/AnalyticsPage';

// Mock useNavigate
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/analytics', search: '' }),
}));

// Mock ApiContext
const mockGetDashboardAnalytics = jest.fn();

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: mockGetDashboardAnalytics,
    getOrders: jest.fn(),
    createOrder: jest.fn(),
    updateOrder: jest.fn(),
    getCustomers: jest.fn(),
    createCustomer: jest.fn(),
    updateCustomer: jest.fn(),
    getInventory: jest.fn(),
    createInventoryItem: jest.fn(),
    updateInventoryStock: jest.fn(),
    getFinancialSummary: jest.fn(),
    getTransactions: jest.fn(),
    createTransaction: jest.fn(),
    calculatePricing: jest.fn(),
    getRevenueAnalytics: jest.fn(),
    getCustomerAnalytics: jest.fn(),
    getInventoryAnalytics: jest.fn(),
    getProductionAnalytics: jest.fn(),
    getProductionBoard: jest.fn(),
    getProductionTasks: jest.fn(),
    getProductionStats: jest.fn(),
    getSalesReport: jest.fn(),
    getInventoryReport: jest.fn(),
    getProductionReport: jest.fn(),
    getCustomerReport: jest.fn(),
    getFinancialReport: jest.fn(),
    getUsers: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    updateUserStatus: jest.fn(),
    deleteUser: jest.fn(),
    getSettings: jest.fn(),
    updateSetting: jest.fn(),
    deleteSetting: jest.fn(),
  }),
}));

// Mock LanguageContext
jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: jest.fn(),
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

describe('AnalyticsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
