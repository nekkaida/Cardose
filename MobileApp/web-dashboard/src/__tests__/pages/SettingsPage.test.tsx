/**
 * SettingsPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '../../pages/SettingsPage';

// Mock useNavigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/settings', search: '' }),
}));

// Mock ApiContext
const mockGetSettings = vi.fn();
const mockUpdateSetting = vi.fn();
const mockDeleteSetting = vi.fn();
const mockBatchUpdateSettings = vi.fn();

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
    getUsers: vi.fn().mockResolvedValue({}),
    createUser: vi.fn().mockResolvedValue({}),
    updateUser: vi.fn().mockResolvedValue({}),
    updateUserStatus: vi.fn().mockResolvedValue({}),
    deleteUser: vi.fn().mockResolvedValue({}),
    getSettings: mockGetSettings,
    updateSetting: mockUpdateSetting,
    deleteSetting: mockDeleteSetting,
    batchUpdateSettings: mockBatchUpdateSettings,
  }),
}));

// Mock AuthContext — default to owner role (can write)
let mockUserRole = 'owner';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'admin', email: 'admin@test.com', role: mockUserRole },
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: { headers: { common: {} } },
  },
}));

// Mock LanguageContext
const mockSetLanguage = vi.fn();

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: mockSetLanguage,
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.title': 'Settings',
        'settings.subtitle': 'Manage application settings',
        'settings.addSetting': 'Add Setting',
        'settings.addNewSetting': 'Add New Setting',
        'settings.language': 'Language',
        'settings.languageHint': 'Choose your preferred language',
        'settings.langEnglish': 'English',
        'settings.langIndonesian': 'Bahasa Indonesia',
        'settings.systemSettings': 'System Settings',
        'settings.settingsCount': 'settings configured',
        'settings.matching': 'matching',
        'settings.noSettings': 'No settings configured yet.',
        'settings.noSearchResults': 'No settings match your search.',
        'settings.key': 'Key',
        'settings.value': 'Value',
        'settings.description': 'Description',
        'settings.keyPlaceholder': 'e.g. company_name',
        'settings.keyHint':
          'Lowercase letters, numbers, and underscores only. Must start with a letter.',
        'settings.descriptionPlaceholder': 'Optional description',
        'settings.save': 'Save',
        'settings.cancel': 'Cancel',
        'settings.edit': 'Edit',
        'settings.delete': 'Delete',
        'settings.saving': 'Saving...',
        'settings.enabled': 'Enabled',
        'settings.disabled': 'Disabled',
        'settings.protected': 'Protected',
        'settings.loadError': 'Failed to load settings. Please try again.',
        'settings.saveError': 'Failed to save setting.',
        'settings.deleteError': 'Failed to delete setting.',
        'settings.networkError': 'Network error. Please check your connection.',
        'settings.permissionError': 'You do not have permission to perform this action.',
        'settings.deleteConfirm': 'Are you sure you want to delete setting',
        'settings.tryAgain': 'Try Again',
        'settings.updateSuccess': 'Setting updated successfully.',
        'settings.createSuccess': 'Setting created successfully.',
        'settings.deleteSuccess': 'Setting deleted successfully.',
        'settings.keyRequired': 'Setting key is required.',
        'settings.keyFormatError':
          'Key must use lowercase letters, numbers, and underscores. Must start with a letter.',
        'settings.keyDuplicate': 'A setting with this key already exists.',
        'settings.valueRequired': 'Value is required.',
        'settings.valueTooLong': 'Value must be 1000 characters or fewer.',
        'settings.invalidNumber': 'Please enter a valid number.',
        'settings.numberTooLow': 'Value must be at least {min}.',
        'settings.numberTooHigh': 'Value must be at most {max}.',
        'settings.searchPlaceholder': 'Search settings...',
        'settings.clearSearch': 'Clear search',
        'settings.export': 'Export',
        'settings.import': 'Import',
        'settings.exportSettings': 'Export settings as JSON',
        'settings.importSettings': 'Import settings from JSON',
        'settings.exportSuccess': 'Settings exported successfully.',
        'settings.importSuccess': 'Settings imported successfully.',
        'settings.importError': 'Failed to import settings. Please check the file format.',
        'settings.importInvalidFormat': 'Invalid file format. Expected a JSON object.',
        'settings.importInvalidKey': 'Invalid key format in import: "{key}"',
        'settings.unsavedWarning': 'Save or cancel your current edit first.',
        'settings.invalidOption': 'Invalid option value.',
        'settings.invalidBoolean': 'Value must be true/false or 0/1.',
        'settings.label.business_name': 'Business Name',
        'settings.label.currency': 'Currency',
        'settings.label.tax_rate': 'Tax Rate',
        'settings.label.default_markup': 'Default Markup',
        'settings.label.backup_frequency': 'Backup Frequency',
        'settings.label.sync_enabled': 'Auto Sync',
        'settings.category.business': 'Business',
        'settings.category.tax': 'Tax & Compliance',
        'settings.category.pricing': 'Pricing',
        'settings.category.system': 'System',
        'settings.category.other': 'Other',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.delete': 'Delete',
        'common.deleting': 'Deleting...',
        'common.cancel': 'Cancel',
        'common.confirmDeleteGeneric': 'Are you sure you want to delete',
      };
      return translations[key] || key;
    },
  }),
}));

const mockSettingsData = {
  settings: {
    business_name: {
      value: 'Premium Gift Box',
      description: 'Company display name',
      is_protected: true,
    },
    tax_rate: {
      value: '11',
      description: 'Tax percentage',
      is_protected: true,
    },
    sync_enabled: {
      value: '1',
      description: 'Enable automatic synchronization',
      is_protected: false,
    },
  },
};

// Helper to render and wait for initial load
async function renderAndLoad(data = mockSettingsData) {
  mockGetSettings.mockResolvedValue(data);
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<SettingsPage />);
  });
  await waitFor(() => {
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
  return result!;
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = 'owner';
  });

  describe('Loading state', () => {
    it('should show loading spinner initially', () => {
      mockGetSettings.mockImplementation(() => new Promise(() => {}));
      render(<SettingsPage />);

      const spinnerContainer = document.querySelector('.animate-spin');
      expect(spinnerContainer).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show inline error message when API call fails', async () => {
      mockGetSettings.mockRejectedValue({ request: {} });

      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(
          screen.getByText('Network error. Please check your connection.')
        ).toBeInTheDocument();
      });
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should show Try Again button on error', async () => {
      mockGetSettings.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry loading when Try Again is clicked', async () => {
      mockGetSettings.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      mockGetSettings.mockReset();
      mockGetSettings.mockResolvedValue(mockSettingsData);

      await userEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('Premium Gift Box')).toBeInTheDocument();
      });
    });
  });

  describe('Loaded state', () => {
    beforeEach(() => {
      mockGetSettings.mockResolvedValue(mockSettingsData);
    });

    it('should render title and subtitle', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('Manage application settings')).toBeInTheDocument();
      });
    });

    it('should display Language section', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Language')).toBeInTheDocument();
        expect(screen.getByText('Choose your preferred language')).toBeInTheDocument();
      });
    });

    it('should display system settings with count', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('System Settings')).toBeInTheDocument();
      });
    });

    it('should display setting values', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Premium Gift Box')).toBeInTheDocument();
      });
    });

    it('should display human-readable labels for registered settings', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Business Name')).toBeInTheDocument();
        expect(screen.getByText('Tax Rate')).toBeInTheDocument();
        expect(screen.getByText('Auto Sync')).toBeInTheDocument();
      });
    });

    it('should show category headers', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Business')).toBeInTheDocument();
      });
    });

    it('should show protected badge on protected settings', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        const badges = screen.getAllByText('Protected');
        expect(badges.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should display boolean settings with Enabled/Disabled labels', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Enabled')).toBeInTheDocument();
      });
    });

    it('should show number units for numeric settings', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('%')).toBeInTheDocument();
      });
    });

    it('should show Edit buttons for each setting (owner role)', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        expect(editButtons.length).toBe(3);
      });
    });

    it('should NOT show Delete button for protected settings', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        // business_name and tax_rate are protected — only sync_enabled should have Delete
        const deleteButtons = screen.getAllByText('Delete');
        expect(deleteButtons.length).toBe(1);
      });
    });

    it('should display Add Setting, Export, and Import buttons', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Setting')).toBeInTheDocument();
        expect(screen.getByText('Export')).toBeInTheDocument();
        expect(screen.getByText('Import')).toBeInTheDocument();
      });
    });

    it('should show add setting modal when Add Setting is clicked', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Setting')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Add Setting'));

      await waitFor(() => {
        expect(screen.getByText('Add New Setting')).toBeInTheDocument();
        expect(screen.getByText('Key')).toBeInTheDocument();
        expect(screen.getByText('Value')).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
      });
    });

    it('should show edit controls when Edit button is clicked', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getAllByText('Edit').length).toBe(3);
      });

      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });

    it('should show delete confirmation when Delete is clicked', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getAllByText('Delete').length).toBe(1);
      });

      const deleteButtons = screen.getAllByText('Delete');
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
    });

    it('should display search bar', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search settings...')).toBeInTheDocument();
      });
    });

    it('should filter settings when searching', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Business Name')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search settings...');
      await userEvent.type(searchInput, 'tax');

      await waitFor(() => {
        expect(screen.getByText('Tax Rate')).toBeInTheDocument();
        expect(screen.queryByText('Business Name')).not.toBeInTheDocument();
      });
    });

    it('should show no results message for empty search', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      // Wait for settings to load
      await waitFor(() => {
        expect(screen.getByText('Business Name')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search settings...');
      await userEvent.type(searchInput, 'xyznonexistent');

      // When search returns no results but settings exist, the no-results message appears
      await waitFor(() => {
        expect(screen.getByText('No settings match your search.')).toBeInTheDocument();
      });
    });
  });

  describe('Role-based access control', () => {
    it('should hide write controls for employee role', async () => {
      mockUserRole = 'employee';
      mockGetSettings.mockResolvedValue(mockSettingsData);

      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      // Should NOT see Add Setting, Export, Import buttons
      expect(screen.queryByText('Add Setting')).not.toBeInTheDocument();
      expect(screen.queryByText('Export')).not.toBeInTheDocument();
      expect(screen.queryByText('Import')).not.toBeInTheDocument();

      // Should NOT see Edit or Delete buttons
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();

      // But settings should still be visible
      expect(screen.getByText('Premium Gift Box')).toBeInTheDocument();
    });

    it('should show write controls for manager role', async () => {
      mockUserRole = 'manager';
      mockGetSettings.mockResolvedValue(mockSettingsData);

      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Setting')).toBeInTheDocument();
        expect(screen.getAllByText('Edit').length).toBe(3);
      });
    });
  });

  describe('Empty state', () => {
    it('should display empty message when no settings exist', async () => {
      mockGetSettings.mockResolvedValue({ settings: {} });

      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('No settings configured yet.')).toBeInTheDocument();
      });
    });
  });

  describe('Add setting validation', () => {
    beforeEach(() => {
      mockGetSettings.mockResolvedValue(mockSettingsData);
    });

    it('should accept valid key format and submit', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Setting')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Add Setting'));

      await waitFor(() => {
        expect(screen.getByText('Add New Setting')).toBeInTheDocument();
      });

      const keyInput = screen.getByPlaceholderText('e.g. company_name');
      await userEvent.type(keyInput, 'test_key');

      const valueInput = screen.getByLabelText('Value');
      await userEvent.type(valueInput, 'test_value');

      mockUpdateSetting.mockResolvedValueOnce({});
      const submitButtons = screen.getAllByText('Add Setting');
      await userEvent.click(submitButtons[submitButtons.length - 1]);

      await waitFor(() => {
        expect(mockUpdateSetting).toHaveBeenCalledWith('test_key', {
          value: 'test_value',
          description: '',
        });
      });
    });

    it('should reject duplicate keys', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Setting')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Add Setting'));

      await waitFor(() => {
        expect(screen.getByText('Add New Setting')).toBeInTheDocument();
      });

      // Type a key that already exists
      const keyInput = screen.getByPlaceholderText('e.g. company_name');
      // The input auto-lowercases, so type the existing key
      await userEvent.clear(keyInput);
      await userEvent.type(keyInput, 'business_name');

      const valueInput = screen.getByLabelText('Value');
      await userEvent.type(valueInput, 'some value');

      const submitButtons = screen.getAllByText('Add Setting');
      await userEvent.click(submitButtons[submitButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText('A setting with this key already exists.')).toBeInTheDocument();
      });
    });
  });

  describe('Delete flow', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockGetSettings.mockResolvedValue(mockSettingsData);
    });

    it('should call deleteSetting API when confirmed', async () => {
      mockDeleteSetting.mockResolvedValueOnce({});

      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getAllByText('Delete').length).toBe(1);
      });

      await userEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });

      // Find the confirm Delete button inside the dialog
      const dialogDeleteBtns = screen
        .getAllByRole('button')
        .filter((b) => b.textContent === 'Delete');
      await userEvent.click(dialogDeleteBtns[dialogDeleteBtns.length - 1]);

      await waitFor(() => {
        expect(mockDeleteSetting).toHaveBeenCalledWith('sync_enabled');
      });
    });

    it('should close delete dialog on Cancel', async () => {
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getAllByText('Delete').length).toBe(1);
      });

      await userEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /Cancel/ }));

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
    });

    it('should show inline error on delete failure', async () => {
      mockDeleteSetting.mockRejectedValueOnce({
        response: { data: { error: 'Cannot delete this setting' } },
      });

      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getAllByText('Delete').length).toBe(1);
      });

      await userEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });

      const dialogDeleteBtns = screen
        .getAllByRole('button')
        .filter((b) => b.textContent === 'Delete');
      await userEvent.click(dialogDeleteBtns[dialogDeleteBtns.length - 1]);

      await waitFor(() => {
        expect(screen.getByText('Cannot delete this setting')).toBeInTheDocument();
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
    });
  });

  describe('Optimistic updates', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Use mockResolvedValue so data persists across re-renders
      mockGetSettings.mockResolvedValue(mockSettingsData);
    });

    it('should call updateSetting API when saving', async () => {
      mockUpdateSetting.mockResolvedValueOnce({});

      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Business Name')).toBeInTheDocument();
      });

      // Click edit on first setting
      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[0]);

      // Wait for input to appear and modify value
      const input = await screen.findByRole('textbox', { name: /Value/i });
      await userEvent.clear(input);
      await userEvent.type(input, 'New Name');

      // Save
      const saveBtn = await screen.findByText('Save');
      await userEvent.click(saveBtn);

      // API should have been called
      await waitFor(() => {
        expect(mockUpdateSetting).toHaveBeenCalledWith('business_name', {
          value: 'New Name',
          description: 'Company display name',
        });
      });
    });

    it('should show error toast on save failure', async () => {
      mockUpdateSetting.mockRejectedValueOnce({
        response: { data: { error: 'Update failed' } },
      });

      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Business Name')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[0]);

      const input = await screen.findByRole('textbox', { name: /Value/i });
      await userEvent.clear(input);
      await userEvent.type(input, 'New Name');

      const saveBtn = await screen.findByText('Save');
      await userEvent.click(saveBtn);

      // Should show error toast
      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument();
      });
    });
  });

  describe('Unsaved changes warning', () => {
    it('should warn when switching edit with unsaved changes', async () => {
      await renderAndLoad();

      await waitFor(() => {
        expect(screen.getByText('Business Name')).toBeInTheDocument();
      });

      // Click edit on first setting (business_name)
      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[0]);

      // Modify the value
      const input = await screen.findByRole('textbox', { name: /Value/i });
      await userEvent.clear(input);
      await userEvent.type(input, 'Changed Value');

      // Try to edit a different setting (tax_rate) — should show warning
      // The tax_rate Edit button is now index 1 (business_name is in edit mode, no Edit btn)
      const remainingEditButtons = screen.getAllByText('Edit');
      await userEvent.click(remainingEditButtons[0]);

      // Should show unsaved warning toast
      await waitFor(() => {
        expect(screen.getByText('Save or cancel your current edit first.')).toBeInTheDocument();
      });
    });
  });

  describe('Export', () => {
    it('should trigger file download on export', async () => {
      await renderAndLoad();

      // Mock URL.createObjectURL and URL.revokeObjectURL
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test-url');
      const mockRevokeObjectURL = vi.fn();
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = mockCreateObjectURL;
      URL.revokeObjectURL = mockRevokeObjectURL;

      // Mock anchor click — capture original BEFORE spying to avoid recursion
      const mockClick = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          return { click: mockClick, href: '', download: '' } as unknown as HTMLElement;
        }
        return originalCreateElement(tag);
      });

      try {
        await userEvent.click(screen.getByText('Export'));

        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(mockClick).toHaveBeenCalled();
        expect(mockRevokeObjectURL).toHaveBeenCalled();
      } finally {
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
        vi.restoreAllMocks();
      }
    });
  });

  describe('Import', () => {
    let originalCreateElement: typeof document.createElement;

    beforeEach(() => {
      originalCreateElement = document.createElement.bind(document);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    function mockFileInput() {
      const input = originalCreateElement('input');
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'input') return input;
        return originalCreateElement(tag);
      });
      return input;
    }

    it('should call batchUpdateSettings with values and descriptions', async () => {
      await renderAndLoad();

      mockBatchUpdateSettings.mockResolvedValueOnce({ success: true });

      const fileContent = JSON.stringify({
        business_name: { value: 'New Business', description: 'Updated name' },
        tax_rate: { value: '15' },
      });
      const file = new File([fileContent], 'settings.json', { type: 'application/json' });

      const input = mockFileInput();
      await userEvent.click(screen.getByText('Import'));

      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      await act(async () => {
        input.onchange?.({ target: input } as unknown as Event);
      });

      await waitFor(() => {
        expect(mockBatchUpdateSettings).toHaveBeenCalledWith({
          business_name: { value: 'New Business', description: 'Updated name' },
          tax_rate: { value: '15' },
        });
      });
    });

    it('should reject import with invalid key format', async () => {
      await renderAndLoad();

      const fileContent = JSON.stringify({
        'INVALID-KEY': { value: 'test' },
      });
      const file = new File([fileContent], 'settings.json', { type: 'application/json' });

      const input = mockFileInput();
      await userEvent.click(screen.getByText('Import'));

      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      await act(async () => {
        input.onchange?.({ target: input } as unknown as Event);
      });

      expect(mockBatchUpdateSettings).not.toHaveBeenCalled();
    });

    it('should reject import with invalid number value', async () => {
      await renderAndLoad();

      const fileContent = JSON.stringify({
        tax_rate: { value: 'not_a_number' },
      });
      const file = new File([fileContent], 'settings.json', { type: 'application/json' });

      const input = mockFileInput();
      await userEvent.click(screen.getByText('Import'));

      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      await act(async () => {
        input.onchange?.({ target: input } as unknown as Event);
      });

      expect(mockBatchUpdateSettings).not.toHaveBeenCalled();
    });

    it('should reject import with out-of-range number', async () => {
      await renderAndLoad();

      const fileContent = JSON.stringify({
        tax_rate: { value: '150' },
      });
      const file = new File([fileContent], 'settings.json', { type: 'application/json' });

      const input = mockFileInput();
      await userEvent.click(screen.getByText('Import'));

      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      await act(async () => {
        input.onchange?.({ target: input } as unknown as Event);
      });

      expect(mockBatchUpdateSettings).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have ARIA live region for status announcements', async () => {
      mockGetSettings.mockResolvedValue(mockSettingsData);
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        const liveRegion = document.querySelector('[role="status"][aria-live="polite"]');
        expect(liveRegion).toBeInTheDocument();
      });
    });

    it('should have error banner with role=alert', async () => {
      mockGetSettings.mockRejectedValue(new Error('fail'));
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        const alert = document.querySelector('[role="alert"]');
        expect(alert).toBeInTheDocument();
      });
    });

    it('should render add modal with role=dialog and aria-modal', async () => {
      mockGetSettings.mockResolvedValue(mockSettingsData);
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Add Setting')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Add Setting'));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveAttribute('aria-modal', 'true');
      });
    });

    it('should render boolean settings as toggle switches with role=switch', async () => {
      mockGetSettings.mockResolvedValue(mockSettingsData);
      await act(async () => {
        render(<SettingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Auto Sync')).toBeInTheDocument();
      });

      // Edit sync_enabled to see the toggle
      const editButtons = screen.getAllByText('Edit');
      // sync_enabled is the 3rd setting
      await userEvent.click(editButtons[2]);

      await waitFor(() => {
        const toggle = screen.getByRole('switch');
        expect(toggle).toBeInTheDocument();
        expect(toggle).toHaveAttribute('aria-checked', 'true');
      });
    });
  });
});
