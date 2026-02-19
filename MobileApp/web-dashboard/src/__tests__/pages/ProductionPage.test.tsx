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

// Mock ApiContext
const mockGetProductionBoard = vi.fn();
const mockGetProductionStats = vi.fn();

vi.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: vi.fn(),
    getOrders: vi.fn(),
    createOrder: vi.fn(),
    updateOrder: vi.fn(),
    getCustomers: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    getInventory: vi.fn(),
    createInventoryItem: vi.fn(),
    updateInventoryStock: vi.fn(),
    getFinancialSummary: vi.fn(),
    getTransactions: vi.fn(),
    createTransaction: vi.fn(),
    calculatePricing: vi.fn(),
    getRevenueAnalytics: vi.fn(),
    getCustomerAnalytics: vi.fn(),
    getInventoryAnalytics: vi.fn(),
    getProductionAnalytics: vi.fn(),
    getProductionBoard: mockGetProductionBoard,
    getProductionTasks: vi.fn(),
    getProductionStats: mockGetProductionStats,
    getSalesReport: vi.fn(),
    getInventoryReport: vi.fn(),
    getProductionReport: vi.fn(),
    getCustomerReport: vi.fn(),
    getFinancialReport: vi.fn(),
    getUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    updateUserStatus: vi.fn(),
    deleteUser: vi.fn(),
    getSettings: vi.fn(),
    updateSetting: vi.fn(),
    deleteSetting: vi.fn(),
  }),
}));

// Mock LanguageContext
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string) => {
      const translations: Record<string, string> = {
        'production.title': 'Production',
        'common.loading': 'Loading...',
        'common.error': 'Error',
      };
      return translations[key] || key;
    },
  }),
}));

const mockBoardData = {
  board: [
    {
      id: '1',
      order_number: 'ORD-001',
      customer_name: 'John Doe',
      status: 'designing',
      priority: 'normal',
      due_date: '2025-02-01',
      total_amount: 5000000,
    },
    {
      id: '2',
      order_number: 'ORD-002',
      customer_name: 'Jane Smith',
      status: 'production',
      priority: 'urgent',
      due_date: '2025-01-25',
      total_amount: 8000000,
    },
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
};

const mockStatsData = {
  stats: {
    designing: 3,
    in_production: 5,
    quality_control: 2,
    urgent_orders: 1,
  },
};

describe('ProductionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading spinner initially', () => {
      mockGetProductionBoard.mockImplementation(() => new Promise(() => {}));
      mockGetProductionStats.mockImplementation(() => new Promise(() => {}));
      render(<ProductionPage />);

      const spinnerContainer = document.querySelector('.animate-spin');
      expect(spinnerContainer).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when both API calls fail', async () => {
      mockGetProductionBoard.mockRejectedValueOnce(new Error('Network error'));
      mockGetProductionStats.mockRejectedValueOnce(new Error('Network error'));

      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
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
        expect(screen.getByText('Production')).toBeInTheDocument();
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
        expect(screen.getByText('Production')).toBeInTheDocument();
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
        // "Designing" appears in both stats card and kanban column
        const designingElements = screen.getAllByText('Designing');
        expect(designingElements.length).toBeGreaterThanOrEqual(2);
        // "In Production" appears in both stats card and kanban column
        const inProductionElements = screen.getAllByText('In Production');
        expect(inProductionElements.length).toBeGreaterThanOrEqual(2);
        // "Quality Control" appears in both stats card and kanban column
        const qcElements = screen.getAllByText('Quality Control');
        expect(qcElements.length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText('Urgent Orders')).toBeInTheDocument();
      });
    });

    it('should display stats values', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('Urgent Orders')).toBeInTheDocument();
      });
    });

    it('should display kanban board columns', async () => {
      render(<ProductionPage />);

      await waitFor(() => {
        // Board columns have stage labels
        const designingElements = screen.getAllByText('Designing');
        expect(designingElements.length).toBeGreaterThanOrEqual(2);
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
