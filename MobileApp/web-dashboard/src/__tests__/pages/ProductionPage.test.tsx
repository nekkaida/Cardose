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

// Mock AuthContext
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

// Mock ApiContext
const mockGetProductionBoard = vi.fn();
const mockGetProductionStats = vi.fn();

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

// Mock LanguageContext
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string) => {
      const translations: Record<string, string> = {
        'production.title': 'Production Management',
        'common.loading': 'Loading...',
        'common.error': 'Error',
      };
      return translations[key] || key;
    },
  }),
}));

// Board data: page expects { board: { pending: [...], designing: [...], ... } }
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
      },
    ],
  },
};

// Stats data: page expects { stats: { active_orders, completed_today, overdue_orders, quality_issues, stage_distribution } }
const mockStatsData = {
  stats: {
    active_orders: 10,
    completed_today: 2,
    overdue_orders: 1,
    quality_issues: 0,
    stage_distribution: {
      pending: 0,
      designing: 1,
      approved: 0,
      production: 1,
      quality_control: 1,
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

      // Page uses skeleton (animate-pulse), not spinner
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

  describe('Loaded state', () => {
    beforeEach(() => {
      mockGetProductionBoard.mockResolvedValueOnce(mockBoardData);
      mockGetProductionStats.mockResolvedValueOnce(mockStatsData);
    });

    it('should render without crashing and display title', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('Production Management')).toBeInTheDocument();
      });
    });

    it('should display subtitle', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        expect(
          screen.getByText('Track production stages and manage workflows')
        ).toBeInTheDocument();
      });
    });

    it('should display stats cards', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('Active Orders')).toBeInTheDocument();
        expect(screen.getByText('Completed Today')).toBeInTheDocument();
        expect(screen.getByText('Overdue Orders')).toBeInTheDocument();
        expect(screen.getByText('Quality Issues')).toBeInTheDocument();
      });
    });

    it('should display kanban board columns', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        // Column headings from STAGES
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Designing')).toBeInTheDocument();
        expect(screen.getByText('Approved')).toBeInTheDocument();
        expect(screen.getByText('In Production')).toBeInTheDocument();
        expect(screen.getByText('Quality Control')).toBeInTheDocument();
      });
    });

    it('should display order cards on the board', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
        expect(screen.getByText('ORD-002')).toBeInTheDocument();
        expect(screen.getByText('ORD-003')).toBeInTheDocument();
      });
    });

    it('should display customer names on order cards', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      });
    });

    it('should display priority badges on order cards', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        // Priority labels fall back to raw values since translation keys aren't mapped
        expect(screen.getByText('normal')).toBeInTheDocument();
        expect(screen.getByText('urgent')).toBeInTheDocument();
        expect(screen.getByText('high')).toBeInTheDocument();
      });
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
});
