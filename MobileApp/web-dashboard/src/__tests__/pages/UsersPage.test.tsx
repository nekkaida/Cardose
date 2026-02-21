/**
 * UsersPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UsersPage from '../../pages/UsersPage';

// Mock useNavigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/users', search: '' }),
}));

// Mock ApiContext
const mockGetUsers = vi.fn();
const mockCreateUser = vi.fn();
const mockUpdateUserStatus = vi.fn();
const mockDeleteUser = vi.fn();

vi.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: vi.fn().mockResolvedValue({}),
    getOrders: vi.fn().mockResolvedValue({}),
    createOrder: vi.fn().mockResolvedValue({}),
    updateOrder: vi.fn().mockResolvedValue({}),
    getCustomers: vi.fn().mockResolvedValue({}),
    createCustomer: vi.fn().mockResolvedValue({}),
    updateCustomer: vi.fn().mockResolvedValue({}),
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
    getUsers: mockGetUsers,
    createUser: mockCreateUser,
    updateUser: vi.fn().mockResolvedValue({}),
    updateUserStatus: mockUpdateUserStatus,
    deleteUser: mockDeleteUser,
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
        'users.title': 'User Management',
        'users.subtitle': 'Manage system users and permissions',
        'users.addUser': 'Add User',
        'users.editUser': 'Edit User',
        'users.createUser': 'Create New User',
        'users.totalUsers': 'Total Users',
        'users.active': 'Active',
        'users.inactive': 'Inactive',
        'users.byRole': 'By Role',
        'users.owners': 'owners',
        'users.mgr': 'mgr',
        'users.emp': 'emp',
        'users.searchPlaceholder': 'Search users...',
        'users.allRoles': 'All Roles',
        'users.owner': 'Owner',
        'users.manager': 'Manager',
        'users.employee': 'Employee',
        'users.name': 'Name',
        'users.email': 'Email',
        'users.role': 'Role',
        'users.status': 'Status',
        'users.actions': 'Actions',
        'users.edit': 'Edit',
        'users.deactivate': 'Deactivate',
        'users.activate': 'Activate',
        'users.delete': 'Delete',
        'users.noUsers': 'No users found.',
        'users.page': 'Page',
        'users.of': 'of',
        'users.previous': 'Previous',
        'users.next': 'Next',
        'users.fullName': 'Full Name',
        'users.username': 'Username',
        'users.password': 'Password',
        'users.passwordEditHint': ' (leave blank to keep current)',
        'users.phone': 'Phone',
        'users.cancel': 'Cancel',
        'users.saving': 'Saving...',
        'users.saveChanges': 'Save Changes',
        'users.loadError': 'Failed to load users. Please try again.',
        'users.statusError': 'Failed to update user status.',
        'users.deleteError': 'Failed to delete user.',
        'users.saveError': 'Failed to save user. Please try again.',
        'users.deleteConfirm': 'Are you sure you want to delete user',
        'users.tryAgain': 'Try Again',
        'users.filterByRole': 'Filter by role',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.search': 'Search',
        'common.delete': 'Delete',
        'common.deleting': 'Deleting...',
        'common.cancel': 'Cancel',
        'common.confirmDeleteGeneric': 'Are you sure you want to delete',
      };
      return translations[key] || key;
    },
  }),
}));

const mockUsersData = {
  users: [
    {
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      full_name: 'Admin User',
      phone: '08123456789',
      role: 'owner',
      is_active: 1,
      created_at: '2025-01-01',
    },
    {
      id: '2',
      username: 'johndoe',
      email: 'john@example.com',
      full_name: 'John Doe',
      phone: '08198765432',
      role: 'employee',
      is_active: 1,
      created_at: '2025-01-10',
    },
    {
      id: '3',
      username: 'janeinactive',
      email: 'jane@example.com',
      full_name: 'Jane Inactive',
      phone: '08111222333',
      role: 'manager',
      is_active: 0,
      created_at: '2025-01-05',
    },
  ],
  totalPages: 1,
  stats: {
    total: 3,
    active: 2,
    inactive: 1,
    byRole: {
      owner: 1,
      manager: 1,
      employee: 1,
    },
  },
};

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading spinner initially', () => {
      mockGetUsers.mockImplementation(() => new Promise(() => {}));
      render(<UsersPage />);

      const spinnerContainer = document.querySelector('.animate-spin');
      expect(spinnerContainer).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show inline error message when API call fails', async () => {
      mockGetUsers.mockRejectedValue(new Error('Network error'));

      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load users. Please try again.')).toBeInTheDocument();
      });
      // Title should still be visible (inline error, not page-replacing)
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    it('should show Try Again button on error', async () => {
      mockGetUsers.mockRejectedValue(new Error('Network error'));

      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry loading when Try Again is clicked', async () => {
      mockGetUsers.mockRejectedValue(new Error('Network error'));

      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      // Reset and resolve for retry
      mockGetUsers.mockReset();
      mockGetUsers.mockResolvedValue(mockUsersData);

      await userEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });
    });
  });

  describe('Loaded state', () => {
    beforeEach(() => {
      mockGetUsers.mockResolvedValueOnce(mockUsersData);
    });

    it('should render without crashing and display title', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('User Management')).toBeInTheDocument();
      });
    });

    it('should display subtitle', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Manage system users and permissions')).toBeInTheDocument();
      });
    });

    it('should display user data in table', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Inactive')).toBeInTheDocument();
      });
    });

    it('should display usernames', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('@admin')).toBeInTheDocument();
        expect(screen.getByText('@johndoe')).toBeInTheDocument();
        expect(screen.getByText('@janeinactive')).toBeInTheDocument();
      });
    });

    it('should display user emails', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });
    });

    it('should display role badges', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Owner')).toBeInTheDocument();
        expect(screen.getByText('Employee')).toBeInTheDocument();
        expect(screen.getByText('Manager')).toBeInTheDocument();
      });
    });

    it('should display active/inactive status badges', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        // "Active" appears as badge text for 2 active users + stats card label
        const activeElements = screen.getAllByText('Active');
        expect(activeElements.length).toBeGreaterThanOrEqual(2);
        // "Inactive" appears as badge text for 1 inactive user + stats card label
        const inactiveElements = screen.getAllByText('Inactive');
        expect(inactiveElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should display table headers', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByText('Role')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });

    it('should display stats cards', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
      });
    });

    it('should display Add User button', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Add User')).toBeInTheDocument();
      });
    });

    it('should display search input', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
      });
    });

    it('should display pagination', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
        expect(screen.getByText('Previous')).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
    });

    it('should display Deactivate button for active users', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        const deactivateButtons = screen.getAllByText('Deactivate');
        expect(deactivateButtons.length).toBe(2);
      });
    });

    it('should display Activate button for inactive users', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Activate')).toBeInTheDocument();
      });
    });

    it('should show create user modal when Add User is clicked', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Add User')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Add User'));

      await waitFor(() => {
        expect(screen.getByText('Create New User')).toBeInTheDocument();
        expect(screen.getByText('Full Name')).toBeInTheDocument();
        expect(screen.getByText('Username')).toBeInTheDocument();
        expect(screen.getByText('Password')).toBeInTheDocument();
      });
    });
  });

  describe('Empty state', () => {
    it('should display empty message when no users exist', async () => {
      mockGetUsers.mockResolvedValueOnce({ users: [], totalPages: 1 });

      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('No users found.')).toBeInTheDocument();
      });
    });
  });

  describe('Delete flow', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockGetUsers.mockResolvedValue(mockUsersData);
    });

    it('should open delete confirmation when Delete is clicked', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
    });

    it('should call deleteUser API when confirmed', async () => {
      mockDeleteUser.mockResolvedValueOnce({});
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
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
        expect(mockDeleteUser).toHaveBeenCalledWith('1');
      });
    });

    it('should close delete dialog on Cancel', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
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
      mockDeleteUser.mockRejectedValueOnce({
        response: { data: { error: 'Cannot delete this user' } },
      });
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
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
        expect(screen.getByText('Cannot delete this user')).toBeInTheDocument();
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
    });
  });
});
