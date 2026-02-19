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
    getDashboardAnalytics: vi.fn(),
    getOrders: vi.fn(),
    createOrder: vi.fn(),
    updateOrder: vi.fn(),
    getCustomers: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    getInventory: vi.fn(),
    createInventoryItem: vi.fn(),
    updateInventoryStock: vi.fn(),
    getFinancialSummary: vi.fn(),
    getTransactions: vi.fn(),
    createTransaction: vi.fn(),
    calculatePricing: vi.fn(),
    getRevenueAnalytics: vi.fn(),
    getCustomerAnalytics: vi.fn(),
    getInventoryAnalytics: vi.fn(),
    getProductionAnalytics: vi.fn(),
    getProductionBoard: vi.fn(),
    getProductionTasks: vi.fn(),
    getProductionStats: vi.fn(),
    getSalesReport: vi.fn(),
    getInventoryReport: vi.fn(),
    getProductionReport: vi.fn(),
    getCustomerReport: vi.fn(),
    getFinancialReport: vi.fn(),
    getUsers: mockGetUsers,
    createUser: mockCreateUser,
    updateUser: vi.fn(),
    updateUserStatus: mockUpdateUserStatus,
    deleteUser: mockDeleteUser,
    getSettings: vi.fn(),
    updateSetting: vi.fn(),
    deleteSetting: vi.fn(),
  }),
}));

// Mock LanguageContext
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string) => {
      const translations: Record<string, string> = {
        'users.title': 'Users',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.search': 'Search',
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
    it('should show error message when API call fails', async () => {
      mockGetUsers.mockRejectedValueOnce(new Error('Network error'));

      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load users. Please try again.')).toBeInTheDocument();
      });
    });

    it('should show Try Again button on error', async () => {
      mockGetUsers.mockRejectedValueOnce(new Error('Network error'));

      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry loading when Try Again is clicked', async () => {
      mockGetUsers.mockRejectedValueOnce(new Error('Network error'));

      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      mockGetUsers.mockResolvedValueOnce(mockUsersData);

      await userEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      expect(mockGetUsers).toHaveBeenCalledTimes(2);
    });
  });

  describe('Loaded state', () => {
    beforeEach(() => {
      mockGetUsers.mockResolvedValueOnce(mockUsersData);
    });

    it('should render without crashing and display title', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Users')).toBeInTheDocument();
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
        expect(screen.getByText('owner')).toBeInTheDocument();
        expect(screen.getByText('employee')).toBeInTheDocument();
        expect(screen.getByText('manager')).toBeInTheDocument();
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
});
