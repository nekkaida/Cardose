/**
 * CustomersPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomersPage from '../../pages/CustomersPage';

// Mock useNavigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/customers', search: '' }),
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
const mockGetCustomers = vi.fn();

vi.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: vi.fn().mockResolvedValue({}),
    getOrders: vi.fn().mockResolvedValue({}),
    createOrder: vi.fn().mockResolvedValue({}),
    updateOrder: vi.fn().mockResolvedValue({}),
    getCustomers: mockGetCustomers,
    createCustomer: vi.fn().mockResolvedValue({}),
    updateCustomer: vi.fn().mockResolvedValue({}),
    deleteCustomer: vi.fn().mockResolvedValue({}),
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
    getProductionBoard: vi.fn().mockResolvedValue({}),
    getProductionTasks: vi.fn().mockResolvedValue({}),
    getProductionStats: vi.fn().mockResolvedValue({}),
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
        'customers.title': 'Customers',
        'customers.corporate': 'Corporate',
        'customers.new': 'New Customer',
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

const mockCustomersData = {
  customers: [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '08123456789',
      business_type: 'corporate',
      loyalty_status: 'vip',
      total_orders: 10,
      total_spent: 50000000,
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '08198765432',
      business_type: 'individual',
      loyalty_status: 'regular',
      total_orders: 3,
      total_spent: 15000000,
    },
  ],
  totalPages: 1,
  total: 2,
  stats: {
    corporate: 1,
    individual: 1,
    wedding: 0,
    event: 0,
    totalValue: 65000000,
    loyalty_new: 0,
    loyalty_regular: 1,
    loyalty_vip: 1,
  },
};

describe('CustomersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading skeleton initially', () => {
      mockGetCustomers.mockImplementation(() => new Promise(() => {}));
      render(<CustomersPage />);

      // Page uses skeleton rows (animate-pulse), not spinner
      const skeletonElement = document.querySelector('.animate-pulse');
      expect(skeletonElement).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when API call fails', async () => {
      mockGetCustomers.mockRejectedValueOnce(new Error('Network error'));

      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load customers. Please try again.')).toBeInTheDocument();
      });
    });

    it('should show Try Again button on error', async () => {
      mockGetCustomers.mockRejectedValueOnce(new Error('Network error'));

      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry loading when Try Again is clicked', async () => {
      mockGetCustomers.mockRejectedValueOnce(new Error('Network error'));

      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      mockGetCustomers.mockResolvedValueOnce(mockCustomersData);

      await userEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(mockGetCustomers).toHaveBeenCalledTimes(2);
    });
  });

  describe('Loaded state', () => {
    beforeEach(() => {
      mockGetCustomers.mockResolvedValueOnce(mockCustomersData);
    });

    it('should render without crashing and display title', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('Customers')).toBeInTheDocument();
      });
    });

    it('should display customer count subtitle', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText(/total customers/)).toBeInTheDocument();
      });
    });

    it('should display customer data in table', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should display customer emails in contact column', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });
    });

    it('should display loyalty status badges', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        // LOYALTY_LABELS maps 'vip' -> 'VIP', 'regular' -> 'Regular'
        // 'VIP' appears in stats card, filter dropdown, and table badge
        const vipElements = screen.getAllByText('VIP');
        expect(vipElements.length).toBeGreaterThanOrEqual(1);
        const regularElements = screen.getAllByText('Regular');
        expect(regularElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should display table headers', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        // Actual page headers: "Customer", "Contact", "Type", "Status", "Orders", "Spent"
        expect(screen.getByText('Customer')).toBeInTheDocument();
        expect(screen.getByText('Contact')).toBeInTheDocument();
        expect(screen.getByText('Type')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Spent')).toBeInTheDocument();
      });
    });

    it('should display search input', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search customers...')).toBeInTheDocument();
      });
    });

    it('should display summary cards', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        // Stats cards show "Total", "Corporate", "VIP", "Total Revenue"
        expect(screen.getByText('Total')).toBeInTheDocument();
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      });
    });

    it('should display pagination', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 1/)).toBeInTheDocument();
        expect(screen.getByText('Previous')).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
    });
  });
});
