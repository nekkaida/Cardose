/**
 * SettingsPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
  }),
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
        'settings.noSettings': 'No settings configured yet.',
        'settings.key': 'Key',
        'settings.value': 'Value',
        'settings.description': 'Description',
        'settings.keyPlaceholder': 'e.g. company_name',
        'settings.descriptionPlaceholder': 'Optional description',
        'settings.save': 'Save',
        'settings.cancel': 'Cancel',
        'settings.edit': 'Edit',
        'settings.delete': 'Delete',
        'settings.saving': 'Saving...',
        'settings.loadError': 'Failed to load settings. Please try again.',
        'settings.saveError': 'Failed to save setting.',
        'settings.deleteError': 'Failed to delete setting.',
        'settings.deleteConfirm': 'Are you sure you want to delete setting',
        'settings.tryAgain': 'Try Again',
        'common.loading': 'Loading...',
        'common.error': 'Error',
      };
      return translations[key] || key;
    },
  }),
}));

const mockSettingsData = {
  settings: {
    company_name: {
      value: 'Premium Gift Box',
      description: 'Company display name',
    },
    tax_rate: {
      value: '11',
      description: 'Tax percentage',
    },
  },
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      mockGetSettings.mockRejectedValue(new Error('Network error'));

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load settings. Please try again.')).toBeInTheDocument();
      });
      // Title should still be visible (inline error, not page-replacing)
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should show Try Again button on error', async () => {
      mockGetSettings.mockRejectedValue(new Error('Network error'));

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry loading when Try Again is clicked', async () => {
      mockGetSettings.mockRejectedValue(new Error('Network error'));

      render(<SettingsPage />);

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
      mockGetSettings.mockResolvedValueOnce(mockSettingsData);
    });

    it('should render without crashing and display title', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });

    it('should display subtitle', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Manage application settings')).toBeInTheDocument();
      });
    });

    it('should display Language section', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Language')).toBeInTheDocument();
        expect(screen.getByText('Choose your preferred language')).toBeInTheDocument();
      });
    });

    it('should display System Settings section', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('System Settings')).toBeInTheDocument();
        expect(screen.getByText('2 settings configured')).toBeInTheDocument();
      });
    });

    it('should display setting keys', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('company_name')).toBeInTheDocument();
        expect(screen.getByText('tax_rate')).toBeInTheDocument();
      });
    });

    it('should display setting values', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Premium Gift Box')).toBeInTheDocument();
        expect(screen.getByText('11')).toBeInTheDocument();
      });
    });

    it('should display setting descriptions', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Company display name')).toBeInTheDocument();
        expect(screen.getByText('Tax percentage')).toBeInTheDocument();
      });
    });

    it('should display Edit buttons for each setting', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        expect(editButtons.length).toBe(2);
      });
    });

    it('should display Delete buttons for each setting', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Delete');
        expect(deleteButtons.length).toBe(2);
      });
    });

    it('should display Add Setting button', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Add Setting')).toBeInTheDocument();
      });
    });

    it('should show add setting modal when Add Setting is clicked', async () => {
      render(<SettingsPage />);

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

    it('should show edit input when Edit button is clicked', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Edit').length).toBe(2);
      });

      const editButtons = screen.getAllByText('Edit');
      await userEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });

    it('should show delete confirmation dialog when Delete is clicked', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Delete').length).toBe(2);
      });

      const deleteButtons = screen.getAllByText('Delete');
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Are you sure you want to delete setting/)).toBeInTheDocument();
      });
    });
  });

  describe('Empty state', () => {
    it('should display empty message when no settings exist', async () => {
      mockGetSettings.mockResolvedValueOnce({ settings: {} });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('No settings configured yet.')).toBeInTheDocument();
      });
    });
  });
});
