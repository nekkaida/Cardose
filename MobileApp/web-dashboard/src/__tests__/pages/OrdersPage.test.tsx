/**
 * OrdersPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrdersPage from '../../pages/OrdersPage';

// Mock useNavigate
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/orders', search: '' }),
}));

// Mock ApiContext
const mockGetOrders = jest.fn();

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: jest.fn(),
    getOrders: mockGetOrders,
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
        'orders.title': 'Orders',
        'orders.new': 'New Order',
        'orders.pending': 'Pending',
        'orders.inProgress': 'In Progress',
        'orders.completed': 'Completed',
        'orders.cancelled': 'Cancelled',
        'orders.in_progress': 'In Progress',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.search': 'Search',
        'common.edit': 'Edit',
        'common.delete': 'Delete',
      };
      return translations[key] || key;
    },
  }),
}));

const mockOrdersData = {
  orders: [
    {
      id: '1',
      order_number: 'ORD-001',
      customer_name: 'John Doe',
      status: 'pending',
      priority: 'normal',
      total_amount: 5000000,
      due_date: '2025-02-01',
      created_at: '2025-01-15',
    },
    {
      id: '2',
      order_number: 'ORD-002',
      customer_name: 'Jane Smith',
      status: 'completed',
      priority: 'urgent',
      total_amount: 10000000,
      due_date: '2025-01-20',
      created_at: '2025-01-10',
    },
  ],
  totalPages: 1,
};

describe('OrdersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading spinner initially', () => {
      mockGetOrders.mockImplementation(() => new Promise(() => {}));
      render(<OrdersPage />);

      const spinnerContainer = document.querySelector('.animate-spin');
      expect(spinnerContainer).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when API call fails', async () => {
      mockGetOrders.mockRejectedValueOnce(new Error('Network error'));

      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load orders. Please try again.')).toBeInTheDocument();
      });
    });

    it('should show Try Again button on error', async () => {
      mockGetOrders.mockRejectedValueOnce(new Error('Network error'));

      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry loading when Try Again is clicked', async () => {
      mockGetOrders.mockRejectedValueOnce(new Error('Network error'));

      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      mockGetOrders.mockResolvedValueOnce(mockOrdersData);

      await userEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });

      expect(mockGetOrders).toHaveBeenCalledTimes(2);
    });
  });

  describe('Loaded state', () => {
    beforeEach(() => {
      mockGetOrders.mockResolvedValueOnce(mockOrdersData);
    });

    it('should render without crashing and display title', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('Orders')).toBeInTheDocument();
      });
    });

    it('should display subtitle', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('Manage and track all customer orders')).toBeInTheDocument();
      });
    });

    it('should display order data in table', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
        expect(screen.getByText('ORD-002')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should display table headers', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('Order')).toBeInTheDocument();
        expect(screen.getByText('Customer')).toBeInTheDocument();
        expect(screen.getByText('Priority')).toBeInTheDocument();
        expect(screen.getByText('Amount')).toBeInTheDocument();
        expect(screen.getByText('Due Date')).toBeInTheDocument();
      });
    });

    it('should display priority badges', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('normal')).toBeInTheDocument();
        expect(screen.getByText('urgent')).toBeInTheDocument();
      });
    });

    it('should display stats cards', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Value')).toBeInTheDocument();
      });
    });

    it('should display New Order button', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(/New Order/)).toBeInTheDocument();
      });
    });

    it('should display pagination', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
        expect(screen.getByText('Previous')).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
    });

    it('should display Edit and Delete action buttons', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        expect(editButtons.length).toBe(2);
        const deleteButtons = screen.getAllByText('Delete');
        expect(deleteButtons.length).toBe(2);
      });
    });
  });
});
