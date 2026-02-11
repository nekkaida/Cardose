/**
 * SettingsPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '../../pages/SettingsPage';

// Mock useNavigate
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/settings', search: '' }),
}));

// Mock ApiContext
const mockGetSettings = jest.fn();
const mockUpdateSetting = jest.fn();
const mockDeleteSetting = jest.fn();

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    getDashboardAnalytics: jest.fn(),
    getOrders: jest.fn(),
    createOrder: jest.fn(),
    updateOrder: jest.fn(),
    getCustomers: jest.fn(),
    createCustomer: jest.fn(),
    updateCustomer: jest.fn(),
    getInventory: jest.fn(),
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
    getSettings: mockGetSettings,
    updateSetting: mockUpdateSetting,
    deleteSetting: mockDeleteSetting,
  }),
}));

// Mock LanguageContext
const mockSetLanguage = jest.fn();

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: mockSetLanguage,
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.title': 'Settings',
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
    jest.clearAllMocks();
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
    it('should show error message when API call fails', async () => {
      mockGetSettings.mockRejectedValueOnce(new Error('Network error'));

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load settings. Please try again.')).toBeInTheDocument();
      });
    });

    it('should show Try Again button on error', async () => {
      mockGetSettings.mockRejectedValueOnce(new Error('Network error'));

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry loading when Try Again is clicked', async () => {
      mockGetSettings.mockRejectedValueOnce(new Error('Network error'));

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      mockGetSettings.mockResolvedValueOnce(mockSettingsData);

      await userEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      expect(mockGetSettings).toHaveBeenCalledTimes(2);
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
