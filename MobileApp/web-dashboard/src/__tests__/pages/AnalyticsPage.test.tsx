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
    completion_rate: 0.4,
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
        const retryButtons = screen.getAllByText('Retry');
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
        retryButtons = screen.getAllByText('Retry');
        expect(retryButtons.length).toBeGreaterThan(0);
      });

      // Now make it succeed
      mockGetDashboardAnalytics.mockResolvedValueOnce(mockDashboardData);

      await userEvent.click(retryButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Total Orders')).toBeInTheDocument();
      });
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

    it('should display Customer Segments section with business types', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Customer Segments')).toBeInTheDocument();
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

    it('should call getDashboardAnalytics with period param', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(mockGetDashboardAnalytics).toHaveBeenCalledWith({ period: 'month' });
      });
    });

    it('should refetch when period changes', async () => {
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Business Analytics')).toBeInTheDocument();
      });

      const periodSelect = screen.getByLabelText('Period');
      await userEvent.selectOptions(periodSelect, 'year');

      await waitFor(() => {
        expect(mockGetDashboardAnalytics).toHaveBeenCalledWith({ period: 'year' });
      });
    });
  });
});
