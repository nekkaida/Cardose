/**
 * Orders Slice
 *
 * Manages order state including:
 * - Order list
 * - Order details
 * - Order creation/updates
 * - Status transitions
 * - Filtering and search
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { OrderService } from '../../services/OrderService';
import { Order, OrderStatus, CreateOrderData, UpdateOrderData } from '../../types/Order';

// Types
interface OrdersState {
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    status?: OrderStatus;
    customer_id?: string;
    search?: string;
  };
  analytics: {
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: { [key in OrderStatus]: number };
  } | null;
  lastSync: string | null;
}

// Initial state
const initialState: OrdersState = {
  orders: [],
  currentOrder: null,
  isLoading: false,
  error: null,
  filters: {},
  analytics: null,
  lastSync: null,
};

// Async thunks

/**
 * Fetch all orders with optional filters
 */
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (filters?: { status?: OrderStatus; customer_id?: string }, { rejectWithValue }) => {
    try {
      const orders = await OrderService.getAllOrders(filters);
      return orders;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch orders');
    }
  }
);

/**
 * Fetch single order by ID
 */
export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const order = await OrderService.getOrderById(orderId);
      if (!order) {
        return rejectWithValue('Order not found');
      }
      return order;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch order');
    }
  }
);

/**
 * Create new order
 */
export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderData: CreateOrderData, { rejectWithValue }) => {
    try {
      const order = await OrderService.createOrder(orderData);
      return order;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create order');
    }
  }
);

/**
 * Update existing order
 */
export const updateOrder = createAsyncThunk(
  'orders/updateOrder',
  async (
    { orderId, updateData }: { orderId: string; updateData: UpdateOrderData },
    { rejectWithValue }
  ) => {
    try {
      const order = await OrderService.updateOrder(orderId, updateData);
      return order;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update order');
    }
  }
);

/**
 * Update order status
 */
export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async (
    { orderId, status, notes }: { orderId: string; status: OrderStatus; notes?: string },
    { rejectWithValue }
  ) => {
    try {
      const order = await OrderService.updateOrderStatus(orderId, status, notes);
      return order;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update order status');
    }
  }
);

/**
 * Delete order
 */
export const deleteOrder = createAsyncThunk(
  'orders/deleteOrder',
  async (orderId: string, { rejectWithValue }) => {
    try {
      await OrderService.deleteOrder(orderId);
      return orderId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete order');
    }
  }
);

/**
 * Search orders
 */
export const searchOrders = createAsyncThunk(
  'orders/searchOrders',
  async (query: string, { rejectWithValue }) => {
    try {
      const orders = await OrderService.searchOrders(query);
      return orders;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to search orders');
    }
  }
);

/**
 * Fetch order analytics
 */
export const fetchOrderAnalytics = createAsyncThunk(
  'orders/fetchAnalytics',
  async (period: 'week' | 'month' | 'quarter' | 'year' = 'month', { rejectWithValue }) => {
    try {
      const analytics = await OrderService.getOrderAnalytics(period);
      return analytics;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch analytics');
    }
  }
);

/**
 * Sync pending orders
 */
export const syncOrders = createAsyncThunk(
  'orders/sync',
  async (_, { rejectWithValue }) => {
    try {
      await OrderService.syncPendingOrders();
      // Refetch all orders after sync
      const orders = await OrderService.getAllOrders();
      return orders;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sync orders');
    }
  }
);

// Slice
const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    // Set filters
    setFilters: (state, action: PayloadAction<{ status?: OrderStatus; customer_id?: string; search?: string }>) => {
      state.filters = action.payload;
    },
    // Clear filters
    clearFilters: (state) => {
      state.filters = {};
    },
    // Set current order
    setCurrentOrder: (state, action: PayloadAction<Order | null>) => {
      state.currentOrder = action.payload;
    },
    // Clear current order
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
    // Update order in list (for optimistic updates)
    updateOrderInList: (state, action: PayloadAction<Order>) => {
      const index = state.orders.findIndex(o => o.id === action.payload.id);
      if (index !== -1) {
        state.orders[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch orders
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders = action.payload;
        state.lastSync = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch order by ID
    builder
      .addCase(fetchOrderById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentOrder = action.payload;
        state.error = null;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create order
    builder
      .addCase(createOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders.unshift(action.payload); // Add to beginning of list
        state.currentOrder = action.payload;
        state.error = null;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update order
    builder
      .addCase(updateOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateOrder.fulfilled, (state, action) => {
        state.isLoading = false;

        // Update in list
        const index = state.orders.findIndex(o => o.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }

        // Update current order if it's the same
        if (state.currentOrder?.id === action.payload.id) {
          state.currentOrder = action.payload;
        }

        state.error = null;
      })
      .addCase(updateOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update order status
    builder
      .addCase(updateOrderStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.isLoading = false;

        // Update in list
        const index = state.orders.findIndex(o => o.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }

        // Update current order if it's the same
        if (state.currentOrder?.id === action.payload.id) {
          state.currentOrder = action.payload;
        }

        state.error = null;
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete order
    builder
      .addCase(deleteOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders = state.orders.filter(o => o.id !== action.payload);

        // Clear current order if it's the deleted one
        if (state.currentOrder?.id === action.payload) {
          state.currentOrder = null;
        }

        state.error = null;
      })
      .addCase(deleteOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Search orders
    builder
      .addCase(searchOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders = action.payload;
        state.error = null;
      })
      .addCase(searchOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch analytics
    builder
      .addCase(fetchOrderAnalytics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrderAnalytics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.analytics = action.payload;
        state.error = null;
      })
      .addCase(fetchOrderAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Sync orders
    builder
      .addCase(syncOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(syncOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders = action.payload;
        state.lastSync = new Date().toISOString();
        state.error = null;
      })
      .addCase(syncOrders.rejected, (state, action) => {
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
  setCurrentOrder,
  clearCurrentOrder,
  updateOrderInList,
} = ordersSlice.actions;

// Export reducer
export default ordersSlice.reducer;

// Selectors
export const selectOrders = (state: { orders: OrdersState }) => state.orders.orders;
export const selectCurrentOrder = (state: { orders: OrdersState }) => state.orders.currentOrder;
export const selectOrdersLoading = (state: { orders: OrdersState }) => state.orders.isLoading;
export const selectOrdersError = (state: { orders: OrdersState }) => state.orders.error;
export const selectOrdersFilters = (state: { orders: OrdersState }) => state.orders.filters;
export const selectOrderAnalytics = (state: { orders: OrdersState }) => state.orders.analytics;
export const selectLastSync = (state: { orders: OrdersState }) => state.orders.lastSync;

// Filtered selectors
export const selectFilteredOrders = (state: { orders: OrdersState }) => {
  const { orders, filters } = state.orders;
  let filtered = [...orders];

  if (filters.status) {
    filtered = filtered.filter(o => o.status === filters.status);
  }

  if (filters.customer_id) {
    filtered = filtered.filter(o => o.customer_id === filters.customer_id);
  }

  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(o =>
      o.order_number.toLowerCase().includes(search) ||
      o.customer_name?.toLowerCase().includes(search) ||
      o.box_type?.toLowerCase().includes(search)
    );
  }

  return filtered;
};

export const selectOrdersByStatus = (status: OrderStatus) => (state: { orders: OrdersState }) =>
  state.orders.orders.filter(o => o.status === status);

// Selector for getting order by ID
export const selectOrderById = (state: { orders: OrdersState }, orderId: string) =>
  state.orders.orders.find(o => o.id === orderId);
