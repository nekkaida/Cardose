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
    user: { id: '1', username: 'admin', email: 'admin@test.com', role: 'owner' },
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
const mockCreateOrder = vi.fn().mockResolvedValue({});
const mockUpdateOrder = vi.fn().mockResolvedValue({});
const mockUpdateOrderStatus = vi.fn().mockResolvedValue({});
const mockDeleteOrder = vi.fn().mockResolvedValue({});

vi.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: vi.fn().mockResolvedValue({}),
    getOrders: mockGetOrders,
    createOrder: mockCreateOrder,
    updateOrder: mockUpdateOrder,
    updateOrderStatus: mockUpdateOrderStatus,
    deleteOrder: mockDeleteOrder,
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

// Mock LanguageContext — stable t function to avoid useCallback invalidation
const mockTranslations: Record<string, string> = {
  'orders.title': 'Order Management',
  'orders.new': 'New Order',
  'orders.pending': 'Pending',
  'orders.completed': 'Completed',
  'orders.cancelled': 'Cancelled',
  'orders.active': 'Active',
  'orders.overdue': 'Overdue',
  'orders.totalValue': 'Total Value',
  'orders.newOrder': 'New Order',
  'orders.editOrder': 'Edit Order',
  'orders.deleteOrder': 'Delete Order',
  'orders.updateStatus': 'Update Status',
  'orders.customer': 'Customer',
  'orders.boxType': 'Box Type',
  'orders.amount': 'Amount',
  'orders.dueDate': 'Due Date',
  'orders.specialRequests': 'Special Requests',
  'orders.noOrders': 'No orders found',
  'orders.createFirst': 'Create your first order to get started.',
  'orders.adjustFilters': 'Try adjusting your filters.',
  'orders.confirmDelete':
    'Are you sure? This will permanently delete this order and its stage history.',
  'orders.allStatus': 'All Status',
  'orders.allPriority': 'All Priority',
  'orders.statusPending': 'Pending',
  'orders.statusDesigning': 'Designing',
  'orders.statusApproved': 'Approved',
  'orders.statusProduction': 'Production',
  'orders.statusQC': 'Quality Control',
  'orders.statusCompleted': 'Completed',
  'orders.statusCancelled': 'Cancelled',
  'orders.priorityLow': 'Low',
  'orders.priorityNormal': 'Normal',
  'orders.priorityHigh': 'High',
  'orders.priorityUrgent': 'Urgent',
  'orders.colOrder': 'Order',
  'orders.colStatus': 'Status',
  'orders.colPriority': 'Priority',
  'orders.colActions': 'Actions',
  'orders.design': 'design',
  'orders.prod': 'prod',
  'orders.previous': 'Previous',
  'orders.next': 'Next',
  'orders.pageInfo': 'Page {page} of {totalPages} ({total} orders)',
  'orders.searchCustomers': 'Search customers...',
  'orders.selectCustomer': 'Select customer...',
  'orders.customerRequired': 'Customer *',
  'orders.amountIDR': 'Amount (IDR)',
  'orders.optionalNotes': 'Optional notes or special requests...',
  'orders.saving': 'Saving...',
  'orders.updating': 'Updating...',
  'orders.deleting': 'Deleting...',
  'orders.update': 'Update',
  'orders.createBtn': 'Create',
  'orders.createOrder': 'Create Order',
  'orders.loadError': 'Failed to load orders. Please try again.',
  'orders.loadCustomerError': 'Failed to load customer list',
  'orders.tryAgain': 'Try Again',
  'orders.selectCustomerError': 'Please select a customer.',
  'orders.amountError': 'Amount must be a positive number.',
  'orders.saveError': 'Failed to save order. Please try again.',
  'orders.deleteError': 'Failed to delete order',
  'orders.statusError': 'Failed to update status',
  'orders.createSuccess': 'Order created successfully',
  'orders.updateSuccess': 'Order updated successfully',
  'orders.deleteSuccess': 'Order deleted successfully',
  'orders.statusSuccess': 'Status updated successfully',
  'orders.totalOrders': '{n} total orders',
  'orders.overdueCount': '({n} overdue)',
  'orders.box': 'box',
  'orders.boxNone': '— None —',
  'orders.boxStandard': 'Standard',
  'orders.boxPremium': 'Premium',
  'orders.boxLuxury': 'Luxury',
  'orders.boxCustom': 'Custom',
  'orders.notes': 'Notes',
  'orders.notesPlaceholder': 'Internal notes (not visible to customer)...',
  'orders.specialRequestsPlaceholder': 'Customer specifications, design details...',
  'orders.pastDateWarning': 'This date is in the past',
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.search': 'Search',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.deleting': 'Deleting...',
  'common.cancel': 'Cancel',
  'common.confirmDeleteGeneric': 'Are you sure you want to delete',
};
const mockT = (key: string) => mockTranslations[key] || key;
const mockSetLanguage = vi.fn();
const mockLanguageValue = { language: 'en' as const, setLanguage: mockSetLanguage, t: mockT };

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => mockLanguageValue,
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
      updated_at: '2025-01-15',
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
      updated_at: '2025-01-10',
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

const mockCustomersData = {
  customers: [
    { id: 'c1', name: 'John Doe' },
    { id: 'c2', name: 'Jane Smith' },
    { id: 'c3', name: 'Bob Wilson' },
  ],
};

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCustomers.mockResolvedValue({ customers: [] });
  });

  describe('Loading state', () => {
    it('should show loading skeleton initially', () => {
      mockGetOrders.mockImplementation(() => new Promise(() => {}));
      render(<OrdersPage />);

      const skeletonElement = document.querySelector('.animate-pulse');
      expect(skeletonElement).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show inline error message when API call fails', async () => {
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

      const callsBefore = mockGetOrders.mock.calls.length;
      mockGetOrders.mockResolvedValueOnce(mockOrdersData);

      await userEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });

      expect(mockGetOrders.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  describe('Loaded state', () => {
    beforeEach(() => {
      mockGetOrders.mockResolvedValueOnce(mockOrdersData);
    });

    it('should render without crashing and display title', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('Order Management')).toBeInTheDocument();
      });
    });

    it('should display order count subtitle via i18n', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('2 total orders')).toBeInTheDocument();
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

    it('should display i18n table headers', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('Order')).toBeInTheDocument();
        expect(screen.getByText('Customer')).toBeInTheDocument();
        expect(screen.getByText('Priority')).toBeInTheDocument();
        expect(screen.getByText('Amount')).toBeInTheDocument();
        expect(screen.getByText('Due Date')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });

    it('should display i18n priority badges', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('Normal')).toBeInTheDocument();
        expect(screen.getByText('Urgent')).toBeInTheDocument();
      });
    });

    it('should display i18n status badges', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        // 'Pending' appears in stat card, status filter dropdown, and table badge
        const pendingElements = screen.getAllByText('Pending');
        expect(pendingElements.length).toBeGreaterThanOrEqual(2);
        // 'Completed' in stat card, filter dropdown, and table badge
        const completedElements = screen.getAllByText('Completed');
        expect(completedElements.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should display stats cards with i18n labels', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        // These appear multiple times (stat cards + filter dropdowns + table badges)
        expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Total Value')).toBeInTheDocument();
      });
    });

    it('should display New Order button', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(/New Order/)).toBeInTheDocument();
      });
    });

    it('should display i18n pagination', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 1 (2 orders)')).toBeInTheDocument();
        expect(screen.getByText('Previous')).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
    });

    it('should display Edit and Delete buttons for owner role', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        expect(editButtons.length).toBe(2);
        // owner role has canDelete permission
        const deleteButtons = screen.getAllByText('Delete');
        expect(deleteButtons.length).toBe(2);
      });
    });

    it('should have search input with placeholder', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      });
    });

    it('should have filter dropdowns for status and priority', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        // Filter selects render "All Status" and "All Priority" as their default options
        expect(screen.getByText('All Status')).toBeInTheDocument();
        expect(screen.getByText('All Priority')).toBeInTheDocument();
      });
    });

    it('should have sortable column headers', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        // Sortable columns have cursor-pointer class and click handlers
        const headers = document.querySelectorAll('th.cursor-pointer');
        expect(headers.length).toBeGreaterThanOrEqual(6);
      });
    });

    it('should display box type with i18n label', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(/standard box/i)).toBeInTheDocument();
        expect(screen.getByText(/premium box/i)).toBeInTheDocument();
      });
    });
  });

  describe('Modal interactions', () => {
    beforeEach(() => {
      mockGetOrders.mockResolvedValue(mockOrdersData);
      mockGetCustomers.mockResolvedValue(mockCustomersData);
    });

    it('should open create modal when New Order is clicked', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText(/New Order/));

      await waitFor(() => {
        expect(screen.getByText('New Order', { selector: 'h2' })).toBeInTheDocument();
        expect(screen.getByText('Customer *')).toBeInTheDocument();
      });
    });

    it('should open edit modal with order data', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[0]);

      await waitFor(() => {
        // Modal header shows "Edit Order"
        expect(screen.getByText('Edit Order')).toBeInTheDocument();
        // Customer name visible in table row
        const customerLabels = screen.getAllByText('John Doe');
        expect(customerLabels.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should close modal on Cancel click', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText(/New Order/));

      await waitFor(() => {
        expect(screen.getByText('New Order', { selector: 'h2' })).toBeInTheDocument();
      });

      // Click the Cancel button in the modal footer
      const cancelButtons = screen.getAllByText('Cancel');
      await userEvent.click(cancelButtons[cancelButtons.length - 1]);

      await waitFor(() => {
        expect(screen.queryByText('New Order', { selector: 'h2' })).not.toBeInTheDocument();
      });
    });

    it('should show special requests field in create modal', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText(/New Order/));

      await waitFor(() => {
        expect(screen.getByText('Special Requests')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/optional notes/i)).toBeInTheDocument();
      });
    });

    it('should show box type options in create modal', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText(/New Order/));

      await waitFor(() => {
        // Box type select should show available options
        expect(screen.getByText('Box Type')).toBeInTheDocument();
        expect(screen.getByText('Standard')).toBeInTheDocument();
      });
    });

    it('should not show customer select in edit mode', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Order')).toBeInTheDocument();
        // Should NOT show customer search input in edit mode
        expect(screen.queryByPlaceholderText('Search customers...')).not.toBeInTheDocument();
        // Customer name 'John Doe' appears in table row
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should disable save button when no customer is selected', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText(/New Order/));

      await waitFor(() => {
        expect(screen.getByText('New Order', { selector: 'h2' })).toBeInTheDocument();
      });

      // Create button should be disabled when no customer is selected
      const createBtn = screen.getByText('Create');
      expect(createBtn).toBeDisabled();
    });

    it('should open status update modal when status badge is clicked', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });

      // Click the Pending status badge in the table (it's a button with cursor-pointer class)
      const statusBadges = document.querySelectorAll('button.cursor-pointer');
      expect(statusBadges.length).toBeGreaterThan(0);
      await userEvent.click(statusBadges[0] as HTMLElement);

      await waitFor(() => {
        expect(screen.getByText('Update Status')).toBeInTheDocument();
      });
    });
  });

  describe('Empty state', () => {
    it('should show empty state with Create Order button when no filters active', async () => {
      mockGetOrders.mockResolvedValueOnce({
        ...mockOrdersData,
        orders: [],
        total: 0,
        stats: { ...mockOrdersData.stats, total: 0 },
      });

      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('No orders found')).toBeInTheDocument();
        expect(screen.getByText('Create your first order to get started.')).toBeInTheDocument();
        expect(screen.getByText(/Create Order/)).toBeInTheDocument();
      });
    });
  });

  describe('Delete flow', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockGetOrders.mockResolvedValue(mockOrdersData);
      mockGetCustomers.mockResolvedValue(mockCustomersData);
    });

    it('should open delete confirmation when Delete is clicked', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
    });

    it('should call deleteOrder API when confirmed', async () => {
      mockDeleteOrder.mockResolvedValueOnce({});
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });

      const dialogDeleteBtns = screen
        .getAllByRole('button')
        .filter((b) => b.textContent === 'Delete');
      await userEvent.click(dialogDeleteBtns[dialogDeleteBtns.length - 1]);

      await waitFor(() => {
        expect(mockDeleteOrder).toHaveBeenCalledWith('1');
      });
    });

    it('should close delete dialog on Cancel', async () => {
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /Cancel/ }));

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
    });

    it('should show inline error on delete failure', async () => {
      mockDeleteOrder.mockRejectedValueOnce({
        response: { data: { error: 'Cannot delete this order' } },
      });
      render(<OrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });

      const dialogDeleteBtns = screen
        .getAllByRole('button')
        .filter((b) => b.textContent === 'Delete');
      await userEvent.click(dialogDeleteBtns[dialogDeleteBtns.length - 1]);

      await waitFor(() => {
        expect(screen.getByText('Cannot delete this order')).toBeInTheDocument();
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
    });
  });
});
