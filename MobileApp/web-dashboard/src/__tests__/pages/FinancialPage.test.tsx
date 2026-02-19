/**
 * FinancialPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinancialPage from '../../pages/FinancialPage';

// Mock useNavigate
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/financial', search: '' }),
}));

// Mock ApiContext
const mockGetFinancialSummary = jest.fn();
const mockGetTransactions = jest.fn();

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
    getFinancialSummary: mockGetFinancialSummary,
    getTransactions: mockGetTransactions,
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
    getSettings: jest.fn(),
    updateSetting: jest.fn(),
    deleteSetting: jest.fn(),
  }),
}));

// Mock LanguageContext
jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: jest.fn(),
    t: (key: string) => {
      const translations: Record<string, string> = {
        'financial.title': 'Financial',
        'common.loading': 'Loading...',
        'common.error': 'Error',
      };
      return translations[key] || key;
    },
  }),
}));

const mockSummaryData = {
  summary: {
    total_revenue: 200000000,
    total_expenses: 80000000,
    pending_invoices: 5,
  },
};

const mockTransactionsData = {
  transactions: [
    {
      id: '1',
      created_at: '2025-01-15',
      description: 'Order payment',
      type: 'income',
      category: 'sales',
      amount: 5000000,
    },
    {
      id: '2',
      created_at: '2025-01-14',
      description: 'Material purchase',
      type: 'expense',
      category: 'materials',
      amount: 2000000,
    },
  ],
};

describe('FinancialPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading spinner initially', () => {
      mockGetFinancialSummary.mockImplementation(() => new Promise(() => {}));
      mockGetTransactions.mockImplementation(() => new Promise(() => {}));
      render(<FinancialPage />);

      const spinnerContainer = document.querySelector('.animate-spin');
      expect(spinnerContainer).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when both API calls fail', async () => {
      mockGetFinancialSummary.mockRejectedValueOnce(new Error('Network error'));
      mockGetTransactions.mockRejectedValueOnce(new Error('Network error'));

      render(<FinancialPage />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(
          screen.getByText('Failed to load financial data. Please try again.')
        ).toBeInTheDocument();
      });
    });

    it('should show Try Again button on error', async () => {
      mockGetFinancialSummary.mockRejectedValueOnce(new Error('Network error'));
      mockGetTransactions.mockRejectedValueOnce(new Error('Network error'));

      render(<FinancialPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry loading when Try Again is clicked', async () => {
      mockGetFinancialSummary.mockRejectedValueOnce(new Error('Network error'));
      mockGetTransactions.mockRejectedValueOnce(new Error('Network error'));

      render(<FinancialPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      mockGetFinancialSummary.mockResolvedValueOnce(mockSummaryData);
      mockGetTransactions.mockResolvedValueOnce(mockTransactionsData);

      await userEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      });
    });
  });

  describe('Loaded state', () => {
    beforeEach(() => {
      mockGetFinancialSummary.mockResolvedValueOnce(mockSummaryData);
      mockGetTransactions.mockResolvedValueOnce(mockTransactionsData);
    });

    it('should render without crashing and display title', async () => {
      render(<FinancialPage />);

      await waitFor(() => {
        expect(screen.getByText('Financial')).toBeInTheDocument();
      });
    });

    it('should display subtitle', async () => {
      render(<FinancialPage />);

      await waitFor(() => {
        expect(
          screen.getByText('Monitor financial performance and transactions')
        ).toBeInTheDocument();
      });
    });

    it('should display financial summary cards', async () => {
      render(<FinancialPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
        expect(screen.getByText('Total Expenses')).toBeInTheDocument();
        expect(screen.getByText('Net Profit')).toBeInTheDocument();
        expect(screen.getByText('Pending Invoices')).toBeInTheDocument();
      });
    });

    it('should display pending invoices count', async () => {
      render(<FinancialPage />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('should display Recent Transactions section', async () => {
      render(<FinancialPage />);

      await waitFor(() => {
        expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
      });
    });

    it('should display transaction data', async () => {
      render(<FinancialPage />);

      await waitFor(() => {
        expect(screen.getByText('Order payment')).toBeInTheDocument();
        expect(screen.getByText('Material purchase')).toBeInTheDocument();
      });
    });

    it('should display transaction type badges', async () => {
      render(<FinancialPage />);

      await waitFor(() => {
        expect(screen.getByText('income')).toBeInTheDocument();
        expect(screen.getByText('expense')).toBeInTheDocument();
      });
    });

    it('should display table headers', async () => {
      render(<FinancialPage />);

      await waitFor(() => {
        expect(screen.getByText('Date')).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
        expect(screen.getByText('Category')).toBeInTheDocument();
        expect(screen.getByText('Amount')).toBeInTheDocument();
      });
    });
  });

  describe('Partial data load', () => {
    it('should display summary even if transactions fail', async () => {
      mockGetFinancialSummary.mockResolvedValueOnce(mockSummaryData);
      mockGetTransactions.mockRejectedValueOnce(new Error('Transactions failed'));

      render(<FinancialPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
        expect(screen.getByText('No transactions found.')).toBeInTheDocument();
      });
    });
  });
});
