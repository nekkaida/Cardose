/**
 * Sync Slice
 *
 * Manages offline sync state including:
 * - Sync queue
 * - Sync status
 * - Last sync timestamps
 * - Pending changes count
 * - Auto-sync configuration
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DatabaseService } from '../../services/DatabaseService';
import { OrderService } from '../../services/OrderService';
import { CustomerService } from '../../services/CustomerService';
import { InventoryService } from '../../services/InventoryService';
import { FinancialService } from '../../services/FinancialService';
import { ProductionService } from '../../services/ProductionService';

// Types
export interface SyncQueueItem {
  id: string;
  entity_type: 'order' | 'customer' | 'inventory' | 'financial' | 'production';
  entity_id: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  created_at: string;
  retry_count: number;
  last_error?: string;
}

interface SyncState {
  // Sync status
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;

  // Queue
  queueItems: SyncQueueItem[];
  pendingCount: number;

  // Sync results
  lastSyncResults: {
    success: number;
    failed: number;
    total: number;
  } | null;

  // Auto-sync settings
  autoSyncEnabled: boolean;
  autoSyncInterval: number; // in minutes

  // Sync status by entity type
  entitySyncStatus: {
    orders: { lastSync: string | null; status: 'idle' | 'syncing' | 'success' | 'error' };
    customers: { lastSync: string | null; status: 'idle' | 'syncing' | 'success' | 'error' };
    inventory: { lastSync: string | null; status: 'idle' | 'syncing' | 'success' | 'error' };
    financial: { lastSync: string | null; status: 'idle' | 'syncing' | 'success' | 'error' };
    production: { lastSync: string | null; status: 'idle' | 'syncing' | 'success' | 'error' };
  };
}

// Initial state
const initialState: SyncState = {
  isSyncing: false,
  lastSyncAt: null,
  syncError: null,
  queueItems: [],
  pendingCount: 0,
  lastSyncResults: null,
  autoSyncEnabled: true,
  autoSyncInterval: 15, // 15 minutes
  entitySyncStatus: {
    orders: { lastSync: null, status: 'idle' },
    customers: { lastSync: null, status: 'idle' },
    inventory: { lastSync: null, status: 'idle' },
    financial: { lastSync: null, status: 'idle' },
    production: { lastSync: null, status: 'idle' },
  },
};

// Async thunks

/**
 * Fetch sync queue
 */
export const fetchSyncQueue = createAsyncThunk(
  'sync/fetchQueue',
  async (_, { rejectWithValue }) => {
    try {
      const queueItems = await DatabaseService.getPendingSyncItems();
      return queueItems;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch sync queue');
    }
  }
);

/**
 * Sync all pending changes
 */
export const syncAll = createAsyncThunk(
  'sync/syncAll',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      let successCount = 0;
      let failedCount = 0;

      // Sync orders
      dispatch(setSyncStatus({ entity: 'orders', status: 'syncing' }));
      try {
        await OrderService.syncPendingOrders();
        dispatch(setSyncStatus({ entity: 'orders', status: 'success' }));
        dispatch(setLastSync({ entity: 'orders', timestamp: new Date().toISOString() }));
        successCount++;
      } catch (error) {
        dispatch(setSyncStatus({ entity: 'orders', status: 'error' }));
        failedCount++;
      }

      // Sync customers
      dispatch(setSyncStatus({ entity: 'customers', status: 'syncing' }));
      try {
        await CustomerService.syncPendingCustomers();
        dispatch(setSyncStatus({ entity: 'customers', status: 'success' }));
        dispatch(setLastSync({ entity: 'customers', timestamp: new Date().toISOString() }));
        successCount++;
      } catch (error) {
        dispatch(setSyncStatus({ entity: 'customers', status: 'error' }));
        failedCount++;
      }

      // Sync inventory
      dispatch(setSyncStatus({ entity: 'inventory', status: 'syncing' }));
      try {
        await InventoryService.syncPendingInventory();
        dispatch(setSyncStatus({ entity: 'inventory', status: 'success' }));
        dispatch(setLastSync({ entity: 'inventory', timestamp: new Date().toISOString() }));
        successCount++;
      } catch (error) {
        dispatch(setSyncStatus({ entity: 'inventory', status: 'error' }));
        failedCount++;
      }

      // Sync financial
      dispatch(setSyncStatus({ entity: 'financial', status: 'syncing' }));
      try {
        await FinancialService.syncPendingFinancial();
        dispatch(setSyncStatus({ entity: 'financial', status: 'success' }));
        dispatch(setLastSync({ entity: 'financial', timestamp: new Date().toISOString() }));
        successCount++;
      } catch (error) {
        dispatch(setSyncStatus({ entity: 'financial', status: 'error' }));
        failedCount++;
      }

      // Sync production
      dispatch(setSyncStatus({ entity: 'production', status: 'syncing' }));
      try {
        await ProductionService.syncPendingTasks();
        dispatch(setSyncStatus({ entity: 'production', status: 'success' }));
        dispatch(setLastSync({ entity: 'production', timestamp: new Date().toISOString() }));
        successCount++;
      } catch (error) {
        dispatch(setSyncStatus({ entity: 'production', status: 'error' }));
        failedCount++;
      }

      // Refresh queue
      await dispatch(fetchSyncQueue());

      return {
        success: successCount,
        failed: failedCount,
        total: successCount + failedCount,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sync failed');
    }
  }
);

/**
 * Sync specific entity type
 */
export const syncEntity = createAsyncThunk(
  'sync/syncEntity',
  async (
    entityType: 'orders' | 'customers' | 'inventory' | 'financial' | 'production',
    { rejectWithValue, dispatch }
  ) => {
    try {
      dispatch(setSyncStatus({ entity: entityType, status: 'syncing' }));

      switch (entityType) {
        case 'orders':
          await OrderService.syncPendingOrders();
          break;
        case 'customers':
          await CustomerService.syncPendingCustomers();
          break;
        case 'inventory':
          await InventoryService.syncPendingInventory();
          break;
        case 'financial':
          await FinancialService.syncPendingFinancial();
          break;
        case 'production':
          await ProductionService.syncPendingTasks();
          break;
      }

      dispatch(setSyncStatus({ entity: entityType, status: 'success' }));
      dispatch(setLastSync({ entity: entityType, timestamp: new Date().toISOString() }));
      await dispatch(fetchSyncQueue());

      return entityType;
    } catch (error: any) {
      dispatch(setSyncStatus({ entity: entityType, status: 'error' }));
      return rejectWithValue(error.message || `Failed to sync ${entityType}`);
    }
  }
);

/**
 * Clear sync queue item
 */
export const clearSyncItem = createAsyncThunk(
  'sync/clearItem',
  async (itemId: string, { rejectWithValue }) => {
    try {
      await DatabaseService.clearSyncItem(itemId);
      return itemId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to clear sync item');
    }
  }
);

/**
 * Clear entire sync queue
 */
export const clearSyncQueue = createAsyncThunk(
  'sync/clearQueue',
  async (_, { rejectWithValue }) => {
    try {
      // Get all items
      const items = await DatabaseService.getPendingSyncItems();

      // Clear each item
      for (const item of items) {
        await DatabaseService.clearSyncItem(item.id);
      }

      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to clear sync queue');
    }
  }
);

// Slice
const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    // Set sync status for entity
    setSyncStatus: (
      state,
      action: PayloadAction<{
        entity: 'orders' | 'customers' | 'inventory' | 'financial' | 'production';
        status: 'idle' | 'syncing' | 'success' | 'error';
      }>
    ) => {
      state.entitySyncStatus[action.payload.entity].status = action.payload.status;
    },

    // Set last sync timestamp for entity
    setLastSync: (
      state,
      action: PayloadAction<{
        entity: 'orders' | 'customers' | 'inventory' | 'financial' | 'production';
        timestamp: string;
      }>
    ) => {
      state.entitySyncStatus[action.payload.entity].lastSync = action.payload.timestamp;
    },

    // Toggle auto-sync
    toggleAutoSync: (state) => {
      state.autoSyncEnabled = !state.autoSyncEnabled;
    },

    // Set auto-sync enabled
    setAutoSyncEnabled: (state, action: PayloadAction<boolean>) => {
      state.autoSyncEnabled = action.payload;
    },

    // Set auto-sync interval
    setAutoSyncInterval: (state, action: PayloadAction<number>) => {
      state.autoSyncInterval = action.payload;
    },

    // Clear sync error
    clearSyncError: (state) => {
      state.syncError = null;
    },

    // Add item to queue (optimistic)
    addToQueue: (state, action: PayloadAction<SyncQueueItem>) => {
      state.queueItems.push(action.payload);
      state.pendingCount = state.queueItems.length;
    },

    // Remove item from queue (optimistic)
    removeFromQueue: (state, action: PayloadAction<string>) => {
      state.queueItems = state.queueItems.filter(item => item.id !== action.payload);
      state.pendingCount = state.queueItems.length;
    },

    // Reset all sync status
    resetSyncStatus: (state) => {
      state.entitySyncStatus = {
        orders: { lastSync: null, status: 'idle' },
        customers: { lastSync: null, status: 'idle' },
        inventory: { lastSync: null, status: 'idle' },
        financial: { lastSync: null, status: 'idle' },
        production: { lastSync: null, status: 'idle' },
      };
    },
  },
  extraReducers: (builder) => {
    // Fetch sync queue
    builder
      .addCase(fetchSyncQueue.pending, (state) => {
        // Don't set loading state here to avoid UI flicker
      })
      .addCase(fetchSyncQueue.fulfilled, (state, action) => {
        state.queueItems = action.payload;
        state.pendingCount = action.payload.length;
      })
      .addCase(fetchSyncQueue.rejected, (state, action) => {
        state.syncError = action.payload as string;
      });

    // Sync all
    builder
      .addCase(syncAll.pending, (state) => {
        state.isSyncing = true;
        state.syncError = null;
      })
      .addCase(syncAll.fulfilled, (state, action) => {
        state.isSyncing = false;
        state.lastSyncAt = new Date().toISOString();
        state.lastSyncResults = action.payload;
        state.syncError = null;
      })
      .addCase(syncAll.rejected, (state, action) => {
        state.isSyncing = false;
        state.syncError = action.payload as string;
      });

    // Sync entity
    builder
      .addCase(syncEntity.pending, (state) => {
        state.isSyncing = true;
        state.syncError = null;
      })
      .addCase(syncEntity.fulfilled, (state) => {
        state.isSyncing = false;
        state.syncError = null;
      })
      .addCase(syncEntity.rejected, (state, action) => {
        state.isSyncing = false;
        state.syncError = action.payload as string;
      });

    // Clear sync item
    builder
      .addCase(clearSyncItem.fulfilled, (state, action) => {
        state.queueItems = state.queueItems.filter(item => item.id !== action.payload);
        state.pendingCount = state.queueItems.length;
      });

    // Clear sync queue
    builder
      .addCase(clearSyncQueue.fulfilled, (state) => {
        state.queueItems = [];
        state.pendingCount = 0;
      });
  },
});

// Export actions
export const {
  setSyncStatus,
  setLastSync,
  toggleAutoSync,
  setAutoSyncEnabled,
  setAutoSyncInterval,
  clearSyncError,
  addToQueue,
  removeFromQueue,
  resetSyncStatus,
} = syncSlice.actions;

// Export reducer
export default syncSlice.reducer;

// Selectors
export const selectIsSyncing = (state: { sync: SyncState }) => state.sync.isSyncing;
export const selectLastSyncAt = (state: { sync: SyncState }) => state.sync.lastSyncAt;
export const selectSyncError = (state: { sync: SyncState }) => state.sync.syncError;
export const selectQueueItems = (state: { sync: SyncState }) => state.sync.queueItems;
export const selectPendingCount = (state: { sync: SyncState }) => state.sync.pendingCount;
export const selectLastSyncResults = (state: { sync: SyncState }) => state.sync.lastSyncResults;
export const selectAutoSyncEnabled = (state: { sync: SyncState }) => state.sync.autoSyncEnabled;
export const selectAutoSyncInterval = (state: { sync: SyncState }) => state.sync.autoSyncInterval;
export const selectEntitySyncStatus = (state: { sync: SyncState }) => state.sync.entitySyncStatus;
export const selectHasPendingChanges = (state: { sync: SyncState }) => state.sync.pendingCount > 0;

// Entity-specific selectors
export const selectOrdersSyncStatus = (state: { sync: SyncState }) => state.sync.entitySyncStatus.orders;
export const selectCustomersSyncStatus = (state: { sync: SyncState }) => state.sync.entitySyncStatus.customers;
export const selectInventorySyncStatus = (state: { sync: SyncState }) => state.sync.entitySyncStatus.inventory;
export const selectFinancialSyncStatus = (state: { sync: SyncState }) => state.sync.entitySyncStatus.financial;
export const selectProductionSyncStatus = (state: { sync: SyncState }) => state.sync.entitySyncStatus.production;
