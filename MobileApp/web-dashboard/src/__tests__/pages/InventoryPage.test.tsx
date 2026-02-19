/**
 * InventoryPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InventoryPage from '../../pages/InventoryPage';

// Mock useNavigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/inventory', search: '' }),
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
const mockGetInventory = vi.fn();

vi.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: vi.fn().mockResolvedValue({}),
    getOrders: vi.fn().mockResolvedValue({}),
    createOrder: vi.fn().mockResolvedValue({}),
    updateOrder: vi.fn().mockResolvedValue({}),
    getCustomers: vi.fn().mockResolvedValue({}),
    createCustomer: vi.fn().mockResolvedValue({}),
    updateCustomer: vi.fn().mockResolvedValue({}),
    getInventory: mockGetInventory,
    createInventoryItem: vi.fn().mockResolvedValue({}),
    updateInventoryItem: vi.fn().mockResolvedValue({}),
    updateInventoryStock: vi.fn().mockResolvedValue({}),
    deleteInventoryItem: vi.fn().mockResolvedValue({}),
    createInventoryMovement: vi.fn().mockResolvedValue({}),
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
        'inventory.title': 'Inventory',
        'inventory.materialsTracked': 'materials tracked',
        'inventory.addMaterial': 'Add Material',
        'inventory.totalItems': 'Total Items',
        'inventory.lowStock': 'Low Stock',
        'inventory.outOfStock': 'Out of Stock',
        'inventory.totalValue': 'Total Value',
        'inventory.inStock': 'In Stock',
        'inventory.allCategories': 'All Categories',
        'inventory.noItems': 'No items found',
        'inventory.adjustFilters': 'Try adjusting your filters.',
        'inventory.createFirst': 'Add your first material to get started.',
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
  total: 2,
  stats: {
    total: 2,
    lowStock: 1,
    outOfStock: 0,
    totalValue: 5075000,
  },
};

describe('InventoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading skeleton initially', () => {
      mockGetInventory.mockImplementation(() => new Promise(() => {}));
      render(<InventoryPage />);

      // InventoryPage uses skeleton rows with animate-pulse, not spinner
      const skeletonElement = document.querySelector('.animate-pulse');
      expect(skeletonElement).toBeInTheDocument();
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

    it('should display materials count subtitle', async () => {
      render(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText(/materials tracked/)).toBeInTheDocument();
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
        // The actual page headers: "Material", "Category", "Stock", "Reorder", "Cost", "Status", "Actions"
        expect(screen.getByText('Material')).toBeInTheDocument();
        expect(screen.getByText('Category')).toBeInTheDocument();
        expect(screen.getByText('Stock')).toBeInTheDocument();
        expect(screen.getByText('Reorder')).toBeInTheDocument();
        expect(screen.getByText('Cost')).toBeInTheDocument();
      });
    });

    it('should display stock status badges', async () => {
      render(<InventoryPage />);

      await waitFor(() => {
        // 'In Stock' appears as a table badge
        const inStockElements = screen.getAllByText('In Stock');
        expect(inStockElements.length).toBeGreaterThanOrEqual(1);
        // 'Low Stock' appears in both the stats card and as a table badge
        const lowStockElements = screen.getAllByText('Low Stock');
        expect(lowStockElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should display summary cards', async () => {
      render(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Items')).toBeInTheDocument();
        // "Low Stock" appears in stats card AND possibly as a badge
        const lowStockElements = screen.getAllByText('Low Stock');
        expect(lowStockElements.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Total Value')).toBeInTheDocument();
      });
    });

    it('should display search input', async () => {
      render(<InventoryPage />);

      await waitFor(() => {
        // Placeholder is "Search materials..." (from t('common.search') + ' materials...')
        expect(screen.getByPlaceholderText('Search materials...')).toBeInTheDocument();
      });
    });

    it('should display pagination', async () => {
      render(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 1/)).toBeInTheDocument();
        expect(screen.getByText('Previous')).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
    });
  });
});
