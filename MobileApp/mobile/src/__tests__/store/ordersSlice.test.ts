/**
 * Orders Slice Unit Tests
 */

import ordersReducer, {
  clearError,
  setFilters,
  clearFilters,
  setCurrentOrder,
  clearCurrentOrder,
  updateOrderInList,
  fetchOrders,
  fetchOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  searchOrders,
  fetchOrderAnalytics,
  syncOrders,
  selectOrders,
  selectCurrentOrder,
  selectOrdersLoading,
  selectOrdersError,
  selectOrdersFilters,
  selectOrderAnalytics,
  selectLastSync,
  selectFilteredOrders,
  selectOrdersByStatus,
} from '../../store/slices/ordersSlice';

// Mock OrderService
jest.mock('../../services/OrderService', () => ({
  OrderService: {
    getAllOrders: jest.fn(),
    getOrderById: jest.fn(),
    createOrder: jest.fn(),
    updateOrder: jest.fn(),
    updateOrderStatus: jest.fn(),
    deleteOrder: jest.fn(),
    searchOrders: jest.fn(),
    getOrderAnalytics: jest.fn(),
    syncPendingOrders: jest.fn(),
  },
}));

describe('ordersSlice', () => {
  const initialState = {
    orders: [],
    currentOrder: null,
    isLoading: false,
    error: null,
    filters: {},
    analytics: null,
    lastSync: null,
  };

  const mockOrder = {
    id: 'order-123',
    order_number: 'PGB-2024-001',
    customer_id: 'customer-123',
    customer_name: 'Test Customer',
    status: 'pending' as const,
    box_type: 'Premium Box',
    quantity: 100,
    total_price: 5000000,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockOrders = [
    mockOrder,
    {
      ...mockOrder,
      id: 'order-456',
      order_number: 'PGB-2024-002',
      status: 'in_progress' as const,
    },
    {
      ...mockOrder,
      id: 'order-789',
      order_number: 'PGB-2024-003',
      status: 'completed' as const,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reducers', () => {
    it('should return initial state', () => {
      expect(ordersReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('should handle clearError', () => {
      const stateWithError = { ...initialState, error: 'Some error' };
      const newState = ordersReducer(stateWithError, clearError());
      expect(newState.error).toBeNull();
    });

    it('should handle setFilters', () => {
      const filters = { status: 'pending' as const, search: 'test' };
      const newState = ordersReducer(initialState, setFilters(filters));
      expect(newState.filters).toEqual(filters);
    });

    it('should handle clearFilters', () => {
      const stateWithFilters = { ...initialState, filters: { status: 'pending' as const } };
      const newState = ordersReducer(stateWithFilters, clearFilters());
      expect(newState.filters).toEqual({});
    });

    it('should handle setCurrentOrder', () => {
      const newState = ordersReducer(initialState, setCurrentOrder(mockOrder as any));
      expect(newState.currentOrder).toEqual(mockOrder);
    });

    it('should handle clearCurrentOrder', () => {
      const stateWithOrder = { ...initialState, currentOrder: mockOrder as any };
      const newState = ordersReducer(stateWithOrder, clearCurrentOrder());
      expect(newState.currentOrder).toBeNull();
    });

    it('should handle updateOrderInList', () => {
      const stateWithOrders = { ...initialState, orders: mockOrders as any };
      const updatedOrder = { ...mockOrder, status: 'in_progress' as const };
      const newState = ordersReducer(stateWithOrders, updateOrderInList(updatedOrder as any));

      const found = newState.orders.find((o: any) => o.id === 'order-123');
      expect(found?.status).toBe('in_progress');
    });
  });

  describe('fetchOrders', () => {
    it('should set loading true when pending', () => {
      const action = { type: fetchOrders.pending.type };
      const state = ordersReducer(initialState, action);
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set orders when fulfilled', () => {
      const action = {
        type: fetchOrders.fulfilled.type,
        payload: mockOrders,
      };
      const state = ordersReducer(initialState, action);

      expect(state.isLoading).toBe(false);
      expect(state.orders).toEqual(mockOrders);
      expect(state.lastSync).toBeDefined();
    });

    it('should set error when rejected', () => {
      const action = {
        type: fetchOrders.rejected.type,
        payload: 'Failed to fetch',
      };
      const state = ordersReducer(initialState, action);

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Failed to fetch');
    });
  });

  describe('fetchOrderById', () => {
    it('should set current order when fulfilled', () => {
      const action = {
        type: fetchOrderById.fulfilled.type,
        payload: mockOrder,
      };
      const state = ordersReducer(initialState, action);

      expect(state.currentOrder).toEqual(mockOrder);
      expect(state.error).toBeNull();
    });

    it('should set error when rejected', () => {
      const action = {
        type: fetchOrderById.rejected.type,
        payload: 'Order not found',
      };
      const state = ordersReducer(initialState, action);

      expect(state.error).toBe('Order not found');
    });
  });

  describe('createOrder', () => {
    it('should add order to list when fulfilled', () => {
      const action = {
        type: createOrder.fulfilled.type,
        payload: mockOrder,
      };
      const state = ordersReducer(initialState, action);

      expect(state.orders).toHaveLength(1);
      expect(state.orders[0]).toEqual(mockOrder);
      expect(state.currentOrder).toEqual(mockOrder);
    });

    it('should add to beginning of list', () => {
      const stateWithOrders = { ...initialState, orders: mockOrders.slice(1) as any };
      const action = {
        type: createOrder.fulfilled.type,
        payload: mockOrder,
      };
      const state = ordersReducer(stateWithOrders, action);

      expect(state.orders[0].id).toBe('order-123');
    });
  });

  describe('updateOrder', () => {
    it('should update order in list when fulfilled', () => {
      const stateWithOrders = { ...initialState, orders: [mockOrder] as any };
      const updatedOrder = { ...mockOrder, quantity: 200 };
      const action = {
        type: updateOrder.fulfilled.type,
        payload: updatedOrder,
      };
      const state = ordersReducer(stateWithOrders, action);

      expect(state.orders[0].quantity).toBe(200);
    });

    it('should update current order if same', () => {
      const stateWithOrder = {
        ...initialState,
        orders: [mockOrder] as any,
        currentOrder: mockOrder as any,
      };
      const updatedOrder = { ...mockOrder, quantity: 200 };
      const action = {
        type: updateOrder.fulfilled.type,
        payload: updatedOrder,
      };
      const state = ordersReducer(stateWithOrder, action);

      expect(state.currentOrder?.quantity).toBe(200);
    });
  });

  describe('updateOrderStatus', () => {
    it('should update status in list when fulfilled', () => {
      const stateWithOrders = { ...initialState, orders: [mockOrder] as any };
      const updatedOrder = { ...mockOrder, status: 'completed' as const };
      const action = {
        type: updateOrderStatus.fulfilled.type,
        payload: updatedOrder,
      };
      const state = ordersReducer(stateWithOrders, action);

      expect(state.orders[0].status).toBe('completed');
    });
  });

  describe('deleteOrder', () => {
    it('should remove order from list when fulfilled', () => {
      const stateWithOrders = { ...initialState, orders: mockOrders as any };
      const action = {
        type: deleteOrder.fulfilled.type,
        payload: 'order-123',
      };
      const state = ordersReducer(stateWithOrders, action);

      expect(state.orders).toHaveLength(2);
      expect(state.orders.find((o: any) => o.id === 'order-123')).toBeUndefined();
    });

    it('should clear current order if deleted', () => {
      const stateWithOrder = {
        ...initialState,
        orders: [mockOrder] as any,
        currentOrder: mockOrder as any,
      };
      const action = {
        type: deleteOrder.fulfilled.type,
        payload: 'order-123',
      };
      const state = ordersReducer(stateWithOrder, action);

      expect(state.currentOrder).toBeNull();
    });
  });

  describe('searchOrders', () => {
    it('should replace orders with search results', () => {
      const stateWithOrders = { ...initialState, orders: mockOrders as any };
      const searchResults = [mockOrder];
      const action = {
        type: searchOrders.fulfilled.type,
        payload: searchResults,
      };
      const state = ordersReducer(stateWithOrders, action);

      expect(state.orders).toHaveLength(1);
    });
  });

  describe('fetchOrderAnalytics', () => {
    const mockAnalytics = {
      totalOrders: 100,
      completedOrders: 80,
      pendingOrders: 20,
      totalRevenue: 500000000,
      averageOrderValue: 5000000,
      ordersByStatus: {
        pending: 10,
        confirmed: 5,
        in_progress: 5,
        completed: 80,
        cancelled: 0,
      },
    };

    it('should set analytics when fulfilled', () => {
      const action = {
        type: fetchOrderAnalytics.fulfilled.type,
        payload: mockAnalytics,
      };
      const state = ordersReducer(initialState, action);

      expect(state.analytics).toEqual(mockAnalytics);
    });
  });

  describe('syncOrders', () => {
    it('should update orders and lastSync when fulfilled', () => {
      const action = {
        type: syncOrders.fulfilled.type,
        payload: mockOrders,
      };
      const state = ordersReducer(initialState, action);

      expect(state.orders).toEqual(mockOrders);
      expect(state.lastSync).toBeDefined();
    });
  });

  describe('selectors', () => {
    const mockAnalytics = {
      totalOrders: 100,
      completedOrders: 80,
      pendingOrders: 20,
      totalRevenue: 500000000,
      averageOrderValue: 5000000,
      ordersByStatus: {
        pending: 10,
        confirmed: 5,
        in_progress: 5,
        completed: 80,
        cancelled: 0,
      },
    };

    const state = {
      orders: {
        orders: mockOrders,
        currentOrder: mockOrder,
        isLoading: true,
        error: 'Some error',
        filters: { status: 'pending' as const, search: 'PGB' },
        analytics: mockAnalytics,
        lastSync: '2024-01-01T00:00:00Z',
      },
    };

    it('should select orders', () => {
      expect(selectOrders(state as any)).toEqual(mockOrders);
    });

    it('should select current order', () => {
      expect(selectCurrentOrder(state as any)).toEqual(mockOrder);
    });

    it('should select loading state', () => {
      expect(selectOrdersLoading(state as any)).toBe(true);
    });

    it('should select error', () => {
      expect(selectOrdersError(state as any)).toBe('Some error');
    });

    it('should select filters', () => {
      expect(selectOrdersFilters(state as any)).toEqual({ status: 'pending', search: 'PGB' });
    });

    it('should select analytics', () => {
      expect(selectOrderAnalytics(state as any)).toEqual(mockAnalytics);
    });

    it('should select lastSync', () => {
      expect(selectLastSync(state as any)).toBe('2024-01-01T00:00:00Z');
    });

    describe('selectFilteredOrders', () => {
      it('should filter by status', () => {
        const result = selectFilteredOrders(state as any);
        expect(result.every((o: any) => o.status === 'pending')).toBe(true);
      });

      it('should filter by search', () => {
        const stateWithSearch = {
          orders: {
            ...state.orders,
            filters: { search: '002' },
          },
        };
        const result = selectFilteredOrders(stateWithSearch as any);
        expect(result).toHaveLength(1);
        expect(result[0].order_number).toBe('PGB-2024-002');
      });

      it('should return all when no filters', () => {
        const stateNoFilters = {
          orders: {
            ...state.orders,
            filters: {},
          },
        };
        const result = selectFilteredOrders(stateNoFilters as any);
        expect(result).toHaveLength(3);
      });
    });

    describe('selectOrdersByStatus', () => {
      it('should select orders by status', () => {
        const selector = selectOrdersByStatus('pending');
        const result = selector(state as any);
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('pending');
      });

      it('should return empty array for no matches', () => {
        const selector = selectOrdersByStatus('cancelled');
        const result = selector(state as any);
        expect(result).toHaveLength(0);
      });
    });
  });
});
