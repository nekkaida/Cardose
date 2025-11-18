/**
 * Financial Slice
 *
 * Manages financial state including:
 * - Invoices
 * - Payments
 * - Financial reports
 * - Revenue analytics
 * - Outstanding balances
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { FinancialService } from '../../services/FinancialService';
import { Invoice, Payment, CreateInvoiceData, CreatePaymentData } from '../../types/Financial';

// Types
interface FinancialState {
  invoices: Invoice[];
  payments: Payment[];
  currentInvoice: Invoice | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    customer_id?: string;
    search?: string;
  };
  analytics: {
    totalRevenue: number;
    paidInvoices: number;
    outstandingBalance: number;
    overdueBalance: number;
    averageInvoiceValue: number;
    revenueByMonth: { month: string; revenue: number }[];
  } | null;
  lastSync: string | null;
}

// Initial state
const initialState: FinancialState = {
  invoices: [],
  payments: [],
  currentInvoice: null,
  isLoading: false,
  error: null,
  filters: {},
  analytics: null,
  lastSync: null,
};

// Async thunks

/**
 * Fetch all invoices with optional filters
 */
export const fetchInvoices = createAsyncThunk(
  'financial/fetchInvoices',
  async (filters?: { status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'; customer_id?: string }, { rejectWithValue }) => {
    try {
      const invoices = await FinancialService.getAllInvoices(filters);
      return invoices;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch invoices');
    }
  }
);

/**
 * Fetch single invoice by ID
 */
export const fetchInvoiceById = createAsyncThunk(
  'financial/fetchInvoiceById',
  async (invoiceId: string, { rejectWithValue }) => {
    try {
      const invoice = await FinancialService.getInvoiceById(invoiceId);
      if (!invoice) {
        return rejectWithValue('Invoice not found');
      }
      return invoice;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch invoice');
    }
  }
);

/**
 * Create new invoice
 */
export const createInvoice = createAsyncThunk(
  'financial/createInvoice',
  async (invoiceData: CreateInvoiceData, { rejectWithValue }) => {
    try {
      const invoice = await FinancialService.createInvoice(invoiceData);
      return invoice;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create invoice');
    }
  }
);

/**
 * Update invoice
 */
export const updateInvoice = createAsyncThunk(
  'financial/updateInvoice',
  async (
    { invoiceId, updateData }: { invoiceId: string; updateData: Partial<Invoice> },
    { rejectWithValue }
  ) => {
    try {
      const invoice = await FinancialService.updateInvoice(invoiceId, updateData);
      return invoice;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update invoice');
    }
  }
);

/**
 * Send invoice
 */
export const sendInvoice = createAsyncThunk(
  'financial/sendInvoice',
  async (invoiceId: string, { rejectWithValue }) => {
    try {
      const invoice = await FinancialService.sendInvoice(invoiceId);
      return invoice;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send invoice');
    }
  }
);

/**
 * Record payment
 */
export const recordPayment = createAsyncThunk(
  'financial/recordPayment',
  async (paymentData: CreatePaymentData, { rejectWithValue }) => {
    try {
      const payment = await FinancialService.recordPayment(paymentData);
      return payment;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to record payment');
    }
  }
);

/**
 * Fetch payments for an invoice
 */
export const fetchInvoicePayments = createAsyncThunk(
  'financial/fetchInvoicePayments',
  async (invoiceId: string, { rejectWithValue }) => {
    try {
      const payments = await FinancialService.getInvoicePayments(invoiceId);
      return payments;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch payments');
    }
  }
);

/**
 * Fetch overdue invoices
 */
export const fetchOverdueInvoices = createAsyncThunk(
  'financial/fetchOverdueInvoices',
  async (_, { rejectWithValue }) => {
    try {
      const invoices = await FinancialService.getOverdueInvoices();
      return invoices;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch overdue invoices');
    }
  }
);

/**
 * Fetch financial analytics
 */
export const fetchFinancialAnalytics = createAsyncThunk(
  'financial/fetchAnalytics',
  async (period: 'week' | 'month' | 'quarter' | 'year' = 'month', { rejectWithValue }) => {
    try {
      const analytics = await FinancialService.getFinancialAnalytics(period);
      return analytics;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch analytics');
    }
  }
);

/**
 * Sync pending financial data
 */
export const syncFinancial = createAsyncThunk(
  'financial/sync',
  async (_, { rejectWithValue }) => {
    try {
      await FinancialService.syncPendingFinancial();
      // Refetch all invoices after sync
      const invoices = await FinancialService.getAllInvoices();
      return invoices;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sync financial data');
    }
  }
);

// Slice
const financialSlice = createSlice({
  name: 'financial',
  initialState,
  reducers: {
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    // Set filters
    setFilters: (state, action: PayloadAction<{ status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'; customer_id?: string; search?: string }>) => {
      state.filters = action.payload;
    },
    // Clear filters
    clearFilters: (state) => {
      state.filters = {};
    },
    // Set current invoice
    setCurrentInvoice: (state, action: PayloadAction<Invoice | null>) => {
      state.currentInvoice = action.payload;
    },
    // Clear current invoice
    clearCurrentInvoice: (state) => {
      state.currentInvoice = null;
    },
    // Update invoice in list (for optimistic updates)
    updateInvoiceInList: (state, action: PayloadAction<Invoice>) => {
      const index = state.invoices.findIndex(i => i.id === action.payload.id);
      if (index !== -1) {
        state.invoices[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch invoices
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.isLoading = false;
        state.invoices = action.payload;
        state.lastSync = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch invoice by ID
    builder
      .addCase(fetchInvoiceById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInvoiceById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentInvoice = action.payload;
        state.error = null;
      })
      .addCase(fetchInvoiceById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create invoice
    builder
      .addCase(createInvoice.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createInvoice.fulfilled, (state, action) => {
        state.isLoading = false;
        state.invoices.unshift(action.payload); // Add to beginning of list
        state.currentInvoice = action.payload;
        state.error = null;
      })
      .addCase(createInvoice.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update invoice
    builder
      .addCase(updateInvoice.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateInvoice.fulfilled, (state, action) => {
        state.isLoading = false;

        // Update in list
        const index = state.invoices.findIndex(i => i.id === action.payload.id);
        if (index !== -1) {
          state.invoices[index] = action.payload;
        }

        // Update current invoice if it's the same
        if (state.currentInvoice?.id === action.payload.id) {
          state.currentInvoice = action.payload;
        }

        state.error = null;
      })
      .addCase(updateInvoice.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Send invoice
    builder
      .addCase(sendInvoice.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendInvoice.fulfilled, (state, action) => {
        state.isLoading = false;

        // Update in list
        const index = state.invoices.findIndex(i => i.id === action.payload.id);
        if (index !== -1) {
          state.invoices[index] = action.payload;
        }

        // Update current invoice if it's the same
        if (state.currentInvoice?.id === action.payload.id) {
          state.currentInvoice = action.payload;
        }

        state.error = null;
      })
      .addCase(sendInvoice.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Record payment
    builder
      .addCase(recordPayment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(recordPayment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.payments.unshift(action.payload); // Add to beginning of list
        state.error = null;
      })
      .addCase(recordPayment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch invoice payments
    builder
      .addCase(fetchInvoicePayments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInvoicePayments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.payments = action.payload;
        state.error = null;
      })
      .addCase(fetchInvoicePayments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch overdue invoices
    builder
      .addCase(fetchOverdueInvoices.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOverdueInvoices.fulfilled, (state, action) => {
        state.isLoading = false;
        // Don't replace all invoices, this is supplementary data
        state.error = null;
      })
      .addCase(fetchOverdueInvoices.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch analytics
    builder
      .addCase(fetchFinancialAnalytics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFinancialAnalytics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.analytics = action.payload;
        state.error = null;
      })
      .addCase(fetchFinancialAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Sync financial data
    builder
      .addCase(syncFinancial.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(syncFinancial.fulfilled, (state, action) => {
        state.isLoading = false;
        state.invoices = action.payload;
        state.lastSync = new Date().toISOString();
        state.error = null;
      })
      .addCase(syncFinancial.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  clearError,
  setFilters,
  clearFilters,
  setCurrentInvoice,
  clearCurrentInvoice,
  updateInvoiceInList,
} = financialSlice.actions;

// Export reducer
export default financialSlice.reducer;

// Selectors
export const selectInvoices = (state: { financial: FinancialState }) => state.financial.invoices;
export const selectPayments = (state: { financial: FinancialState }) => state.financial.payments;
export const selectCurrentInvoice = (state: { financial: FinancialState }) => state.financial.currentInvoice;
export const selectFinancialLoading = (state: { financial: FinancialState }) => state.financial.isLoading;
export const selectFinancialError = (state: { financial: FinancialState }) => state.financial.error;
export const selectFinancialFilters = (state: { financial: FinancialState }) => state.financial.filters;
export const selectFinancialAnalytics = (state: { financial: FinancialState }) => state.financial.analytics;
export const selectLastSync = (state: { financial: FinancialState }) => state.financial.lastSync;

// Filtered selectors
export const selectFilteredInvoices = (state: { financial: FinancialState }) => {
  const { invoices, filters } = state.financial;
  let filtered = [...invoices];

  if (filters.status) {
    filtered = filtered.filter(i => i.status === filters.status);
  }

  if (filters.customer_id) {
    filtered = filtered.filter(i => i.customer_id === filters.customer_id);
  }

  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(i =>
      i.invoice_number.toLowerCase().includes(search) ||
      i.customer_name?.toLowerCase().includes(search)
    );
  }

  return filtered;
};

export const selectInvoicesByStatus = (status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled') =>
  (state: { financial: FinancialState }) =>
    state.financial.invoices.filter(i => i.status === status);

export const selectOutstandingInvoices = (state: { financial: FinancialState }) =>
  state.financial.invoices.filter(i => i.status === 'sent' || i.status === 'overdue');

// Selector for getting invoice by ID
export const selectInvoiceById = (state: { financial: FinancialState }, invoiceId: string) =>
  state.financial.invoices.find(i => i.id === invoiceId);
