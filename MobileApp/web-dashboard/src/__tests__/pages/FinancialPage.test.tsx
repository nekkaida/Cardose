/**
 * FinancialPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinancialPage from '../../pages/FinancialPage';

// Mock useNavigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/financial', search: '' }),
}));

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'admin', email: 'admin@test.com', role: 'admin' },
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    token: 'test-token',
  }),
}));

// Mock recharts to avoid ResizeObserver issues
vi.mock('recharts', () => ({
  BarChart: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

// Mock ApiContext
const mockGetFinancialSummary = vi.fn();
const mockGetTransactions = vi.fn();
const mockGetInvoices = vi.fn();

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
    getFinancialSummary: mockGetFinancialSummary,
    getTransactions: mockGetTransactions,
    getInvoices: mockGetInvoices,
    createTransaction: vi.fn().mockResolvedValue({}),
    createInvoice: vi.fn().mockResolvedValue({}),
    updateInvoiceStatus: vi.fn().mockResolvedValue({}),
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
        'financial.title': 'Financial',
        'financial.subtitle': 'Financial overview and transactions',
        'financial.totalRevenue': 'Total Revenue',
        'financial.totalExpenses': 'Total Expenses',
        'financial.netProfit': 'Net Profit',
        'financial.pendingInvoices': 'Pending Invoices',
        'financial.transactions': 'Transactions',
        'financial.invoices': 'Invoices',
        'financial.description': 'Description',
        'financial.type': 'Type',
        'financial.category': 'Category',
        'financial.amount': 'Amount',
        'financial.noTransactions': 'No transactions found',
        'financial.noInvoices': 'No invoices found',
        'financial.newTransaction': 'Transaction',
        'financial.newInvoice': 'Invoice',
        'financial.allTypes': 'All Types',
        'financial.allCategories': 'All Categories',
        'financial.allStatuses': 'All Statuses',
        'financial.chartTitle': 'Income vs Expenses by Category',
        'financial.income': 'Income',
        'financial.expense': 'Expense',
        'financial.createFirstTx': 'Record your first transaction to get started.',
        'financial.createFirstInv': 'Create your first invoice to get started.',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.search': 'Search',
        'common.export': 'Export',
        'common.cancel': 'Cancel',
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
      payment_date: '2025-01-15',
      created_at: '2025-01-15',
      description: 'Order payment',
      type: 'income',
      category: 'sales',
      amount: 5000000,
    },
    {
      id: '2',
      payment_date: '2025-01-14',
      created_at: '2025-01-14',
      description: 'Material purchase',
      type: 'expense',
      category: 'materials',
      amount: 2000000,
    },
  ],
  total: 2,
  totalPages: 1,
};

const mockInvoicesData = {
  invoices: [],
  total: 0,
  totalPages: 1,
};

describe('FinancialPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading skeleton initially', () => {
      mockGetFinancialSummary.mockImplementation(() => new Promise(() => {}));
      mockGetTransactions.mockImplementation(() => new Promise(() => {}));
      mockGetInvoices.mockImplementation(() => new Promise(() => {}));
      render(<FinancialPage />);

      // Page uses skeleton rows (animate-pulse), not spinner
      const skeletonElement = document.querySelector('.animate-pulse');
      expect(skeletonElement).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when transaction API fails with no data', async () => {
      mockGetFinancialSummary.mockRejectedValueOnce(new Error('Network error'));
      mockGetTransactions.mockRejectedValueOnce(new Error('Network error'));
      mockGetInvoices.mockRejectedValueOnce(new Error('Network error'));

      render(<FinancialPage />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });
    });

    it('should show Try Again button on error', async () => {
      mockGetFinancialSummary.mockRejectedValueOnce(new Error('Network error'));
      mockGetTransactions.mockRejectedValueOnce(new Error('Network error'));
      mockGetInvoices.mockRejectedValueOnce(new Error('Network error'));

      render(<FinancialPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should retry loading when Try Again is clicked', async () => {
      mockGetFinancialSummary.mockRejectedValueOnce(new Error('Network error'));
      mockGetTransactions.mockRejectedValueOnce(new Error('Network error'));
      mockGetInvoices.mockRejectedValueOnce(new Error('Network error'));

      render(<FinancialPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      mockGetFinancialSummary.mockResolvedValueOnce(mockSummaryData);
      mockGetTransactions.mockResolvedValueOnce(mockTransactionsData);
      mockGetInvoices.mockResolvedValueOnce(mockInvoicesData);

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
      mockGetInvoices.mockResolvedValueOnce(mockInvoicesData);
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
        // The page shows fallback "Financial overview and transactions"
        expect(screen.getByText('Financial overview and transactions')).toBeInTheDocument();
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

    it('should display Transactions tab', async () => {
      render(<FinancialPage />);

      await waitFor(() => {
        // Tab label includes count: "Transactions (2)"
        expect(screen.getByText(/Transactions/)).toBeInTheDocument();
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
        // The page uses TX_TYPE_LABELS: "Income" and "Expense" (capitalized)
        expect(screen.getByText('Income')).toBeInTheDocument();
        expect(screen.getByText('Expense')).toBeInTheDocument();
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
      mockGetInvoices.mockResolvedValueOnce(mockInvoicesData);

      render(<FinancialPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
        // When transactions list is empty, it shows "No transactions found"
        expect(screen.getByText('No transactions found')).toBeInTheDocument();
      });
    });
  });
});
