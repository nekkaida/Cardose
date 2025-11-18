/**
 * Customers Slice
 *
 * Manages customer state including:
 * - Customer list
 * - Customer details
 * - Customer creation/updates
 * - Customer metrics and analytics
 * - Search and filtering
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CustomerService } from '../../services/CustomerService';
import { Customer, CreateCustomerData, UpdateCustomerData } from '../../types/Customer';

// Types
interface CustomersState {
  customers: Customer[];
  currentCustomer: Customer | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    type?: 'individual' | 'company';
    search?: string;
  };
  analytics: {
    totalCustomers: number;
    activeCustomers: number;
    totalRevenue: number;
    averageOrderValue: number;
  } | null;
  lastSync: string | null;
}

// Initial state
const initialState: CustomersState = {
  customers: [],
  currentCustomer: null,
  isLoading: false,
  error: null,
  filters: {},
  analytics: null,
  lastSync: null,
};

// Async thunks

/**
 * Fetch all customers with optional filters
 */
export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async (filters?: { type?: 'individual' | 'company' }, { rejectWithValue }) => {
    try {
      const customers = await CustomerService.getAllCustomers(filters);
      return customers;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch customers');
    }
  }
);

/**
 * Fetch single customer by ID
 */
export const fetchCustomerById = createAsyncThunk(
  'customers/fetchCustomerById',
  async (customerId: string, { rejectWithValue }) => {
    try {
      const customer = await CustomerService.getCustomerById(customerId);
      if (!customer) {
        return rejectWithValue('Customer not found');
      }
      return customer;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch customer');
    }
  }
);

/**
 * Create new customer
 */
export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (customerData: CreateCustomerData, { rejectWithValue }) => {
    try {
      const customer = await CustomerService.createCustomer(customerData);
      return customer;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create customer');
    }
  }
);

/**
 * Update existing customer
 */
export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async (
    { customerId, updateData }: { customerId: string; updateData: UpdateCustomerData },
    { rejectWithValue }
  ) => {
    try {
      const customer = await CustomerService.updateCustomer(customerId, updateData);
      return customer;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update customer');
    }
  }
);

/**
 * Delete customer
 */
export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (customerId: string, { rejectWithValue }) => {
    try {
      await CustomerService.deleteCustomer(customerId);
      return customerId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete customer');
    }
  }
);

/**
 * Search customers
 */
export const searchCustomers = createAsyncThunk(
  'customers/searchCustomers',
  async (query: string, { rejectWithValue }) => {
    try {
      const customers = await CustomerService.searchCustomers(query);
      return customers;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to search customers');
    }
  }
);

/**
 * Fetch customer analytics
 */
export const fetchCustomerAnalytics = createAsyncThunk(
  'customers/fetchAnalytics',
  async (_, { rejectWithValue }) => {
    try {
      const analytics = await CustomerService.getCustomerAnalytics();
      return analytics;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch analytics');
    }
  }
);

/**
 * Fetch top customers
 */
export const fetchTopCustomers = createAsyncThunk(
  'customers/fetchTopCustomers',
  async (limit: number = 10, { rejectWithValue }) => {
    try {
      const customers = await CustomerService.getTopCustomers(limit);
      return customers;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch top customers');
    }
  }
);

/**
 * Sync pending customers
 */
export const syncCustomers = createAsyncThunk(
  'customers/sync',
  async (_, { rejectWithValue }) => {
    try {
      await CustomerService.syncPendingCustomers();
      // Refetch all customers after sync
      const customers = await CustomerService.getAllCustomers();
      return customers;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sync customers');
    }
  }
);

// Slice
const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    // Set filters
    setFilters: (state, action: PayloadAction<{ type?: 'individual' | 'company'; search?: string }>) => {
      state.filters = action.payload;
    },
    // Clear filters
    clearFilters: (state) => {
      state.filters = {};
    },
    // Set current customer
    setCurrentCustomer: (state, action: PayloadAction<Customer | null>) => {
      state.currentCustomer = action.payload;
    },
    // Clear current customer
    clearCurrentCustomer: (state) => {
      state.currentCustomer = null;
    },
    // Update customer in list (for optimistic updates)
    updateCustomerInList: (state, action: PayloadAction<Customer>) => {
      const index = state.customers.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.customers[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch customers
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers = action.payload;
        state.lastSync = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch customer by ID
    builder
      .addCase(fetchCustomerById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentCustomer = action.payload;
        state.error = null;
      })
      .addCase(fetchCustomerById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create customer
    builder
      .addCase(createCustomer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers.unshift(action.payload); // Add to beginning of list
        state.currentCustomer = action.payload;
        state.error = null;
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update customer
    builder
      .addCase(updateCustomer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.isLoading = false;

        // Update in list
        const index = state.customers.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.customers[index] = action.payload;
        }

        // Update current customer if it's the same
        if (state.currentCustomer?.id === action.payload.id) {
          state.currentCustomer = action.payload;
        }

        state.error = null;
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete customer
    builder
      .addCase(deleteCustomer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers = state.customers.filter(c => c.id !== action.payload);

        // Clear current customer if it's the deleted one
        if (state.currentCustomer?.id === action.payload) {
          state.currentCustomer = null;
        }

        state.error = null;
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Search customers
    builder
      .addCase(searchCustomers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchCustomers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers = action.payload;
        state.error = null;
      })
      .addCase(searchCustomers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch analytics
    builder
      .addCase(fetchCustomerAnalytics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCustomerAnalytics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.analytics = action.payload;
        state.error = null;
      })
      .addCase(fetchCustomerAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch top customers
    builder
      .addCase(fetchTopCustomers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTopCustomers.fulfilled, (state, action) => {
        state.isLoading = false;
        // Don't replace all customers, this is supplementary data
        state.error = null;
      })
      .addCase(fetchTopCustomers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Sync customers
    builder
      .addCase(syncCustomers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(syncCustomers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers = action.payload;
        state.lastSync = new Date().toISOString();
        state.error = null;
      })
      .addCase(syncCustomers.rejected, (state, action) => {
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
  setCurrentCustomer,
  clearCurrentCustomer,
  updateCustomerInList,
} = customersSlice.actions;

// Export reducer
export default customersSlice.reducer;

// Selectors
export const selectCustomers = (state: { customers: CustomersState }) => state.customers.customers;
export const selectCurrentCustomer = (state: { customers: CustomersState }) => state.customers.currentCustomer;
export const selectCustomersLoading = (state: { customers: CustomersState }) => state.customers.isLoading;
export const selectCustomersError = (state: { customers: CustomersState }) => state.customers.error;
export const selectCustomersFilters = (state: { customers: CustomersState }) => state.customers.filters;
export const selectCustomerAnalytics = (state: { customers: CustomersState }) => state.customers.analytics;
export const selectLastSync = (state: { customers: CustomersState }) => state.customers.lastSync;

// Filtered selectors
export const selectFilteredCustomers = (state: { customers: CustomersState }) => {
  const { customers, filters } = state.customers;
  let filtered = [...customers];

  if (filters.type) {
    filtered = filtered.filter(c => c.type === filters.type);
  }

  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.phone?.includes(search) ||
      c.company_name?.toLowerCase().includes(search)
    );
  }

  return filtered;
};

export const selectCustomersByType = (type: 'individual' | 'company') => (state: { customers: CustomersState }) =>
  state.customers.customers.filter(c => c.type === type);

// Selector for getting customer by ID
export const selectCustomerById = (state: { customers: CustomersState }, customerId: string) =>
  state.customers.customers.find(c => c.id === customerId);
