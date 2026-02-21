/**
 * CustomersPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomersPage from '../../pages/CustomersPage';

// Mock useNavigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/customers', search: '' }),
}));

// Mock AuthContext - owner role by default for delete tests
let mockUserRole = 'owner';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'admin', email: 'admin@test.com', role: mockUserRole },
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    token: 'test-token',
  }),
}));

// Mock ApiContext
const mockGetCustomers = vi.fn();
const mockCreateCustomer = vi.fn();
const mockUpdateCustomer = vi.fn();
const mockDeleteCustomer = vi.fn();

vi.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: vi.fn().mockResolvedValue({}),
    getOrders: vi.fn().mockResolvedValue({}),
    getOrderStats: vi.fn().mockResolvedValue({}),
    createOrder: vi.fn().mockResolvedValue({}),
    updateOrder: vi.fn().mockResolvedValue({}),
    updateOrderStatus: vi.fn().mockResolvedValue({}),
    deleteOrder: vi.fn().mockResolvedValue({}),
    getCustomers: mockGetCustomers,
    createCustomer: mockCreateCustomer,
    updateCustomer: mockUpdateCustomer,
    deleteCustomer: mockDeleteCustomer,
    getInventory: vi.fn().mockResolvedValue({}),
    getInventoryStats: vi.fn().mockResolvedValue({}),
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
    createProductionTask: vi.fn().mockResolvedValue({}),
    updateProductionTask: vi.fn().mockResolvedValue({}),
    updateTaskStatus: vi.fn().mockResolvedValue({}),
    deleteProductionTask: vi.fn().mockResolvedValue({}),
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
    getRecentOrders: vi.fn().mockResolvedValue({ orders: [] }),
  }),
}));

// Mock LanguageContext — stable t function to avoid useCallback invalidation
const mockCustomerTranslations: Record<string, string> = {
  'customers.title': 'Customers',
  'customers.corporate': 'Corporate',
  'customers.individual': 'Individual',
  'customers.wedding': 'Wedding',
  'customers.trading': 'Trading',
  'customers.event': 'Event',
  'customers.new': 'New Customer',
  'customers.editCustomer': 'Edit Customer',
  'customers.deleteCustomer': 'Delete Customer',
  'customers.name': 'Name',
  'customers.email': 'Email',
  'customers.phone': 'Phone',
  'customers.address': 'Address',
  'customers.businessType': 'Business Type',
  'customers.notes': 'Notes',
  'customers.namePlaceholder': 'Customer name',
  'customers.emailPlaceholder': 'email@example.com',
  'customers.phonePlaceholder': '+62...',
  'customers.addressPlaceholder': 'Customer address...',
  'customers.notesPlaceholder': 'Optional notes...',
  'customers.saving': 'Saving...',
  'customers.update': 'Update',
  'customers.create': 'Create',
  'customers.deleting': 'Deleting...',
  'customers.createSuccess': 'Customer created successfully',
  'customers.updateSuccess': 'Customer updated successfully',
  'customers.deleteSuccess': 'Customer deleted successfully',
  'customers.loadError': 'Failed to load customers. Please try again.',
  'customers.saveError': 'Failed to save customer. Please try again.',
  'customers.deleteError': 'Failed to delete customer',
  'customers.nameRequired': 'Customer name is required.',
  'customers.invalidEmail': 'Please enter a valid email address.',
  'customers.invalidPhone': 'Please enter a valid phone number.',
  'customers.tryAgain': 'Try Again',
  'customers.total': 'Total',
  'customers.vip': 'VIP',
  'customers.totalRevenue': 'Total Revenue',
  'customers.previous': 'Previous',
  'customers.next': 'Next',
  'customers.pageInfo': 'Page {page} of {totalPages} ({total} customers)',
  'customers.totalCustomersCount': '{n} total customers',
  'customers.searchPlaceholder': 'Search customers...',
  'customers.customer': 'Customer',
  'customers.contact': 'Contact',
  'customers.type': 'Type',
  'customers.status': 'Status',
  'customers.ordersCol': 'Orders',
  'customers.spent': 'Spent',
  'customers.actions': 'Actions',
  'customers.retry': 'Retry',
  'customers.allTypes': 'All Types',
  'customers.allLoyalty': 'All Loyalty',
  'customers.noCustomers': 'No customers found',
  'customers.createFirst': 'Add your first customer to get started.',
  'customers.adjustFilters': 'Try adjusting your filters.',
  'customers.confirmDelete': 'Are you sure? This will remove all customer data.',
  'customers.close': 'Close',
  'customers.discardTitle': 'Discard changes?',
  'customers.discardMessage': 'You have unsaved changes.',
  'customers.discardBtn': 'Discard',
  'customers.keepEditing': 'Keep Editing',
  'customers.required': '(required)',
  'customers.loyaltyNew': 'New',
  'customers.loyaltyRegular': 'Regular',
  'customers.loyaltyVip': 'VIP',
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.search': 'Search',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.cancel': 'Cancel',
};
const mockT = (key: string) => mockCustomerTranslations[key] || key;
const mockSetLanguage = vi.fn();
const mockLanguageValue = { language: 'en' as const, setLanguage: mockSetLanguage, t: mockT };

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => mockLanguageValue,
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
      address: '123 Main St',
      notes: 'VIP client',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z',
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
      address: '',
      notes: '',
      created_at: '2024-03-20T00:00:00Z',
      updated_at: '2024-05-15T00:00:00Z',
    },
  ],
  totalPages: 1,
  total: 2,
  stats: {
    corporate: 1,
    individual: 1,
    wedding: 0,
    trading: 0,
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
    mockUserRole = 'owner';
    mockCreateCustomer.mockResolvedValue({});
    mockUpdateCustomer.mockResolvedValue({});
    mockDeleteCustomer.mockResolvedValue({});
  });

  describe('Loading state', () => {
    it('should show loading skeleton initially', () => {
      mockGetCustomers.mockImplementation(() => new Promise(() => {}));
      render(<CustomersPage />);

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

      const callsBefore = mockGetCustomers.mock.calls.length;
      mockGetCustomers.mockResolvedValueOnce(mockCustomersData);

      await userEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Verify retry triggered at least one additional call
      expect(mockGetCustomers.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  describe('Loaded state', () => {
    beforeEach(() => {
      mockGetCustomers.mockResolvedValue(mockCustomersData);
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
        const vipElements = screen.getAllByText('VIP');
        expect(vipElements.length).toBeGreaterThanOrEqual(1);
        const regularElements = screen.getAllByText('Regular');
        expect(regularElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should display table headers with i18n keys', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
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

  describe('Create modal', () => {
    beforeEach(() => {
      mockGetCustomers.mockResolvedValue(mockCustomersData);
    });

    it('should open create modal when New Customer button is clicked', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('New Customer')).toBeInTheDocument();
    });

    it('should have accessible modal with aria attributes', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'customer-modal-title');
    });

    it('should have label-input associations via htmlFor/id', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone')).toBeInTheDocument();
      expect(screen.getByLabelText('Business Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Notes')).toBeInTheDocument();
    });

    it('should have required attribute on name field', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      const nameInput = screen.getByLabelText(/Name/);
      expect(nameInput).toHaveAttribute('required');
      expect(nameInput).toHaveAttribute('aria-required', 'true');
    });

    it('should have close button with aria-label', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    it('should show all 5 business types including trading', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      const select = screen.getByLabelText('Business Type');
      const options = within(select as HTMLElement).getAllByRole('option');
      const optionValues = options.map((o) => o.getAttribute('value'));

      expect(optionValues).toContain('corporate');
      expect(optionValues).toContain('individual');
      expect(optionValues).toContain('wedding');
      expect(optionValues).toContain('trading');
      expect(optionValues).toContain('event');
    });

    it('should show notes field in the form', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      expect(screen.getByPlaceholderText('Optional notes...')).toBeInTheDocument();
    });

    it('should validate required name field', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      // Create button should be disabled when name is empty
      const createBtn = screen.getByText('Create');
      expect(createBtn).toBeDisabled();
    });

    it('should show email validation error', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      const nameInput = screen.getByLabelText(/Name/);
      const emailInput = screen.getByLabelText('Email');

      await userEvent.type(nameInput, 'Test Customer');
      await userEvent.type(emailInput, 'invalid-email');

      const createBtn = screen.getByText('Create');
      await userEvent.click(createBtn);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
      });
    });

    it('should show phone validation error', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      const nameInput = screen.getByLabelText(/Name/);
      const phoneInput = screen.getByLabelText('Phone');

      await userEvent.type(nameInput, 'Test Customer');
      await userEvent.type(phoneInput, '12');

      const createBtn = screen.getByText('Create');
      await userEvent.click(createBtn);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid phone number.')).toBeInTheDocument();
      });
    });

    it('should call createCustomer on valid submission', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      const nameInput = screen.getByLabelText(/Name/);
      const emailInput = screen.getByLabelText('Email');

      await userEvent.type(nameInput, 'New Customer Name');
      await userEvent.type(emailInput, 'new@example.com');

      const createBtn = screen.getByText('Create');
      await userEvent.click(createBtn);

      await waitFor(() => {
        expect(mockCreateCustomer).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Customer Name',
            email: 'new@example.com',
            business_type: 'individual',
          })
        );
      });
    });

    it('should show generic error message on API failure (not raw backend error)', async () => {
      mockCreateCustomer.mockRejectedValueOnce({
        response: { data: { error: 'SQL constraint violation on customers_pkey' } },
      });

      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      const nameInput = screen.getByLabelText(/Name/);
      await userEvent.type(nameInput, 'Test');

      await userEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        // Should show safe generic error, not the raw SQL error
        expect(screen.getByText('Failed to save customer. Please try again.')).toBeInTheDocument();
        expect(screen.queryByText(/SQL/)).not.toBeInTheDocument();
      });
    });

    it('should disable form inputs during save', async () => {
      mockCreateCustomer.mockImplementation(() => new Promise(() => {}));

      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      const nameInput = screen.getByLabelText(/Name/);
      await userEvent.type(nameInput, 'Test Customer');

      await userEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByLabelText(/Name/)).toBeDisabled();
        expect(screen.getByLabelText('Email')).toBeDisabled();
        expect(screen.getByLabelText('Phone')).toBeDisabled();
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });

    it('should have phone input with type=tel', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      const phoneInput = screen.getByLabelText('Phone');
      expect(phoneInput).toHaveAttribute('type', 'tel');
    });

    it('should have maxLength on inputs', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      expect(screen.getByLabelText(/Name/)).toHaveAttribute('maxLength', '255');
      expect(screen.getByLabelText('Email')).toHaveAttribute('maxLength', '255');
      expect(screen.getByLabelText('Phone')).toHaveAttribute('maxLength', '25');
    });
  });

  describe('Edit modal', () => {
    beforeEach(() => {
      mockGetCustomers.mockResolvedValue(mockCustomersData);
    });

    it('should open edit modal with pre-filled data', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[0]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit Customer')).toBeInTheDocument();
      expect(screen.getByLabelText(/Name/)).toHaveValue('John Doe');
      expect(screen.getByLabelText('Email')).toHaveValue('john@example.com');
      expect(screen.getByLabelText('Phone')).toHaveValue('08123456789');
    });

    it('should call updateCustomer on valid edit submission', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[0]);

      const nameInput = screen.getByLabelText(/Name/);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'John Updated');

      await userEvent.click(screen.getByText('Update'));

      await waitFor(() => {
        expect(mockUpdateCustomer).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({ name: 'John Updated' })
        );
      });
    });

    it('should show update button text in edit mode', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[0]);

      expect(screen.getByText('Update')).toBeInTheDocument();
    });
  });

  describe('Delete functionality', () => {
    beforeEach(() => {
      mockGetCustomers.mockResolvedValue(mockCustomersData);
    });

    it('should show delete button for owner role', async () => {
      mockUserRole = 'owner';
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('should show delete button for manager role', async () => {
      mockUserRole = 'manager';
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('should not show delete button for employee role', async () => {
      mockUserRole = 'employee';
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.queryAllByText('Delete')).toHaveLength(0);
    });

    it('should show delete confirmation modal with accessible attributes', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      await userEvent.click(deleteButtons[0]);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText('Delete Customer')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure/)).toBeInTheDocument();
    });

    it('should call deleteCustomer when confirmed', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      await userEvent.click(deleteButtons[0]);

      // Find Delete button inside the modal
      const modal = screen.getByRole('alertdialog');
      const confirmBtn = within(modal).getByText('Delete');
      await userEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockDeleteCustomer).toHaveBeenCalledWith('1');
      });
    });

    it('should close delete modal on cancel', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      await userEvent.click(deleteButtons[0]);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      await userEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Discard changes confirmation', () => {
    beforeEach(() => {
      mockGetCustomers.mockResolvedValue(mockCustomersData);
    });

    it('should show discard confirmation when closing dirty form', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      // Type something to make form dirty
      const nameInput = screen.getByLabelText(/Name/);
      await userEvent.type(nameInput, 'Test');

      // Click cancel
      await userEvent.click(screen.getByText('Cancel'));

      // Should show discard confirmation
      await waitFor(() => {
        expect(screen.getByText('Discard changes?')).toBeInTheDocument();
      });
    });

    it('should close modal when discard is confirmed', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      const nameInput = screen.getByLabelText(/Name/);
      await userEvent.type(nameInput, 'Test');

      await userEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.getByText('Discard changes?')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Discard'));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should return to form when keep editing is clicked', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      const nameInput = screen.getByLabelText(/Name/);
      await userEvent.type(nameInput, 'Test');

      await userEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.getByText('Discard changes?')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Keep Editing'));

      // Modal should still be open with the data
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/Name/)).toHaveValue('Test');
    });

    it('should not show discard confirmation when form is clean', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      // Don't type anything - form is clean
      await userEvent.click(screen.getByText('Cancel'));

      // Should close directly without discard confirmation
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Field-level validation', () => {
    beforeEach(() => {
      mockGetCustomers.mockResolvedValue(mockCustomersData);
    });

    it('should clear field error when user starts typing', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      // Type name and invalid email, submit
      const nameInput = screen.getByLabelText(/Name/);
      const emailInput = screen.getByLabelText('Email');

      await userEvent.type(nameInput, 'Test');
      await userEvent.type(emailInput, 'bad');
      await userEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
      });

      // Clear and retype email - error should clear
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, 'valid@email.com');

      await waitFor(() => {
        expect(screen.queryByText('Please enter a valid email address.')).not.toBeInTheDocument();
      });
    });

    it('should show aria-invalid on fields with errors', async () => {
      render(<CustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText(/New Customer/)[0]);

      const nameInput = screen.getByLabelText(/Name/);
      const emailInput = screen.getByLabelText('Email');

      await userEvent.type(nameInput, 'Test');
      await userEvent.type(emailInput, 'invalid');
      await userEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });
});
