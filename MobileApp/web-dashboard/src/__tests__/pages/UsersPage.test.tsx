/**
 * UsersPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UsersPage from '../../pages/UsersPage';

// ── Mocks ─────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/users', search: '' }),
}));

// Mock AuthContext — default: owner role (full permissions)
// Role can be overridden per-test by changing mockAuthRole before render
let mockAuthRole = 'owner';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'current-user', username: 'admin', email: 'admin@test.com', role: mockAuthRole },
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock ApiContext — only user-related methods
const mockGetUsers = vi.fn();
const mockCreateUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockUpdateUserStatus = vi.fn();
const mockDeleteUser = vi.fn();

vi.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getUsers: mockGetUsers,
    createUser: mockCreateUser,
    updateUser: mockUpdateUser,
    updateUserStatus: mockUpdateUserStatus,
    deleteUser: mockDeleteUser,
  }),
}));

// Mock LanguageContext
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
  'users.noUsersYet': 'No users yet',
  'users.noUsersDesc': 'Add your first team member to get started.',
  'users.adjustFilters': 'Try adjusting your search or filters.',
  'users.clearFilters': 'Clear Filters',
  'users.page': 'Page',
  'users.of': 'of',
  'users.previous': 'Previous',
  'users.next': 'Next',
  'users.fullName': 'Full Name',
  'users.username': 'Username',
  'users.password': 'Password',
  'users.passwordEditHint': ' (leave blank to keep current)',
  'users.passwordWarning':
    "This will reset the user's password without requiring their old password.",
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
  'users.joined': 'Joined',
  'users.users': 'users',
  'users.networkError': 'Network error. Please check your connection.',
  'users.permissionError': "You don't have permission to perform this action.",
  'users.statusSuccess': 'User status updated successfully.',
  'users.createSuccess': 'User created successfully',
  'users.updateSuccess': 'User updated successfully',
  'users.deleteSuccess': 'User deleted successfully',
  'users.activating': 'Activating...',
  'users.deactivating': 'Deactivating...',
  'users.unsavedChanges': 'You have unsaved changes. Are you sure you want to close?',
  'users.keepEditing': 'Keep Editing',
  'users.discardChanges': 'Discard Changes',
  'users.requiredField': 'Required',
  'users.validation.fullNameRequired': 'Full name is required',
  'users.validation.fullNameLength': 'Full name must be 2-100 characters',
  'users.validation.usernameRequired': 'Username is required',
  'users.validation.usernameFormat': '3-30 characters, letters, numbers, and underscores',
  'users.validation.emailRequired': 'Email is required',
  'users.validation.emailFormat': 'Please enter a valid email address',
  'users.validation.passwordRequired': 'Password is required',
  'users.validation.passwordMin': 'Password must be at least 6 characters',
  'users.validation.phoneFormat': 'Please enter a valid phone number',
  'users.validation.usernameTaken': 'This username is already taken',
  'users.validation.emailTaken': 'This email address is already in use',
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.search': 'Search',
  'common.delete': 'Delete',
  'common.deleting': 'Deleting...',
  'common.cancel': 'Cancel',
  'common.confirmDeleteGeneric': 'Are you sure you want to delete',
};

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string) => translations[key] || key,
  }),
}));

// ── Test data ─────────────────────────────────────────────────────

const mockUsersData = {
  users: [
    {
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      full_name: 'Admin User',
      phone: '08123456789',
      role: 'owner',
      is_active: true,
      created_at: '2025-01-01',
    },
    {
      id: '2',
      username: 'johndoe',
      email: 'john@example.com',
      full_name: 'John Doe',
      phone: null,
      role: 'employee',
      is_active: true,
      created_at: '2025-01-10',
    },
    {
      id: '3',
      username: 'janeinactive',
      email: 'jane@example.com',
      full_name: 'Jane Inactive',
      phone: '08111222333',
      role: 'manager',
      is_active: false,
      created_at: '2025-01-05',
    },
  ],
  total: 3,
  totalPages: 1,
  page: 1,
  limit: 25,
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

// ── Tests ─────────────────────────────────────────────────────────

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthRole = 'owner';
  });

  describe('Loading state', () => {
    it('should show skeleton rows while loading', () => {
      mockGetUsers.mockImplementation(() => new Promise(() => {}));
      render(<UsersPage />);

      const pulseRows = document.querySelectorAll('.animate-pulse');
      expect(pulseRows.length).toBeGreaterThan(0);
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
      mockGetUsers.mockResolvedValue(mockUsersData);
    });

    it('should render title and subtitle', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('User Management')).toBeInTheDocument();
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
        const activeElements = screen.getAllByText('Active');
        expect(activeElements.length).toBeGreaterThanOrEqual(2);
        const inactiveElements = screen.getAllByText('Inactive');
        expect(inactiveElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should display sortable table headers including Joined', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText(/^Name/)).toBeInTheDocument();
        expect(screen.getByText(/^Email/)).toBeInTheDocument();
        expect(screen.getByText(/^Role/)).toBeInTheDocument();
        expect(screen.getByText(/^Joined/)).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });

    it('should display stats cards', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
      });
    });

    it('should display Add User button for owner', async () => {
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

    it('should display pagination with total count', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 1/)).toBeInTheDocument();
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
        expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Username/)).toBeInTheDocument();
      });
    });
  });

  describe('Empty state', () => {
    it('should display contextual empty message when no users exist', async () => {
      mockGetUsers.mockResolvedValue({
        ...mockUsersData,
        users: [],
        total: 0,
        totalPages: 1,
      });

      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('No users yet')).toBeInTheDocument();
        expect(screen.getByText('Add your first team member to get started.')).toBeInTheDocument();
      });
    });

    it('should show filter-specific empty message when search is active', async () => {
      mockGetUsers.mockResolvedValue({
        ...mockUsersData,
        users: [],
        total: 0,
        totalPages: 1,
      });

      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('No users yet')).toBeInTheDocument();
      });

      // Type in search to activate filters
      const searchInput = screen.getByPlaceholderText('Search users...');
      await userEvent.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No users found.')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your search or filters.')).toBeInTheDocument();
      });
    });
  });

  describe('Role-based visibility', () => {
    it('should show all action buttons for owner role', async () => {
      mockAuthRole = 'owner';
      mockGetUsers.mockResolvedValue(mockUsersData);

      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      // Owner should see Edit, toggle, and Delete
      const editButtons = screen.getAllByText('Edit');
      expect(editButtons.length).toBe(3);
      const deleteButtons = screen.getAllByText('Delete');
      expect(deleteButtons.length).toBe(3);
      expect(screen.getByText('Add User')).toBeInTheDocument();
    });

    it('should show Edit and toggle but not Delete for manager role', async () => {
      mockAuthRole = 'manager';
      mockGetUsers.mockResolvedValue(mockUsersData);

      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      expect(editButtons.length).toBe(3);
      expect(screen.queryAllByText('Delete')).toHaveLength(0);
      expect(screen.getByText('Add User')).toBeInTheDocument();
    });

    it('should hide all action buttons and Add User for employee role', async () => {
      mockAuthRole = 'employee';
      mockGetUsers.mockResolvedValue(mockUsersData);

      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      expect(screen.queryByText('Add User')).not.toBeInTheDocument();
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
      expect(screen.queryByText('Deactivate')).not.toBeInTheDocument();
      expect(screen.queryByText('Actions')).not.toBeInTheDocument();
    });
  });

  describe('Status toggle', () => {
    beforeEach(() => {
      mockGetUsers.mockResolvedValue(mockUsersData);
    });

    it('should show loading text when toggling status', async () => {
      mockUpdateUserStatus.mockImplementation(() => new Promise(() => {}));

      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      const deactivateButtons = screen.getAllByText('Deactivate');
      await userEvent.click(deactivateButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Deactivating...')).toBeInTheDocument();
      });
    });

    it('should show success toast after toggling status', async () => {
      mockUpdateUserStatus.mockResolvedValue({});

      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      const deactivateButtons = screen.getAllByText('Deactivate');
      await userEvent.click(deactivateButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('User status updated successfully.')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('should call getUsers with sort params when column header is clicked', async () => {
      mockGetUsers.mockResolvedValue(mockUsersData);

      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      mockGetUsers.mockClear();

      // Click the Name header to sort
      await userEvent.click(screen.getByText(/^Name/));

      await waitFor(() => {
        expect(mockGetUsers).toHaveBeenCalledWith(
          expect.objectContaining({ sort_by: 'full_name', sort_order: 'asc' })
        );
      });
    });
  });

  describe('Clear filters', () => {
    it('should show Clear Filters button when filters are active', async () => {
      mockGetUsers.mockResolvedValue(mockUsersData);

      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      // Initially no clear filters button
      expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument();

      // Change role filter
      const roleSelect = screen.getByLabelText('Filter by role');
      await userEvent.selectOptions(roleSelect, 'manager');

      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
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

      const dialog = screen.getByRole('alertdialog');
      const confirmBtn = within(dialog)
        .getAllByRole('button')
        .find((b) => b.textContent === 'Delete');
      await userEvent.click(confirmBtn!);

      await waitFor(() => {
        expect(mockDeleteUser).toHaveBeenCalledWith('1');
      });
    });

    it('should show success toast after successful delete', async () => {
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

      const dialog = screen.getByRole('alertdialog');
      const confirmBtn = within(dialog)
        .getAllByRole('button')
        .find((b) => b.textContent === 'Delete');
      await userEvent.click(confirmBtn!);

      await waitFor(() => {
        expect(screen.getByText('User deleted successfully')).toBeInTheDocument();
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

      const dialog = screen.getByRole('alertdialog');
      const confirmBtn = within(dialog)
        .getAllByRole('button')
        .find((b) => b.textContent === 'Delete');
      await userEvent.click(confirmBtn!);

      await waitFor(() => {
        expect(screen.getByText('Cannot delete this user')).toBeInTheDocument();
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
    });
  });
});
