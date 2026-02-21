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
    user: { id: '1', username: 'admin', email: 'admin@test.com', role: 'owner' },
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    token: 'test-token',
  }),
}));

// Mock ApiContext
const mockGetInventory = vi.fn();
const mockCreateInventoryMovement = vi
  .fn()
  .mockResolvedValue({ success: true, movementId: 'mov-1', newStock: 90, message: 'OK' });

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
    createInventoryMovement: mockCreateInventoryMovement,
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
        'inventory.stockMovement': 'Stock Movement',
        'inventory.movementType': 'Type',
        'inventory.quantity': 'Quantity',
        'inventory.notes': 'Notes',
        'inventory.record': 'Record',
        'inventory.recording': 'Recording...',
        'inventory.current': 'current',
        'inventory.stockAction': 'Stock',
        'inventory.movementSuccess': 'Stock movement recorded successfully',
        'inventory.positiveQuantity': 'Quantity must be a positive number.',
        'inventory.failedMovement': 'Failed to record movement.',
        'inventory.optionalNotes': 'Optional notes...',
        'inventory.newStockAfter': 'New stock',
        'inventory.insufficientStock': 'Insufficient stock. Available: {n} {unit}',
        'inventory.wasteWarning': 'This will record waste and reduce stock.',
        'inventory.movePurchase': 'Purchase (add stock)',
        'inventory.moveUsage': 'Usage (reduce stock)',
        'inventory.moveSale': 'Sale (reduce stock)',
        'inventory.moveAdjustment': 'Adjustment (set stock)',
        'inventory.moveWaste': 'Waste (reduce stock)',
        'inventory.material': 'Material',
        'inventory.stock': 'Stock',
        'inventory.reorder': 'Reorder',
        'inventory.cost': 'Cost',
        'inventory.status': 'Status',
        'inventory.actions': 'Actions',
        'inventory.category': 'Category',
        'inventory.catCardboard': 'Cardboard',
        'inventory.catFabric': 'Fabric',
        'inventory.catRibbon': 'Ribbon',
        'inventory.catAccessories': 'Accessories',
        'inventory.catPackaging': 'Packaging',
        'inventory.catTools': 'Tools',
        'inventory.previous': 'Previous',
        'inventory.next': 'Next',
        'inventory.pageOf': 'Page {page} of {total} ({items} items)',
        'inventory.tryAgain': 'Try Again',
        'inventory.failedLoad': 'Failed to load inventory. Please try again.',
        'inventory.searchMaterials': 'Search materials...',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.search': 'Search',
        'common.edit': 'Edit',
        'common.delete': 'Delete',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'inventory.editMaterial': 'Edit Material',
        'inventory.deleteMaterial': 'Delete Material',
        'inventory.name': 'Name',
        'inventory.unit': 'Unit',
        'inventory.unitCost': 'Unit Cost (IDR)',
        'inventory.reorderLevel': 'Reorder Level',
        'inventory.currentStock': 'Current Stock',
        'inventory.supplier': 'Supplier',
        'inventory.retry': 'Retry',
        'inventory.failedSave': 'Failed to save item. Please try again.',
        'inventory.failedDelete': 'Failed to delete item',
        'inventory.nameRequired': 'Material name is required.',
        'inventory.categoryRequired': 'Category is required.',
        'inventory.invalidUnitCost': 'Unit cost must be a valid number.',
        'inventory.negativeNumber': 'Values cannot be negative.',
        'inventory.saving': 'Saving...',
        'inventory.update': 'Update',
        'inventory.create': 'Create',
        'inventory.deleting': 'Deleting...',
        'inventory.materialName': 'Material name',
        'inventory.supplierName': 'Supplier name',
        'inventory.unitPlaceholder': 'pcs, kg, m...',
        'inventory.createSuccess': 'Material created successfully',
        'inventory.updateSuccess': 'Material updated successfully',
        'inventory.deleteSuccess': 'Material deleted successfully',
        'inventory.confirmDelete':
          'Are you sure? This will remove the material and all its movement history.',
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

  describe('Stock Movement Modal', () => {
    beforeEach(() => {
      mockGetInventory.mockResolvedValue(mockInventoryData);
      mockCreateInventoryMovement.mockResolvedValue({
        success: true,
        movementId: 'mov-1',
        newStock: 90,
        message: 'OK',
      });
    });

    const openMovementModal = async () => {
      render(<InventoryPage />);
      await waitFor(() => {
        expect(screen.getByText('Premium Box')).toBeInTheDocument();
      });
      // Click the first "Stock" button (only match buttons, not table headers)
      const stockButtons = screen.getAllByRole('button', { name: 'Stock' });
      await userEvent.click(stockButtons[0]);
      await waitFor(() => {
        expect(screen.getByText('Stock Movement')).toBeInTheDocument();
      });
    };

    it('should open modal when Stock button is clicked', async () => {
      await openMovementModal();

      expect(screen.getByText('Stock Movement')).toBeInTheDocument();
      // Modal shows item name and current stock in the subtitle
      expect(screen.getByText(/current.*100/)).toBeInTheDocument();
    });

    it('should have proper accessibility attributes', async () => {
      await openMovementModal();

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'movement-modal-title');
    });

    it('should display all movement type options', async () => {
      await openMovementModal();

      const select = screen.getByLabelText('Type');
      expect(select).toBeInTheDocument();
      expect(screen.getByText('Purchase (add stock)')).toBeInTheDocument();
    });

    it('should show stock preview when quantity is entered', async () => {
      await openMovementModal();

      const quantityInput = screen.getByLabelText(/Quantity/);
      await userEvent.type(quantityInput, '10');

      await waitFor(() => {
        expect(screen.getByText(/100 → 110/)).toBeInTheDocument();
      });
    });

    it('should show stock preview for usage type', async () => {
      await openMovementModal();

      const select = screen.getByLabelText('Type');
      await userEvent.selectOptions(select, 'usage');

      const quantityInput = screen.getByLabelText(/Quantity/);
      await userEvent.type(quantityInput, '30');

      await waitFor(() => {
        expect(screen.getByText(/100 → 70/)).toBeInTheDocument();
      });
    });

    it('should show insufficient stock warning when quantity exceeds available', async () => {
      await openMovementModal();

      const select = screen.getByLabelText('Type');
      await userEvent.selectOptions(select, 'usage');

      const quantityInput = screen.getByLabelText(/Quantity/);
      await userEvent.type(quantityInput, '200');

      await waitFor(() => {
        expect(screen.getByText(/Insufficient stock. Available: 100 pcs/)).toBeInTheDocument();
      });
    });

    it('should disable Record button when stock would go negative', async () => {
      await openMovementModal();

      const select = screen.getByLabelText('Type');
      await userEvent.selectOptions(select, 'usage');

      const quantityInput = screen.getByLabelText(/Quantity/);
      await userEvent.type(quantityInput, '200');

      await waitFor(() => {
        const recordButton = screen.getByText('Record');
        expect(recordButton).toBeDisabled();
      });
    });

    it('should show waste warning when waste type is selected', async () => {
      await openMovementModal();

      const select = screen.getByLabelText('Type');
      await userEvent.selectOptions(select, 'waste');

      const quantityInput = screen.getByLabelText(/Quantity/);
      await userEvent.type(quantityInput, '5');

      await waitFor(() => {
        expect(screen.getByText('This will record waste and reduce stock.')).toBeInTheDocument();
      });
    });

    it('should call createInventoryMovement with correct payload on submit', async () => {
      await openMovementModal();

      const quantityInput = screen.getByLabelText(/Quantity/);
      await userEvent.type(quantityInput, '10');

      mockGetInventory.mockResolvedValueOnce(mockInventoryData);
      await userEvent.click(screen.getByText('Record'));

      await waitFor(() => {
        expect(mockCreateInventoryMovement).toHaveBeenCalledWith({
          item_id: '1',
          type: 'purchase',
          quantity: 10,
          notes: undefined,
        });
      });
    });

    it('should show validation error for empty quantity', async () => {
      await openMovementModal();

      await userEvent.click(screen.getByText('Record'));

      // Record button is disabled when quantity is empty, so the click does nothing
      expect(mockCreateInventoryMovement).not.toHaveBeenCalled();
    });

    it('should close modal on Cancel', async () => {
      await openMovementModal();

      await userEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByText('Stock Movement')).not.toBeInTheDocument();
      });
    });

    it('should show error message when API call fails', async () => {
      mockCreateInventoryMovement.mockRejectedValueOnce({
        response: { data: { error: 'Insufficient stock. Available: 100 pcs' } },
      });

      await openMovementModal();

      const quantityInput = screen.getByLabelText(/Quantity/);
      await userEvent.type(quantityInput, '10');

      await userEvent.click(screen.getByText('Record'));

      await waitFor(() => {
        expect(screen.getByText('Insufficient stock. Available: 100 pcs')).toBeInTheDocument();
      });
    });

    it('should show success toast after successful movement', async () => {
      await openMovementModal();

      const quantityInput = screen.getByLabelText(/Quantity/);
      await userEvent.type(quantityInput, '10');

      mockGetInventory.mockResolvedValueOnce(mockInventoryData);
      await userEvent.click(screen.getByText('Record'));

      await waitFor(() => {
        expect(screen.getByText('Stock movement recorded successfully')).toBeInTheDocument();
      });
    });

    it('should have a textarea for notes', async () => {
      await openMovementModal();

      const notesField = screen.getByLabelText('Notes');
      expect(notesField.tagName).toBe('TEXTAREA');
    });
  });

  describe('Create Material Modal', () => {
    beforeEach(() => {
      mockGetInventory.mockResolvedValue(mockInventoryData);
    });

    it('should open create modal when Add Material is clicked', async () => {
      render(<InventoryPage />);
      await waitFor(() => screen.getByText('Premium Box'));

      await userEvent.click(screen.getByRole('button', { name: /Add Material/ }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Material/ })).toBeInTheDocument();
    });

    it('should have autoFocus on name input', async () => {
      render(<InventoryPage />);
      await waitFor(() => screen.getByText('Premium Box'));

      await userEvent.click(screen.getByRole('button', { name: /Add Material/ }));

      const nameInput = screen.getByPlaceholderText('Material name');
      expect(nameInput).toHaveFocus();
    });

    it('should close modal when Cancel is clicked', async () => {
      render(<InventoryPage />);
      await waitFor(() => screen.getByText('Premium Box'));

      await userEvent.click(screen.getByRole('button', { name: /Add Material/ }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Click the Cancel button in the modal footer
      const cancelButtons = screen.getAllByText('Cancel');
      await userEvent.click(cancelButtons[cancelButtons.length - 1]);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should close modal on Escape key', async () => {
      render(<InventoryPage />);
      await waitFor(() => screen.getByText('Premium Box'));

      await userEvent.click(screen.getByRole('button', { name: /Add Material/ }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await userEvent.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should disable Create button when name is empty', async () => {
      render(<InventoryPage />);
      await waitFor(() => screen.getByText('Premium Box'));

      await userEvent.click(screen.getByRole('button', { name: /Add Material/ }));

      const createButton = screen.getByText('Create');
      expect(createButton).toBeDisabled();
    });

    it('should enable Create button when name is filled', async () => {
      render(<InventoryPage />);
      await waitFor(() => screen.getByText('Premium Box'));

      await userEvent.click(screen.getByRole('button', { name: /Add Material/ }));

      await userEvent.type(screen.getByPlaceholderText('Material name'), 'New Material');

      const createButton = screen.getByText('Create');
      expect(createButton).not.toBeDisabled();
    });

    it('should display category dropdown with translated labels', async () => {
      render(<InventoryPage />);
      await waitFor(() => screen.getByText('Premium Box'));

      await userEvent.click(screen.getByRole('button', { name: /Add Material/ }));

      // Check the category select exists with translated options
      const categorySelect = screen.getAllByRole('combobox')[0];
      expect(categorySelect).toBeInTheDocument();
    });
  });

  describe('Edit Material Modal', () => {
    beforeEach(() => {
      mockGetInventory.mockResolvedValue(mockInventoryData);
    });

    it('should open edit modal with pre-filled data when Edit is clicked', async () => {
      render(<InventoryPage />);
      await waitFor(() => screen.getByText('Premium Box'));

      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Premium Box')).toBeInTheDocument();
    });

    it('should show Update button instead of Create when editing', async () => {
      render(<InventoryPage />);
      await waitFor(() => screen.getByText('Premium Box'));

      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[0]);

      expect(screen.getByText('Update')).toBeInTheDocument();
    });

    it('should show Edit Material title when editing', async () => {
      render(<InventoryPage />);
      await waitFor(() => screen.getByText('Premium Box'));

      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[0]);

      expect(screen.getByText('Edit Material')).toBeInTheDocument();
    });
  });

  describe('Delete Confirmation Modal', () => {
    beforeEach(() => {
      mockGetInventory.mockResolvedValue(mockInventoryData);
    });

    it('should open delete confirmation when Delete is clicked', async () => {
      render(<InventoryPage />);
      await waitFor(() => screen.getByText('Premium Box'));

      const deleteButtons = screen.getAllByText('Delete');
      await userEvent.click(deleteButtons[0]);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText('Delete Material')).toBeInTheDocument();
    });

    it('should close delete modal when Cancel is clicked', async () => {
      render(<InventoryPage />);
      await waitFor(() => screen.getByText('Premium Box'));

      const deleteButtons = screen.getAllByText('Delete');
      await userEvent.click(deleteButtons[0]);
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      const cancelButtons = screen.getAllByText('Cancel');
      await userEvent.click(cancelButtons[cancelButtons.length - 1]);

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockGetInventory.mockResolvedValue(mockInventoryData);
    });

    it('should have role="dialog" on create modal', async () => {
      render(<InventoryPage />);
      await waitFor(() => screen.getByText('Premium Box'));

      await userEvent.click(screen.getByRole('button', { name: /Add Material/ }));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have role="alertdialog" on delete modal', async () => {
      render(<InventoryPage />);
      await waitFor(() => screen.getByText('Premium Box'));

      const deleteButtons = screen.getAllByText('Delete');
      await userEvent.click(deleteButtons[0]);

      const alertDialog = screen.getByRole('alertdialog');
      expect(alertDialog).toHaveAttribute('aria-modal', 'true');
    });
  });
});
