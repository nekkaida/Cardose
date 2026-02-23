/**
 * ReportsPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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
        'reports.subtitle': 'Generate and view business reports',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'reports.loadError': 'Failed to load report. Please try again.',
        'reports.errorNetwork': 'Network error. Please check your connection and try again.',
        'reports.errorAuth': 'Your session has expired. Please log in again.',
        'reports.errorBadRequest': 'Invalid request parameters. Please check your date range.',
        'reports.errorServer': 'Server error. Our team has been notified.',
        'reports.retry': 'Try Again',
        'reports.refresh': 'Refresh',
        'reports.generate': 'Generate',
        'reports.sales': 'Sales Report',
        'reports.inventory': 'Inventory Report',
        'reports.production': 'Production Report',
        'reports.customers': 'Customer Report',
        'reports.financial': 'Financial Report',
        'reports.exportCsv': 'Export CSV',
        'reports.noData': 'No data available',
        'reports.preset7d': 'Last 7 days',
        'reports.preset30d': 'Last 30 days',
        'reports.presetThisMonth': 'This month',
        'reports.presetLastMonth': 'Last month',
        'reports.presetThisQuarter': 'This quarter',
        'reports.presetThisYear': 'This year',
        'reports.presetCustom': 'Custom',
        'reports.startDate': 'Start Date',
        'reports.endDate': 'End Date',
        'reports.errorDateRange': 'Start date must be before or equal to end date.',
        'reports.totalInvoices': 'Total Invoices',
        'reports.totalRevenue': 'Total Revenue',
        'reports.totalTax': 'Total Tax',
        'reports.averageInvoice': 'Average Invoice',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div />,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div />,
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}));

// Mock data
const mockSalesReportData = {
  report: {
    period: { start: '2025-01-01', end: '2025-01-31' },
    sales: [
      { date: '2025-01-15', invoice_count: 5, revenue: 25000000, tax_collected: 2500000 },
      { date: '2025-01-16', invoice_count: 3, revenue: 15000000, tax_collected: 1500000 },
    ],
    summary: {
      totalInvoices: 50,
      totalRevenue: 150000000,
      totalTax: 15000000,
      averageInvoice: 3000000,
    },
    topCustomers: [{ name: 'Customer A', revenue: 50000000, invoice_count: 10 }],
  },
};

const mockInventoryReportData = {
  report: {
    summary: {
      totalItems: 200,
      outOfStock: 2,
      lowStock: 5,
      totalValue: 75000000,
    },
    byCategory: [
      { category: 'Raw Materials', item_count: 50, total_stock: 500, total_value: 25000000 },
    ],
    lowStockItems: [],
    recentMovements: [],
  },
};

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading skeleton with aria-busy', () => {
      mockGetSalesReport.mockImplementation(() => new Promise(() => {}));
      render(<ReportsPage />);

      const skeletonElement = document.querySelector('[aria-busy="true"]');
      expect(skeletonElement).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when API call fails', async () => {
      mockGetSalesReport.mockRejectedValueOnce(new Error('something went wrong'));

      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load report. Please try again.')).toBeInTheDocument();
      });
    });

    it('should show differentiated error for 401 response', async () => {
      const authError = Object.assign(new Error('Unauthorized'), {
        response: { status: 401 },
      });
      mockGetSalesReport.mockRejectedValueOnce(authError);

      render(<ReportsPage />);

      await waitFor(() => {
        expect(
          screen.getByText('Your session has expired. Please log in again.')
        ).toBeInTheDocument();
      });
    });

    it('should show differentiated error for 400 response', async () => {
      const badReqError = Object.assign(new Error('Bad Request'), {
        response: { status: 400 },
      });
      mockGetSalesReport.mockRejectedValueOnce(badReqError);

      render(<ReportsPage />);

      await waitFor(() => {
        expect(
          screen.getByText('Invalid request parameters. Please check your date range.')
        ).toBeInTheDocument();
      });
    });

    it('should show differentiated error for 500 response', async () => {
      const serverError = Object.assign(new Error('Server Error'), {
        response: { status: 500 },
      });
      mockGetSalesReport.mockRejectedValueOnce(serverError);

      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Server error. Our team has been notified.')).toBeInTheDocument();
      });
    });

    it('should have role="alert" on error banner for accessibility', async () => {
      mockGetSalesReport.mockRejectedValueOnce(new Error('fail'));

      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should show Try Again button on error', async () => {
      mockGetSalesReport.mockRejectedValueOnce(new Error('fail'));

      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry loading when Try Again is clicked', async () => {
      mockGetSalesReport.mockRejectedValueOnce(new Error('fail'));

      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      mockGetSalesReport.mockResolvedValueOnce(mockSalesReportData);
      await userEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        const salesReportElements = screen.getAllByText('Sales Report');
        expect(salesReportElements.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Loaded state', () => {
    beforeEach(() => {
      mockGetSalesReport.mockResolvedValueOnce(mockSalesReportData);
    });

    it('should render title and subtitle', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Reports')).toBeInTheDocument();
        expect(screen.getByText('Generate and view business reports')).toBeInTheDocument();
      });
    });

    it('should display Sales Report heading in tab and content', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const salesReportElements = screen.getAllByText('Sales Report');
        expect(salesReportElements.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should display report summary cards', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Invoices')).toBeInTheDocument();
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      });
    });

    it('should display all 5 report tab buttons with ARIA tablist role', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const tablist = screen.getByRole('tablist');
        expect(tablist).toBeInTheDocument();

        const tabs = within(tablist).getAllByRole('tab');
        expect(tabs).toHaveLength(5);
      });
    });

    it('should mark active tab with aria-selected', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const tablist = screen.getByRole('tablist');
        const tabs = within(tablist).getAllByRole('tab');
        const salesTab = tabs.find((t) => t.textContent?.includes('Sales Report'));
        expect(salesTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should set tabIndex={0} on active tab and tabIndex={-1} on inactive tabs', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const tablist = screen.getByRole('tablist');
        const tabs = within(tablist).getAllByRole('tab');
        const salesTab = tabs.find((t) => t.textContent?.includes('Sales Report'));
        const inventoryTab = tabs.find((t) => t.textContent?.includes('Inventory Report'));
        expect(salesTab).toHaveAttribute('tabindex', '0');
        expect(inventoryTab).toHaveAttribute('tabindex', '-1');
      });
    });

    it('should have aria-labelledby on the tabpanel matching the active tab', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const tabpanel = screen.getByRole('tabpanel');
        expect(tabpanel).toHaveAttribute('aria-labelledby', 'tab-sales');
      });
    });

    it('should have id attributes on tab buttons', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        expect(document.getElementById('tab-sales')).toBeInTheDocument();
        expect(document.getElementById('tab-inventory')).toBeInTheDocument();
        expect(document.getElementById('tab-production')).toBeInTheDocument();
        expect(document.getElementById('tab-customers')).toBeInTheDocument();
        expect(document.getElementById('tab-financial')).toBeInTheDocument();
      });
    });

    it('should display Generate button for date-filterable reports', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Generate')).toBeInTheDocument();
      });
    });

    it('should display Export CSV button when data is loaded', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });
    });

    it('should render report content in a tabpanel', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const tabpanel = screen.getByRole('tabpanel');
        expect(tabpanel).toBeInTheDocument();
      });
    });
  });

  describe('Date presets', () => {
    beforeEach(() => {
      mockGetSalesReport.mockResolvedValue(mockSalesReportData);
    });

    it('should display all date preset buttons for date-filterable reports', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Last 7 days')).toBeInTheDocument();
        expect(screen.getByText('Last 30 days')).toBeInTheDocument();
        expect(screen.getByText('This month')).toBeInTheDocument();
        expect(screen.getByText('Last month')).toBeInTheDocument();
        expect(screen.getByText('This quarter')).toBeInTheDocument();
        expect(screen.getByText('This year')).toBeInTheDocument();
        expect(screen.getByText('Custom')).toBeInTheDocument();
      });
    });

    it('should have pre-populated date inputs (not empty)', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const startInput = screen.getByLabelText('Start Date') as HTMLInputElement;
        const endInput = screen.getByLabelText('End Date') as HTMLInputElement;
        expect(startInput.value).not.toBe('');
        expect(endInput.value).not.toBe('');
      });
    });

    it('should fetch report when a date preset is clicked', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Invoices')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Last 7 days'));

      await waitFor(() => {
        // Initial fetch + preset click = at least 2 calls
        expect(mockGetSalesReport).toHaveBeenCalledTimes(2);
      });
    });

    it('should disable preset buttons during loading', () => {
      mockGetSalesReport.mockImplementation(() => new Promise(() => {}));
      render(<ReportsPage />);

      const presetButton = screen.getByText('Last 7 days');
      expect(presetButton).toBeDisabled();
    });

    it('should have max attribute on date inputs', async () => {
      render(<ReportsPage />);

      await waitFor(() => {
        const startInput = screen.getByLabelText('Start Date') as HTMLInputElement;
        const endInput = screen.getByLabelText('End Date') as HTMLInputElement;
        expect(startInput.getAttribute('max')).toBeTruthy();
        expect(endInput.getAttribute('max')).toBeTruthy();
      });
    });
  });

  describe('Report type switching', () => {
    it('should load inventory report when tab is clicked', async () => {
      mockGetSalesReport.mockResolvedValueOnce(mockSalesReportData);

      render(<ReportsPage />);

      await waitFor(() => {
        const salesReportElements = screen.getAllByText('Sales Report');
        expect(salesReportElements.length).toBeGreaterThanOrEqual(2);
      });

      mockGetInventoryReport.mockResolvedValueOnce(mockInventoryReportData);

      await userEvent.click(screen.getByText('Inventory Report'));

      await waitFor(() => {
        expect(mockGetInventoryReport).toHaveBeenCalled();
      });
    });

    it('should hide date presets for non-date-filterable reports', async () => {
      mockGetSalesReport.mockResolvedValueOnce(mockSalesReportData);

      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Last 7 days')).toBeInTheDocument();
      });

      mockGetInventoryReport.mockResolvedValueOnce(mockInventoryReportData);
      await userEvent.click(screen.getByText('Inventory Report'));

      await waitFor(() => {
        expect(screen.queryByText('Last 7 days')).not.toBeInTheDocument();
        expect(screen.queryByText('Generate')).not.toBeInTheDocument();
      });
    });

    it('should clear error when switching tabs', async () => {
      mockGetSalesReport.mockRejectedValueOnce(new Error('fail'));

      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      mockGetInventoryReport.mockResolvedValueOnce(mockInventoryReportData);
      await userEvent.click(screen.getByText('Inventory Report'));

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Date validation', () => {
    it('should show error when start date is after end date', async () => {
      mockGetSalesReport.mockResolvedValueOnce(mockSalesReportData);

      render(<ReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Generate')).toBeInTheDocument();
      });

      const startInput = screen.getByLabelText('Start Date') as HTMLInputElement;
      const endInput = screen.getByLabelText('End Date') as HTMLInputElement;

      // Set start date after end date
      await userEvent.clear(startInput);
      await userEvent.type(startInput, '2025-02-01');
      await userEvent.clear(endInput);
      await userEvent.type(endInput, '2025-01-01');

      await userEvent.click(screen.getByText('Generate'));

      await waitFor(() => {
        expect(
          screen.getByText('Start date must be before or equal to end date.')
        ).toBeInTheDocument();
      });

      // Should NOT have called the API again
      expect(mockGetSalesReport).toHaveBeenCalledTimes(1); // only the initial auto-fetch
    });
  });

  describe('Request cancellation', () => {
    it('should not update state from a superseded request when switching tabs', async () => {
      // First request hangs (simulates slow auto-fetch for Sales)
      let resolveFirst!: (value: unknown) => void;
      const firstPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });
      mockGetSalesReport.mockReturnValueOnce(firstPromise);

      render(<ReportsPage />);

      // While first request is pending, switch to Inventory tab (tabs are NOT disabled during loading)
      mockGetInventoryReport.mockResolvedValueOnce(mockInventoryReportData);
      await userEvent.click(screen.getByText('Inventory Report'));

      // Wait for the inventory report to render
      await waitFor(() => {
        expect(mockGetInventoryReport).toHaveBeenCalled();
      });

      // Now resolve the first (stale) sales request — should NOT cause errors or overwrite
      resolveFirst(mockSalesReportData);

      // The page should still be on the inventory tab
      await waitFor(() => {
        const tablist = screen.getByRole('tablist');
        const tabs = within(tablist).getAllByRole('tab');
        const inventoryTab = tabs.find((t) => t.textContent?.includes('Inventory Report'));
        expect(inventoryTab).toHaveAttribute('aria-selected', 'true');
      });
    });
  });
});
