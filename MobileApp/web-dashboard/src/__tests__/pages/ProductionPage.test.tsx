/**
 * ProductionPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductionPage from '../../pages/ProductionPage';

// Mock useNavigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/production', search: '' }),
}));

// Mock AuthContext - use 'manager' role so canMoveOrders is true
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'admin', email: 'admin@test.com', role: 'manager' },
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    token: 'test-token',
  }),
}));

// Mock ApiContext
const mockGetProductionBoard = vi.fn();
const mockGetProductionStats = vi.fn();
const mockUpdateProductionStage = vi.fn();

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
    getRevenueAnalytics: vi.fn().mockResolvedValue({}),
    getCustomerAnalytics: vi.fn().mockResolvedValue({}),
    getInventoryAnalytics: vi.fn().mockResolvedValue({}),
    getProductionAnalytics: vi.fn().mockResolvedValue({}),
    getProductionBoard: mockGetProductionBoard,
    getProductionTasks: vi.fn().mockResolvedValue({}),
    getProductionStats: mockGetProductionStats,
    updateProductionStage: mockUpdateProductionStage,
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
        'production.title': 'Production Management',
        'production.subtitle': 'Track production stages and manage workflows',
        'production.pending': 'Pending',
        'production.designing': 'Designing',
        'production.approved': 'Approved',
        'production.inProduction': 'In Production',
        'production.qualityControl': 'Quality Control',
        'production.activeOrders': 'Active Orders',
        'production.completedToday': 'Completed Today',
        'production.overdueOrders': 'Overdue Orders',
        'production.qualityIssues': 'Quality Issues',
        'production.noOrders': 'No orders in this stage',
        'production.retry': 'Try Again',
        'production.loadError': 'Failed to load production data. Please try again.',
        'production.moveSuccess': 'Order moved successfully',
        'production.moveFailed': 'Failed to move order. The change has been reverted.',
        'production.noPermission': 'You do not have permission to move orders.',
        'production.invalidTransition': 'This move is not allowed from the current stage.',
        'production.searchPlaceholder': 'Search orders...',
        'production.allPriorities': 'All Priorities',
        'production.urgent': 'Urgent',
        'production.high': 'High',
        'production.normal': 'Normal',
        'production.low': 'Low',
        'production.clearFilters': 'Clear filters',
        'production.emptyTitle': 'No production orders yet',
        'production.goToOrders': 'Go to Orders',
        'production.refresh': 'Refresh',
        'production.moving': 'Moving...',
        'production.dropHere': 'Drop here to move',
        'production.secondsAgo': 's ago',
        'production.qcStuckLabel': 'In QC > 2 days',
        'production.tapToSelect': 'Tap a card, then tap a column',
        'production.invalidTransitionDetail':
          'Cannot move from "{from}" to "{to}". Allowed: {allowed}.',
        'common.loading': 'Loading...',
        'common.error': 'Error',
      };
      return translations[key] || key;
    },
  }),
}));

// Board data matching actual backend response shape
const mockBoardData = {
  board: {
    pending: [],
    designing: [
      {
        id: '1',
        order_number: 'ORD-001',
        customer_name: 'John Doe',
        status: 'designing',
        priority: 'normal',
        due_date: '2025-02-01',
        total_amount: 5000000,
        stage_entered_at: '2025-01-28T10:00:00Z',
      },
    ],
    approved: [],
    production: [
      {
        id: '2',
        order_number: 'ORD-002',
        customer_name: 'Jane Smith',
        status: 'production',
        priority: 'urgent',
        due_date: '2025-01-25',
        total_amount: 8000000,
        stage_entered_at: '2025-01-20T08:00:00Z',
      },
    ],
    quality_control: [
      {
        id: '3',
        order_number: 'ORD-003',
        customer_name: 'Bob Wilson',
        status: 'quality_control',
        priority: 'high',
        due_date: '2025-01-20',
        total_amount: 3000000,
        stage_entered_at: '2025-01-19T14:00:00Z',
      },
    ],
  },
  totalActive: 3,
};

const mockStatsData = {
  stats: {
    active_orders: 10,
    completed_today: 2,
    overdue_orders: 1,
    quality_issues: 0,
    pending_approval: 1,
    stage_distribution: {
      pending: 0,
      designing: 1,
      approved: 0,
      production: 1,
      quality_control: 1,
    },
  },
};

const emptyBoardData = {
  board: { pending: [], designing: [], approved: [], production: [], quality_control: [] },
  totalActive: 0,
};

const emptyStatsData = {
  stats: {
    active_orders: 0,
    completed_today: 0,
    overdue_orders: 0,
    quality_issues: 0,
    stage_distribution: {
      pending: 0,
      designing: 0,
      approved: 0,
      production: 0,
      quality_control: 0,
    },
  },
};

describe('ProductionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading skeleton initially', () => {
      mockGetProductionBoard.mockImplementation(() => new Promise(() => {}));
      mockGetProductionStats.mockImplementation(() => new Promise(() => {}));
      render(<ProductionPage />);

      const skeletonElement = document.querySelector('.animate-pulse');
      expect(skeletonElement).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when both API calls fail', async () => {
      mockGetProductionBoard.mockRejectedValueOnce(new Error('Network error'));
      mockGetProductionStats.mockRejectedValueOnce(new Error('Network error'));

      render(<ProductionPage />);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load production data. Please try again.')
        ).toBeInTheDocument();
      });
    });

    it('should show Try Again button on error', async () => {
      mockGetProductionBoard.mockRejectedValueOnce(new Error('Network error'));
      mockGetProductionStats.mockRejectedValueOnce(new Error('Network error'));

      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry loading when Try Again is clicked', async () => {
      mockGetProductionBoard.mockRejectedValueOnce(new Error('Network error'));
      mockGetProductionStats.mockRejectedValueOnce(new Error('Network error'));

      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      mockGetProductionBoard.mockResolvedValueOnce(mockBoardData);
      mockGetProductionStats.mockResolvedValueOnce(mockStatsData);

      await userEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('Production Management')).toBeInTheDocument();
      });
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no orders exist', async () => {
      mockGetProductionBoard.mockResolvedValueOnce(emptyBoardData);
      mockGetProductionStats.mockResolvedValueOnce(emptyStatsData);

      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('No production orders yet')).toBeInTheDocument();
      });
    });

    it('should navigate to orders page from empty state CTA', async () => {
      mockGetProductionBoard.mockResolvedValueOnce(emptyBoardData);
      mockGetProductionStats.mockResolvedValueOnce(emptyStatsData);

      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('Go to Orders')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Go to Orders'));
      expect(mockNavigate).toHaveBeenCalledWith('/orders');
    });
  });

  describe('Loaded state', () => {
    beforeEach(() => {
      mockGetProductionBoard.mockResolvedValue(mockBoardData);
      mockGetProductionStats.mockResolvedValue(mockStatsData);
    });

    it('should render title and subtitle', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('Production Management')).toBeInTheDocument();
        expect(
          screen.getByText('Track production stages and manage workflows')
        ).toBeInTheDocument();
      });
    });

    it('should display stats cards with correct values', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('Active Orders')).toBeInTheDocument();
        expect(screen.getByText('Completed Today')).toBeInTheDocument();
        expect(screen.getByText('Overdue Orders')).toBeInTheDocument();
        expect(screen.getByText('Quality Issues')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument(); // active_orders
        expect(screen.getByText('2')).toBeInTheDocument(); // completed_today
      });
    });

    it('should display kanban board columns', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Designing')).toBeInTheDocument();
        expect(screen.getByText('Approved')).toBeInTheDocument();
        expect(screen.getByText('In Production')).toBeInTheDocument();
        expect(screen.getByText('Quality Control')).toBeInTheDocument();
      });
    });

    it('should display order cards with customer names', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('ORD-002')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('ORD-003')).toBeInTheDocument();
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      });
    });

    it('should display priority badges', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        // Use getAllByText since "Normal", "Urgent", "High" also appear in the filter dropdown
        expect(screen.getAllByText('Normal').length).toBeGreaterThanOrEqual(2); // badge + dropdown option
        expect(screen.getAllByText('Urgent').length).toBeGreaterThanOrEqual(2);
        expect(screen.getAllByText('High').length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should display search input and filter', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search orders...')).toBeInTheDocument();
        expect(screen.getByText('All Priorities')).toBeInTheDocument();
      });
    });

    it('should have a refresh button', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('Refresh')).toBeInTheDocument();
      });
    });
  });

  describe('Search and filter', () => {
    beforeEach(() => {
      mockGetProductionBoard.mockResolvedValue(mockBoardData);
      mockGetProductionStats.mockResolvedValue(mockStatsData);
    });

    it('should filter orders by customer name search', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search orders...');
      await userEvent.type(searchInput, 'John');

      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.queryByText('ORD-002')).not.toBeInTheDocument();
      expect(screen.queryByText('ORD-003')).not.toBeInTheDocument();
    });

    it('should filter orders by order number search', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-002')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search orders...');
      await userEvent.type(searchInput, 'ORD-002');

      expect(screen.queryByText('ORD-001')).not.toBeInTheDocument();
      expect(screen.getByText('ORD-002')).toBeInTheDocument();
      expect(screen.queryByText('ORD-003')).not.toBeInTheDocument();
    });

    it('should filter orders by priority', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, 'urgent');

      expect(screen.queryByText('ORD-001')).not.toBeInTheDocument();
      expect(screen.getByText('ORD-002')).toBeInTheDocument();
      expect(screen.queryByText('ORD-003')).not.toBeInTheDocument();
    });

    it('should show and use clear filters button', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search orders...');
      await userEvent.type(searchInput, 'nonexistent');

      expect(screen.queryByText('ORD-001')).not.toBeInTheDocument();
      expect(screen.getByText('Clear filters')).toBeInTheDocument();

      await userEvent.click(screen.getByText('Clear filters'));

      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });
  });

  describe('Partial data load', () => {
    it('should display board even if stats fail', async () => {
      mockGetProductionBoard.mockResolvedValueOnce(mockBoardData);
      mockGetProductionStats.mockRejectedValueOnce(new Error('Stats failed'));

      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh', () => {
    it('should reload data when refresh button is clicked', async () => {
      mockGetProductionBoard.mockResolvedValue(mockBoardData);
      mockGetProductionStats.mockResolvedValue(mockStatsData);

      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });

      expect(mockGetProductionBoard).toHaveBeenCalledTimes(1);

      await userEvent.click(screen.getByLabelText('Refresh'));

      await waitFor(() => {
        expect(mockGetProductionBoard).toHaveBeenCalledTimes(2);
      });
    });
  });
});
