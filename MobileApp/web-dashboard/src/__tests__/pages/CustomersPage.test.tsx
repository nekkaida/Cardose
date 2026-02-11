/**
 * CustomersPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomersPage from '../../pages/CustomersPage';

// Mock useNavigate
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/customers', search: '' }),
}));

// Mock ApiContext
const mockGetCustomers = jest.fn();

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: jest.fn(),
    getOrders: jest.fn(),
    createOrder: jest.fn(),
    updateOrder: jest.fn(),
    getCustomers: mockGetCustomers,
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
        'customers.title': 'Customers',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.search': 'Search',
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
};

describe('CustomersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading spinner initially', () => {
      mockGetCustomers.mockImplementation(() => new Promise(() => {}));
      render(<CustomersPage />);

      const spinnerContainer = document.querySelector('.animate-spin');
      expect(spinnerContainer).toBeInTheDocument();
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

    it('should display subtitle', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('Manage customer relationships and data')).toBeInTheDocument();
      });
    });

    it('should display customer data in table', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should display customer emails', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });
    });

    it('should display loyalty status badges', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('vip')).toBeInTheDocument();
        expect(screen.getByText('regular')).toBeInTheDocument();
      });
    });

    it('should display table headers', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByText('Phone')).toBeInTheDocument();
        expect(screen.getByText('Type')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Total Spent')).toBeInTheDocument();
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
        expect(screen.getByText('Total Customers')).toBeInTheDocument();
        // "Corporate" appears in both filter dropdown and summary card
        const corporateElements = screen.getAllByText('Corporate');
        expect(corporateElements.length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      });
    });

    it('should display pagination', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
        expect(screen.getByText('Previous')).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
    });

    it('should show empty state when no customers match search', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search customers...');
      await userEvent.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No customers match your search.')).toBeInTheDocument();
      });
    });
  });
});
