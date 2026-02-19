/**
 * OrdersPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrdersPage from '../../pages/OrdersPage';

// Mock useNavigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/orders', search: '' }),
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
const mockGetOrders = vi.fn();
const mockGetCustomers = vi.fn();

vi.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: vi.fn().mockResolvedValue({}),
    getOrders: mockGetOrders,
    createOrder: vi.fn().mockResolvedValue({}),
    updateOrder: vi.fn().mockResolvedValue({}),
    updateOrderStatus: vi.fn().mockResolvedValue({}),
    deleteOrder: vi.fn().mockResolvedValue({}),
    getCustomers: mockGetCustomers,
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
        'orders.title': 'Orders',
        'orders.new': 'New Order',
        'orders.pending': 'Pending',
        'orders.completed': 'Completed',
        'orders.cancelled': 'Cancelled',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.search': 'Search',
        'common.edit': 'Edit',
        'common.delete': 'Delete',
        'common.cancel': 'Cancel',
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
      customer_id: 'c1',
      status: 'pending',
      priority: 'normal',
      total_amount: 5000000,
      due_date: '2025-02-01',
      created_at: '2025-01-15',
      box_type: 'standard',
      special_requests: '',
    },
    {
      id: '2',
      order_number: 'ORD-002',
      customer_name: 'Jane Smith',
      customer_id: 'c2',
      status: 'completed',
      priority: 'urgent',
      total_amount: 10000000,
      due_date: '2025-01-20',
      created_at: '2025-01-10',
      box_type: 'premium',
      special_requests: '',
    },
  ],
  totalPages: 1,
  total: 2,
  stats: {
    total: 2,
    pending: 1,
    designing: 0,
    approved: 0,
    production: 0,
    quality_control: 0,
    completed: 1,
    cancelled: 0,
    totalValue: 15000000,
    overdue: 0,
  },
};

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // getCustomers is also called on mount; provide a default resolve
    mockGetCustomers.mockResolvedValue({ customers: [] });
  });

  describe('Loading state', () => {
    it('should show loading skeleton initially', () => {
      mockGetOrders.mockImplementation(() => new Promise(() => {}));
      render(<OrdersPage />);

      // Page uses skeleton rows (animate-pulse), not spinner
      const skeletonElement = document.querySelector('.animate-pulse');
      expect(skeletonElement).toBeInTheDocument();
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

    it('should display order count subtitle', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(/total orders/)).toBeInTheDocument();
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

    it('should display priority badges with capitalized labels', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        // PRIORITY_LABELS maps 'normal' -> 'Normal', 'urgent' -> 'Urgent'
        expect(screen.getByText('Normal')).toBeInTheDocument();
        expect(screen.getByText('Urgent')).toBeInTheDocument();
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
        expect(screen.getByText(/Page 1 of 1/)).toBeInTheDocument();
        expect(screen.getByText('Previous')).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
    });

    it('should display Edit buttons but not Delete for admin role', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        // Edit buttons should be present (one per order)
        const editButtons = screen.getAllByText('Edit');
        expect(editButtons.length).toBe(2);
        // Delete buttons should NOT be visible because canDelete = role === 'owner' || 'manager'
        // and test user has role 'admin'
        expect(screen.queryByText('Delete')).not.toBeInTheDocument();
      });
    });
  });
});
