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
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/analytics', search: '' }),
}));

// Mock ApiContext — only the three methods AnalyticsPage actually calls
const mockGetDashboardAnalytics = vi.fn();
const mockGetRevenueAnalytics = vi.fn();
const mockGetCustomerAnalytics = vi.fn();

vi.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: mockGetDashboardAnalytics,
    getRevenueAnalytics: mockGetRevenueAnalytics,
    getCustomerAnalytics: mockGetCustomerAnalytics,
  }),
}));

// Mock LanguageContext — return key itself so `tr()` helper uses fallback strings
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string) => key,
  }),
}));

// Mock exportToCSV so we can verify calls without triggering DOM blob/link logic
const mockExportToCSV = vi.fn();
vi.mock('../../utils/formatters', async () => {
  const actual = await vi.importActual('../../utils/formatters');
  return {
    ...actual,
    exportToCSV: (...args: any[]) => mockExportToCSV(...args),
  };
});

// ── Mock data matching actual DashboardData interface ──────────────────

const mockDashboardData = {
  period: 'month',
  revenue: {
    total_revenue: 150_000_000,
    paid_revenue: 120_000_000,
    pending_revenue: 30_000_000,
    average_order_value: 3_000_000,
    invoice_count: 50,
  },
  orders: {
    total_orders: 50,
    completed_orders: 20,
    active_orders: 25,
    cancelled_orders: 5,
    average_value: 3_000_000,
    completion_rate: 44.4,
  },
  customers: {
    total_customers: 100,
    vip_customers: 10,
    regular_customers: 60,
    new_customers: 30,
  },
  inventory: {
    total_materials: 200,
    out_of_stock: 5,
    low_stock: 15,
    total_value: 50_000_000,
  },
  production: {
    designing: 8,
    in_production: 12,
    quality_control: 5,
    urgent_orders: 3,
  },
};

const mockRevenueData = {
  trend: [
    {
      month: '2026-01',
      invoice_count: 15,
      revenue: 45_000_000,
      tax_collected: 4_950_000,
      average_value: 3_000_000,
    },
    {
      month: '2026-02',
      invoice_count: 20,
      revenue: 60_000_000,
      tax_collected: 6_600_000,
      average_value: 3_000_000,
    },
  ],
};

const mockCustomerData = {
  top_customers: [
    {
      id: 'c1',
      name: 'PT Alpha',
      business_type: 'Corporate',
      loyalty_status: 'vip',
      order_count: 12,
      total_revenue: 36_000_000,
      average_order_value: 3_000_000,
      last_order_date: '2026-02-01',
    },
  ],
  acquisition_trend: [{ month: '2026-01', new_customers: 5 }],
  by_business_type: [
    { business_type: 'Corporate', count: 30 },
    { business_type: 'Individual', count: 40 },
    { business_type: 'Wedding', count: 20 },
    { business_type: 'Event', count: 10 },
  ],
};

// ── Helper ─────────────────────────────────────────────────────────────

function mockAllAPIsSuccess() {
  mockGetDashboardAnalytics.mockResolvedValue(mockDashboardData);
  mockGetRevenueAnalytics.mockResolvedValue(mockRevenueData);
  mockGetCustomerAnalytics.mockResolvedValue(mockCustomerData);
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show skeleton placeholders initially', () => {
      // Never resolving promises → component stays in loading
      mockGetDashboardAnalytics.mockImplementation(() => new Promise(() => {}));
      mockGetRevenueAnalytics.mockImplementation(() => new Promise(() => {}));
      mockGetCustomerAnalytics.mockImplementation(() => new Promise(() => {}));

      render(<AnalyticsPage />);

      const pulseElements = document.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error state', () => {
    it('should show section error when dashboard API fails', async () => {
      mockGetDashboardAnalytics.mockRejectedValue(new Error('Network error'));
      mockGetRevenueAnalytics.mockResolvedValue(mockRevenueData);
      mockGetCustomerAnalytics.mockResolvedValue(mockCustomerData);

      render(<AnalyticsPage />);

      await waitFor(() => {
        // Multiple sections may show errors when dashboard data is missing
        const errors = screen.getAllByText(/Failed to load this section/);
        expect(errors.length).toBeGreaterThan(0);
        // Retry buttons now show the translated label "Refresh"
        const retryButtons = screen.getAllByText('Refresh');
        expect(retryButtons.length).toBeGreaterThan(0);
      });
    });

    it('should show title even when dashboard fails', async () => {
      mockGetDashboardAnalytics.mockRejectedValue(new Error('fail'));
      mockGetRevenueAnalytics.mockResolvedValue(mockRevenueData);
      mockGetCustomerAnalytics.mockResolvedValue(mockCustomerData);

      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Business Analytics')).toBeInTheDocument();
      });
    });

    it('should retry loading on Retry click', async () => {
      mockGetDashboardAnalytics.mockRejectedValueOnce(new Error('fail'));
      mockGetRevenueAnalytics.mockResolvedValue(mockRevenueData);
      mockGetCustomerAnalytics.mockResolvedValue(mockCustomerData);

      render(<AnalyticsPage />);

      let retryButtons: HTMLElement[] = [];
      await waitFor(() => {
        // SectionError retry buttons now show "Refresh" instead of "Retry"
        retryButtons = screen.getAllByText('Refresh');
        expect(retryButtons.length).toBeGreaterThan(0);
      });

      // Now make it succeed
      mockGetDashboardAnalytics.mockResolvedValueOnce(mockDashboardData);

      await userEvent.click(retryButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Total Orders')).toBeInTheDocument();
      });
    });

    it('should show section errors when all three APIs fail', async () => {
      mockGetDashboardAnalytics.mockRejectedValue(new Error('fail'));
      mockGetRevenueAnalytics.mockRejectedValue(new Error('fail'));
      mockGetCustomerAnalytics.mockRejectedValue(new Error('fail'));

      render(<AnalyticsPage />);

      await waitFor(() => {
        // All sections should show errors
        const errors = screen.getAllByText(/Failed to load this section/);
        expect(errors.length).toBeGreaterThanOrEqual(3);
      });

      // Title should still be visible
      expect(screen.getByText('Business Analytics')).toBeInTheDocument();
      // Period selector and refresh button should still work
      expect(screen.getByLabelText('Period')).toBeInTheDocument();
      // Header refresh has aria-label="Refresh", section retries have descriptive labels
      expect(screen.getByLabelText('Refresh')).toBeInTheDocument();
      // SectionError retry buttons have contextual aria-labels
      const retryButtons = screen.getAllByLabelText(/^Refresh:/);
      expect(retryButtons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Loaded state', () => {
    beforeEach(() => {
      mockAllAPIsSuccess();
    });

    it('should render title and subtitle', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Business Analytics')).toBeInTheDocument();
        expect(screen.getByText('Detailed business insights and reports')).toBeInTheDocument();
      });
    });

    it('should display KPI cards', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Orders')).toBeInTheDocument();
        expect(screen.getByText('Revenue')).toBeInTheDocument();
        expect(screen.getByText('Customers')).toBeInTheDocument();
      });
    });

    it('should display order count from DashboardData', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument();
      });
    });

    it('should display customer count from DashboardData', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });
    });

    it('should display Order Status Distribution section', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Order Status Distribution')).toBeInTheDocument();
      });
    });

    it('should display Customer Segments section with All time subtitle', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Customer Segments')).toBeInTheDocument();
        expect(screen.getByText('All time')).toBeInTheDocument();
      });
    });

    it('should display period selector', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('Period')).toBeInTheDocument();
      });
    });

    it('should display refresh button', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('Refresh')).toBeInTheDocument();
      });
    });

    it('should display export button', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('Export')).toBeInTheDocument();
      });
    });

    it('should display completion rate', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Completion Rate')).toBeInTheDocument();
        expect(screen.getByText('44.4%')).toBeInTheDocument();
      });
    });

    it('should have ARIA progressbar with valuetext for completion rate', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toBeInTheDocument();
        expect(progressbar).toHaveAttribute('aria-valuenow', '44.4');
        expect(progressbar).toHaveAttribute('aria-valuetext', expect.stringContaining('44.4%'));
      });
    });

    it('should call all three APIs with period and signal params', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(mockGetDashboardAnalytics).toHaveBeenCalledWith(
          { period: 'month' },
          expect.any(AbortSignal)
        );
        expect(mockGetRevenueAnalytics).toHaveBeenCalledWith(
          { period: 'month' },
          expect.any(AbortSignal)
        );
        expect(mockGetCustomerAnalytics).toHaveBeenCalledWith(
          { period: 'month' },
          expect.any(AbortSignal)
        );
      });
    });

    it('should refetch all APIs when period changes', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Business Analytics')).toBeInTheDocument();
      });

      const periodSelect = screen.getByLabelText('Period');
      await userEvent.selectOptions(periodSelect, 'year');

      await waitFor(() => {
        expect(mockGetDashboardAnalytics).toHaveBeenCalledWith(
          { period: 'year' },
          expect.any(AbortSignal)
        );
        expect(mockGetRevenueAnalytics).toHaveBeenCalledWith(
          { period: 'year' },
          expect.any(AbortSignal)
        );
        expect(mockGetCustomerAnalytics).toHaveBeenCalledWith(
          { period: 'year' },
          expect.any(AbortSignal)
        );
      });
    });

    it('should show refetch overlay instead of skeleton on period change', async () => {
      // First load succeeds
      mockAllAPIsSuccess();
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Business Analytics')).toBeInTheDocument();
      });

      // Make APIs slow for refetch
      mockGetDashboardAnalytics.mockImplementation(() => new Promise(() => {}));
      mockGetRevenueAnalytics.mockImplementation(() => new Promise(() => {}));
      mockGetCustomerAnalytics.mockImplementation(() => new Promise(() => {}));

      const periodSelect = screen.getByLabelText('Period');
      await userEvent.selectOptions(periodSelect, 'week');

      // Should still show old data (stale) instead of skeleton
      expect(screen.getByText('Total Orders')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should display ARIA figure roles on chart containers', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        const figures = screen.getAllByRole('figure');
        expect(figures.length).toBeGreaterThan(0);
      });
    });

    it('should call exportToCSV with i18n labels when export button is clicked', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('Export')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByLabelText('Export'));

      expect(mockExportToCSV).toHaveBeenCalledTimes(1);
      const [rows, filename] = mockExportToCSV.mock.calls[0];

      // Should include KPI, inventory, revenue trend, top customer, and production rows
      // 9 KPI+inv + 2 trend + 1 customer + 3 production = 15
      expect(rows.length).toBeGreaterThanOrEqual(15);
      // Filename should include period and date
      expect(filename).toMatch(/^analytics-month-\d{4}-\d{2}-\d{2}\.csv$/);

      // Verify all section labels are present (using tr() fallbacks since t returns key)
      const sections = [...new Set(rows.map((r: any) => r.section))];
      expect(sections).toContain('KPI');
      expect(sections).toContain('Revenue Trend');
      expect(sections).toContain('Top Customers');
      expect(sections).toContain('Production Pipeline');
    });

    it('should disable export button when no data is loaded', async () => {
      // Return null/undefined dashboard
      mockGetDashboardAnalytics.mockResolvedValue(null);
      mockGetRevenueAnalytics.mockResolvedValue(null);
      mockGetCustomerAnalytics.mockResolvedValue(null);

      render(<AnalyticsPage />);

      await waitFor(() => {
        const exportBtn = screen.getByLabelText('Export');
        expect(exportBtn).toBeDisabled();
      });
    });
  });

  describe('Data freshness', () => {
    it('should show "Updated just now" after successful load', async () => {
      mockAllAPIsSuccess();
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText(/just now/i)).toBeInTheDocument();
      });
    });

    it('should not show freshness indicator when all APIs fail', async () => {
      mockGetDashboardAnalytics.mockRejectedValue(new Error('fail'));
      mockGetRevenueAnalytics.mockRejectedValue(new Error('fail'));
      mockGetCustomerAnalytics.mockRejectedValue(new Error('fail'));

      render(<AnalyticsPage />);

      await waitFor(() => {
        const errors = screen.getAllByText(/Failed to load this section/);
        expect(errors.length).toBeGreaterThan(0);
      });

      expect(screen.queryByText(/just now/i)).not.toBeInTheDocument();
    });

    it('should show skeleton on retry when all APIs failed initially', async () => {
      // All APIs fail on first load
      mockGetDashboardAnalytics.mockRejectedValue(new Error('fail'));
      mockGetRevenueAnalytics.mockRejectedValue(new Error('fail'));
      mockGetCustomerAnalytics.mockRejectedValue(new Error('fail'));

      render(<AnalyticsPage />);

      await waitFor(() => {
        const errors = screen.getAllByText(/Failed to load this section/);
        expect(errors.length).toBeGreaterThan(0);
      });

      // Reset mocks to never-resolving (to catch loading state)
      mockGetDashboardAnalytics.mockImplementation(() => new Promise(() => {}));
      mockGetRevenueAnalytics.mockImplementation(() => new Promise(() => {}));
      mockGetCustomerAnalytics.mockImplementation(() => new Promise(() => {}));

      // Click retry — since hasLoadedRef is still false, should show skeleton
      const retryButton = screen.getByLabelText('Refresh');
      await userEvent.click(retryButton);

      const pulseElements = document.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(0);
    });
  });

  describe('Abort on unmount', () => {
    it('should abort in-flight requests when component unmounts', async () => {
      // Track the signal passed to API calls
      let capturedSignal: AbortSignal | null = null;
      mockGetDashboardAnalytics.mockImplementation((_params: any, signal: AbortSignal) => {
        capturedSignal = signal;
        return new Promise(() => {}); // never resolves
      });
      mockGetRevenueAnalytics.mockImplementation(() => new Promise(() => {}));
      mockGetCustomerAnalytics.mockImplementation(() => new Promise(() => {}));

      const { unmount } = render(<AnalyticsPage />);

      // Wait for the API to be called
      await waitFor(() => {
        expect(mockGetDashboardAnalytics).toHaveBeenCalled();
      });

      expect(capturedSignal).not.toBeNull();
      expect(capturedSignal!.aborted).toBe(false);

      // Unmount triggers abort
      unmount();

      expect(capturedSignal!.aborted).toBe(true);
    });
  });
});
