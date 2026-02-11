/**
 * ReportsPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportsPage from '../../pages/ReportsPage';

// Mock useNavigate
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/reports', search: '' }),
}));

// Mock ApiContext
const mockGetSalesReport = jest.fn();
const mockGetInventoryReport = jest.fn();
const mockGetProductionReport = jest.fn();
const mockGetCustomerReport = jest.fn();
const mockGetFinancialReport = jest.fn();

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: jest.fn(),
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
    getSalesReport: mockGetSalesReport,
    getInventoryReport: mockGetInventoryReport,
    getProductionReport: mockGetProductionReport,
    getCustomerReport: mockGetCustomerReport,
    getFinancialReport: mockGetFinancialReport,
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
        'reports.title': 'Reports',
        'common.loading': 'Loading...',
        'common.error': 'Error',
      };
      return translations[key] || key;
    },
  }),
}));

const mockSalesReportData = {
  report: {
    total_orders: 50,
    total_revenue: 150000000,
    average_order_value: 3000000,
  },
};

describe('ReportsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading spinner initially', () => {
      mockGetSalesReport.mockImplementation(() => new Promise(() => {}));
      render(<ReportsPage />);

      const spinnerContainer = document.querySelector('.animate-spin');
      expect(spinnerContainer).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when API call fails', async () => {
      mockGetSalesReport.mockRejectedValueOnce(new Error('Network error'));

      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load report. Please try again.')).toBeInTheDocument();
      });
    });

    it('should show Try Again button on error', async () => {
      mockGetSalesReport.mockRejectedValueOnce(new Error('Network error'));

      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry loading when Try Again is clicked', async () => {
      mockGetSalesReport.mockRejectedValueOnce(new Error('Network error'));

      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      mockGetSalesReport.mockResolvedValueOnce(mockSalesReportData);

      await userEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        // "Sales Report" appears in both the select option and the heading
        const salesReportElements = screen.getAllByText('Sales Report');
        expect(salesReportElements.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Loaded state', () => {
    beforeEach(() => {
      mockGetSalesReport.mockResolvedValueOnce(mockSalesReportData);
    });

    it('should render without crashing and display title', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Reports')).toBeInTheDocument();
      });
    });

    it('should display subtitle', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Generate and view business reports')).toBeInTheDocument();
      });
    });

    it('should display Sales Report heading', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        // "Sales Report" appears in both the select option and the h2 heading
        const salesReportElements = screen.getAllByText('Sales Report');
        expect(salesReportElements.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should display report data fields', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('total orders')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
      });
    });

    it('should display report type selector', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Reports')).toBeInTheDocument();
      });

      const select = screen.getByDisplayValue('Sales Report');
      expect(select).toBeInTheDocument();
    });

    it('should display Generate button for sales report', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Generate')).toBeInTheDocument();
      });
    });
  });

  describe('Report type switching', () => {
    it('should load inventory report when type is changed', async () => {
      mockGetSalesReport.mockResolvedValueOnce(mockSalesReportData);

      render(<ReportsPage />);

      await waitFor(() => {
        // "Sales Report" appears in both the select option and the h2 heading
        const salesReportElements = screen.getAllByText('Sales Report');
        expect(salesReportElements.length).toBeGreaterThanOrEqual(2);
      });

      const mockInventoryReportData = {
        report: {
          total_items: 200,
          low_stock_count: 5,
          total_value: 75000000,
        },
      };
      mockGetInventoryReport.mockResolvedValueOnce(mockInventoryReportData);

      const select = screen.getByDisplayValue('Sales Report');
      await userEvent.selectOptions(select, 'inventory');

      await waitFor(() => {
        expect(mockGetInventoryReport).toHaveBeenCalled();
      });
    });
  });
});
