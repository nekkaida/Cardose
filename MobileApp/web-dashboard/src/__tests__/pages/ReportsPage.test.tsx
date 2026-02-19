/**
 * ReportsPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportsPage from '../../pages/ReportsPage';

// Mock useNavigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/reports', search: '' }),
}));

// Mock ApiContext
const mockGetSalesReport = vi.fn();
const mockGetInventoryReport = vi.fn();
const mockGetProductionReport = vi.fn();
const mockGetCustomerReport = vi.fn();
const mockGetFinancialReport = vi.fn();

vi.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: vi.fn().mockResolvedValue({}),
    getOrders: vi.fn().mockResolvedValue({}),
    createOrder: vi.fn().mockResolvedValue({}),
    updateOrder: vi.fn().mockResolvedValue({}),
    updateOrderStatus: vi.fn().mockResolvedValue({}),
    deleteOrder: vi.fn().mockResolvedValue({}),
    getCustomers: vi.fn().mockResolvedValue({}),
    createCustomer: vi.fn().mockResolvedValue({}),
    updateCustomer: vi.fn().mockResolvedValue({}),
    deleteCustomer: vi.fn().mockResolvedValue({}),
    getInventory: vi.fn().mockResolvedValue({}),
    createInventoryItem: vi.fn().mockResolvedValue({}),
    updateInventoryItem: vi.fn().mockResolvedValue({}),
    updateInventoryStock: vi.fn().mockResolvedValue({}),
    deleteInventoryItem: vi.fn().mockResolvedValue({}),
    createInventoryMovement: vi.fn().mockResolvedValue({}),
    getFinancialSummary: vi.fn().mockResolvedValue({}),
    getTransactions: vi.fn().mockResolvedValue({}),
    createTransaction: vi.fn().mockResolvedValue({}),
    calculatePricing: vi.fn().mockResolvedValue({}),
    getInvoices: vi.fn().mockResolvedValue({}),
    createInvoice: vi.fn().mockResolvedValue({}),
    updateInvoiceStatus: vi.fn().mockResolvedValue({}),
    getRevenueAnalytics: vi.fn().mockResolvedValue({}),
    getCustomerAnalytics: vi.fn().mockResolvedValue({}),
    getInventoryAnalytics: vi.fn().mockResolvedValue({}),
    getProductionAnalytics: vi.fn().mockResolvedValue({}),
    getProductionBoard: vi.fn().mockResolvedValue({}),
    getProductionTasks: vi.fn().mockResolvedValue({}),
    getProductionStats: vi.fn().mockResolvedValue({}),
    updateProductionStage: vi.fn().mockResolvedValue({}),
    getSalesReport: mockGetSalesReport,
    getInventoryReport: mockGetInventoryReport,
    getProductionReport: mockGetProductionReport,
    getCustomerReport: mockGetCustomerReport,
    getFinancialReport: mockGetFinancialReport,
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
        'reports.title': 'Reports',
        'common.loading': 'Loading...',
        'common.error': 'Error',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock data that matches the SalesReportData interface
const mockSalesReportData = {
  report: {
    period: { start: '2025-01-01', end: '2025-01-31' },
    sales: [{ date: '2025-01-15', invoice_count: 5, revenue: 25000000, tax_collected: 2500000 }],
    summary: {
      totalInvoices: 50,
      totalRevenue: 150000000,
      totalTax: 15000000,
      averageInvoice: 3000000,
    },
    topCustomers: [{ name: 'Customer A', revenue: 50000000, invoice_count: 10 }],
  },
};

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading skeleton initially', () => {
      mockGetSalesReport.mockImplementation(() => new Promise(() => {}));
      render(<ReportsPage />);

      // ReportsPage uses ReportSkeleton with animate-pulse
      const skeletonElement = document.querySelector('.animate-pulse');
      expect(skeletonElement).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when API call fails', async () => {
      mockGetSalesReport.mockRejectedValueOnce(new Error('Network error'));

      render(<ReportsPage />);

      await waitFor(() => {
        // Error heading uses tr('common.error', 'Error'), which returns 'Error' from our translations
        expect(screen.getByText('Error')).toBeInTheDocument();
        // Error message: tr('reports.loadError', 'Failed to load report. Please try again.')
        // Since 'reports.loadError' is not in translations, t returns key, tr returns fallback
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
        // "Sales Report" appears in the tab button and h2 heading
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
        // tr('reports.subtitle', 'Generate and view business reports') - falls back
        expect(screen.getByText('Generate and view business reports')).toBeInTheDocument();
      });
    });

    it('should display Sales Report heading', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        // "Sales Report" appears in both the tab button and the h2 heading
        const salesReportElements = screen.getAllByText('Sales Report');
        expect(salesReportElements.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should display report summary cards', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        // Sales report summary cards: Total Invoices, Total Revenue, Total Tax, Average Invoice
        expect(screen.getByText('Total Invoices')).toBeInTheDocument();
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      });
    });

    it('should display report tab buttons', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        // Tab buttons (not a select): Sales Report, Inventory Report, etc.
        // "Sales Report" appears in both the tab button and the h2 heading, so use getAllByText
        expect(screen.getAllByText('Sales Report').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Inventory Report')).toBeInTheDocument();
        expect(screen.getByText('Production Report')).toBeInTheDocument();
        expect(screen.getByText('Customer Report')).toBeInTheDocument();
        expect(screen.getByText('Financial Report')).toBeInTheDocument();
      });
    });

    it('should display Generate button for sales report', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        // "Generate" button appears in the date filter section for reports that support date filter
        expect(screen.getByText('Generate')).toBeInTheDocument();
      });
    });
  });

  describe('Report type switching', () => {
    it('should load inventory report when type is changed', async () => {
      mockGetSalesReport.mockResolvedValueOnce(mockSalesReportData);

      render(<ReportsPage />);

      await waitFor(() => {
        const salesReportElements = screen.getAllByText('Sales Report');
        expect(salesReportElements.length).toBeGreaterThanOrEqual(2);
      });

      const mockInventoryReportData = {
        report: {
          summary: {
            totalItems: 200,
            outOfStock: 2,
            lowStock: 5,
            totalValue: 75000000,
          },
          byCategory: [],
          lowStockItems: [],
          recentMovements: [],
        },
      };
      mockGetInventoryReport.mockResolvedValueOnce(mockInventoryReportData);

      // Click the Inventory Report tab button
      const inventoryTab = screen.getByText('Inventory Report');
      await userEvent.click(inventoryTab);

      await waitFor(() => {
        expect(mockGetInventoryReport).toHaveBeenCalled();
      });
    });
  });
});
