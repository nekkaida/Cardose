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
const mockGetDashboardAnalytics = vi.fn();
const mockGetRevenueAnalytics = vi.fn();
const mockGetRecentOrders = vi.fn();

vi.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: mockGetDashboardAnalytics,
    getRevenueAnalytics: mockGetRevenueAnalytics,
    getRecentOrders: mockGetRecentOrders,
    getOrders: vi.fn().mockResolvedValue({}),
    getOrderStats: vi.fn().mockResolvedValue({}),
    createOrder: vi.fn().mockResolvedValue({}),
    updateOrder: vi.fn().mockResolvedValue({}),
    updateOrderStatus: vi.fn().mockResolvedValue({}),
    deleteOrder: vi.fn().mockResolvedValue({}),
    getCustomers: vi.fn().mockResolvedValue({}),
    createCustomer: vi.fn().mockResolvedValue({}),
    updateCustomer: vi.fn().mockResolvedValue({}),
    deleteCustomer: vi.fn().mockResolvedValue({}),
    getInventory: vi.fn().mockResolvedValue({}),
    getInventoryStats: vi.fn().mockResolvedValue({}),
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
    getCustomerAnalytics: vi.fn().mockResolvedValue({}),
    getInventoryAnalytics: vi.fn().mockResolvedValue({}),
    getProductionAnalytics: vi.fn().mockResolvedValue({}),
    getProductionBoard: vi.fn().mockResolvedValue({}),
    getProductionTasks: vi.fn().mockResolvedValue({}),
    getProductionStats: vi.fn().mockResolvedValue({}),
    createProductionTask: vi.fn().mockResolvedValue({}),
    updateProductionTask: vi.fn().mockResolvedValue({}),
    updateTaskStatus: vi.fn().mockResolvedValue({}),
    deleteProductionTask: vi.fn().mockResolvedValue({}),
    updateProductionStage: vi.fn().mockResolvedValue({}),
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

// Mock AuthContext (no more apiClient import needed)
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'admin', email: 'admin@test.com', role: 'admin' },
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    token: 'test-token',
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
        'dashboard.subtitle': "Here's your business overview",
        'dashboard.greeting.morning': 'Good morning',
        'dashboard.greeting.afternoon': 'Good afternoon',
        'dashboard.greeting.evening': 'Good evening',
        'dashboard.refreshData': 'Refresh data',
        'dashboard.updated': 'Updated',
        'dashboard.retry': 'Retry',
        'dashboard.selectPeriod': 'Select period',
        'dashboard.revenue': 'Revenue',
        'dashboard.paid': 'paid',
        'dashboard.orders': 'Orders',
        'dashboard.active': 'active',
        'dashboard.customers': 'Customers',
        'dashboard.vip': 'VIP',
        'dashboard.completion': 'Completion',
        'dashboard.done': 'done',
        'dashboard.revenueTrend': 'Revenue Trend',
        'dashboard.noRevenueData': 'No revenue data yet. Create invoices to track revenue.',
        'dashboard.orderStatus': 'Order Status',
        'dashboard.noOrdersData': 'No orders yet. Start by creating your first order.',
        'dashboard.productionPipeline': 'Production Pipeline',
        'dashboard.urgent': 'urgent',
        'dashboard.ordersTooltip': 'Orders',
        'dashboard.recentActivity': 'Recent Activity',
        'dashboard.viewAll': 'View all',
        'dashboard.unknownCustomer': 'Unknown Customer',
        'dashboard.noRecentActivity': 'No recent activity yet.',
        'dashboard.inventory': 'Inventory',
        'dashboard.totalMaterials': 'Total Materials',
        'dashboard.lowStock': 'Low Stock',
        'dashboard.outOfStock': 'Out of Stock',
        'dashboard.totalValue': 'Total Value',
        'dashboard.revenueSummary': 'Revenue Summary',
        'dashboard.paidRevenue': 'Paid Revenue',
        'dashboard.pendingRevenue': 'Pending Revenue',
        'dashboard.avgOrderValue': 'Avg Order Value',
        'dashboard.invoiceCount': 'Invoice Count',
        'dashboard.thisWeek': 'This Week',
        'dashboard.thisMonth': 'This Month',
        'dashboard.thisQuarter': 'This Quarter',
        'dashboard.thisYear': 'This Year',
        'dashboard.loadErrorAnalytics': 'Failed to load dashboard analytics',
        'dashboard.loadErrorRevenue': 'Failed to load revenue trend',
        'dashboard.loadErrorOrders': 'Failed to load recent orders',
        'dashboard.loadErrorOrderStatus': 'Failed to load order status',
        'dashboard.loadErrorProduction': 'Failed to load production data',
        'dashboard.loadErrorInventory': 'Failed to load inventory data',
        'dashboard.loadErrorRevenueSummary': 'Failed to load revenue summary',
        'dashboard.alertOutOfStock': 'out of stock',
        'dashboard.alertNeedAttention': 'need attention',
        'dashboard.alertRunningLow': 'running low',
        'dashboard.material': 'material',
        'dashboard.materials': 'materials',
        'dashboard.order': 'order',
        'dashboard.statusActive': 'Active',
        'dashboard.statusCompleted': 'Completed',
        'dashboard.statusCancelled': 'Cancelled',
        'dashboard.stageDesigning': 'Designing',
        'dashboard.stageApproved': 'Approved',
        'dashboard.stageProduction': 'Production',
        'dashboard.stageQC': 'QC',
        'dashboard.defaultUser': 'there',
        'dashboard.timeJustNow': 'just now',
        'dashboard.timeMinutesAgo': '{n}m ago',
        'dashboard.timeHoursAgo': '{n}h ago',
        'dashboard.timeDaysAgo': '{n}d ago',
        'dashboard.monthJan': 'Jan',
        'dashboard.monthFeb': 'Feb',
        'dashboard.monthMar': 'Mar',
        'dashboard.monthApr': 'Apr',
        'dashboard.monthMay': 'May',
        'dashboard.monthJun': 'Jun',
        'dashboard.monthJul': 'Jul',
        'dashboard.monthAug': 'Aug',
        'dashboard.monthSep': 'Sep',
        'dashboard.monthOct': 'Oct',
        'dashboard.monthNov': 'Nov',
        'dashboard.monthDec': 'Dec',
        'common.loading': 'Loading...',
        'common.error': 'Error',
      };
      return translations[key] || key;
    },
  }),
}));

const mockDashboardData = {
  period: 'month',
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
    cancelled_orders: 5,
    average_value: 3000000,
    completion_rate: 60,
  },
  customers: {
    total_customers: 100,
    vip_customers: 20,
    regular_customers: 60,
    new_customers: 20,
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
      mockGetDashboardAnalytics.mockImplementation(() => new Promise(() => {}));
      mockGetRevenueAnalytics.mockImplementation(() => new Promise(() => {}));
      mockGetRecentOrders.mockImplementation(() => new Promise(() => {}));
      render(<Dashboard />);

      const skeletonElement = document.querySelector('.animate-pulse');
      expect(skeletonElement).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when analytics API call fails', async () => {
      mockGetDashboardAnalytics.mockRejectedValue(new Error('Network error'));
      mockGetRevenueAnalytics.mockRejectedValue(new Error('Network error'));
      mockGetRecentOrders.mockRejectedValue(new Error('Network error'));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load dashboard analytics')).toBeInTheDocument();
      });
    });

    it('should show Retry button on error', async () => {
      mockGetDashboardAnalytics.mockRejectedValue(new Error('Network error'));
      mockGetRevenueAnalytics.mockRejectedValue(new Error('Network error'));
      mockGetRecentOrders.mockRejectedValue(new Error('Network error'));

      render(<Dashboard />);

      await waitFor(() => {
        const retryButtons = screen.getAllByText('Retry');
        expect(retryButtons.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should retry loading data when Retry is clicked', async () => {
      mockGetDashboardAnalytics.mockRejectedValue(new Error('Network error'));
      mockGetRevenueAnalytics.mockRejectedValue(new Error('Network error'));
      mockGetRecentOrders.mockRejectedValue(new Error('Network error'));

      render(<Dashboard />);

      await waitFor(() => {
        const retryButtons = screen.getAllByText('Retry');
        expect(retryButtons.length).toBeGreaterThanOrEqual(1);
      });

      // Second call succeeds
      mockGetDashboardAnalytics.mockResolvedValue(mockDashboardData);
      mockGetRevenueAnalytics.mockResolvedValue({ trend: [] });
      mockGetRecentOrders.mockResolvedValue({ orders: [] });

      const retryButtons = screen.getAllByText('Retry');
      await userEvent.click(retryButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Revenue')).toBeInTheDocument();
      });
    });
  });

  describe('Loaded state', () => {
    beforeEach(() => {
      mockGetDashboardAnalytics.mockResolvedValue(mockDashboardData);
      mockGetRevenueAnalytics.mockResolvedValue({ trend: [] });
      mockGetRecentOrders.mockResolvedValue({ orders: [] });
    });

    it('should display KPI cards', async () => {
      render(<Dashboard />);

      await waitFor(() => {
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

    it('should display alerts banner when out of stock items exist', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/out of stock/)).toBeInTheDocument();
      });
    });

    it('should display urgent orders alert', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/need attention/)).toBeInTheDocument();
      });
    });

    it('should call getDashboardAnalytics from ApiContext', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(mockGetDashboardAnalytics).toHaveBeenCalledWith({ period: 'month' });
      });
    });

    it('should call getRecentOrders from ApiContext', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(mockGetRecentOrders).toHaveBeenCalledWith(5);
      });
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      mockGetDashboardAnalytics.mockResolvedValue(mockDashboardData);
      mockGetRevenueAnalytics.mockResolvedValue({ trend: [] });
      mockGetRecentOrders.mockResolvedValue({ orders: [] });
    });

    it('should navigate to /orders when View all is clicked', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('View all')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('View all'));
      expect(mockNavigate).toHaveBeenCalledWith('/orders');
    });

    it('should display period selector with translated options', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Revenue')).toBeInTheDocument();
      });

      const select = screen.getByDisplayValue('This Month');
      expect(select).toBeInTheDocument();
    });

    it('should have aria-label on period selector', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Revenue')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Select period')).toBeInTheDocument();
    });

    it('should have aria-label on refresh button', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Revenue')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Refresh data')).toBeInTheDocument();
    });

    it('should call getDashboardAnalytics with new period when selector changes', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Revenue')).toBeInTheDocument();
      });

      mockGetDashboardAnalytics.mockClear();

      const select = screen.getByLabelText('Select period');
      await userEvent.selectOptions(select, 'week');

      await waitFor(() => {
        expect(mockGetDashboardAnalytics).toHaveBeenCalledWith({ period: 'week' });
      });
    });
  });
});
