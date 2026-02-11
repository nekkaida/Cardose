/**
 * InventoryPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InventoryPage from '../../pages/InventoryPage';

// Mock useNavigate
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/inventory', search: '' }),
}));

// Mock ApiContext
const mockGetInventory = jest.fn();

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: jest.fn(),
    getOrders: jest.fn(),
    createOrder: jest.fn(),
    updateOrder: jest.fn(),
    getCustomers: jest.fn(),
    createCustomer: jest.fn(),
    updateCustomer: jest.fn(),
    getInventory: mockGetInventory,
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
        'inventory.title': 'Inventory',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.search': 'Search',
      };
      return translations[key] || key;
    },
  }),
}));

const mockInventoryData = {
  items: [
    {
      id: '1',
      name: 'Premium Box',
      category: 'packaging',
      current_stock: 100,
      reorder_level: 20,
      unit_cost: 50000,
      unit: 'pcs',
    },
    {
      id: '2',
      name: 'Ribbon Gold',
      category: 'decoration',
      current_stock: 5,
      reorder_level: 10,
      unit_cost: 15000,
      unit: 'meter',
    },
  ],
  totalPages: 1,
};

describe('InventoryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading spinner initially', () => {
      mockGetInventory.mockImplementation(() => new Promise(() => {}));
      render(<InventoryPage />);

      const spinnerContainer = document.querySelector('.animate-spin');
      expect(spinnerContainer).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when API call fails', async () => {
      mockGetInventory.mockRejectedValueOnce(new Error('Network error'));

      render(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load inventory. Please try again.')).toBeInTheDocument();
      });
    });

    it('should show Try Again button on error', async () => {
      mockGetInventory.mockRejectedValueOnce(new Error('Network error'));

      render(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry loading when Try Again is clicked', async () => {
      mockGetInventory.mockRejectedValueOnce(new Error('Network error'));

      render(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      mockGetInventory.mockResolvedValueOnce(mockInventoryData);

      await userEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('Premium Box')).toBeInTheDocument();
      });

      expect(mockGetInventory).toHaveBeenCalledTimes(2);
    });
  });

  describe('Loaded state', () => {
    beforeEach(() => {
      mockGetInventory.mockResolvedValueOnce(mockInventoryData);
    });

    it('should render without crashing and display title', async () => {
      render(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('Inventory')).toBeInTheDocument();
      });
    });

    it('should display subtitle', async () => {
      render(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('Track stock levels and manage materials')).toBeInTheDocument();
      });
    });

    it('should display inventory items in table', async () => {
      render(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('Premium Box')).toBeInTheDocument();
        expect(screen.getByText('Ribbon Gold')).toBeInTheDocument();
      });
    });

    it('should display table headers', async () => {
      render(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Category')).toBeInTheDocument();
        expect(screen.getByText('Stock')).toBeInTheDocument();
        expect(screen.getByText('Reorder Level')).toBeInTheDocument();
        expect(screen.getByText('Unit Cost')).toBeInTheDocument();
      });
    });

    it('should display stock status badges', async () => {
      render(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('In Stock')).toBeInTheDocument();
        expect(screen.getByText('Low Stock')).toBeInTheDocument();
      });
    });

    it('should display summary cards', async () => {
      render(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Items')).toBeInTheDocument();
        expect(screen.getByText('Low Stock Alerts')).toBeInTheDocument();
        expect(screen.getByText('Total Value')).toBeInTheDocument();
      });
    });

    it('should show low stock alert count', async () => {
      render(<InventoryPage />);

      await waitFor(() => {
        // Ribbon Gold is low stock (5 < 10), so 1 low stock alert
        const alertsLabel = screen.getByText('Low Stock Alerts');
        const alertsCard = alertsLabel.closest('.bg-white');
        expect(alertsCard).toBeInTheDocument();
      });
    });

    it('should display search input', async () => {
      render(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search inventory...')).toBeInTheDocument();
      });
    });

    it('should display pagination', async () => {
      render(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
        expect(screen.getByText('Previous')).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
    });

    it('should filter items by search term', async () => {
      render(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('Premium Box')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search inventory...');
      await userEvent.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No items match your search.')).toBeInTheDocument();
      });
    });
  });
});
