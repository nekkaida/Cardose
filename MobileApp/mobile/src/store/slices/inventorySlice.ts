/**
 * Inventory Slice
 *
 * Manages inventory state including:
 * - Material inventory
 * - Stock levels
 * - Low stock alerts
 * - Inventory transactions
 * - Material usage tracking
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { InventoryService } from '../../services/InventoryService';
import { InventoryMaterial, CreateMaterialData, UpdateMaterialData } from '../../types/Inventory';

// Types
interface InventoryState {
  materials: InventoryMaterial[];
  currentMaterial: InventoryMaterial | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    category?: string;
    lowStock?: boolean;
    search?: string;
  };
  lowStockItems: InventoryMaterial[];
  analytics: {
    totalMaterials: number;
    totalValue: number;
    lowStockCount: number;
    categories: { [key: string]: number };
  } | null;
  lastSync: string | null;
}

// Initial state
const initialState: InventoryState = {
  materials: [],
  currentMaterial: null,
  isLoading: false,
  error: null,
  filters: {},
  lowStockItems: [],
  analytics: null,
  lastSync: null,
};

// Async thunks

/**
 * Fetch all materials with optional filters
 */
export const fetchMaterials = createAsyncThunk(
  'inventory/fetchMaterials',
  async (filters?: { category?: string; lowStock?: boolean }, { rejectWithValue }) => {
    try {
      const materials = await InventoryService.getAllMaterials(filters);
      return materials;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch materials');
    }
  }
);

/**
 * Fetch single material by ID
 */
export const fetchMaterialById = createAsyncThunk(
  'inventory/fetchMaterialById',
  async (materialId: string, { rejectWithValue }) => {
    try {
      const material = await InventoryService.getMaterialById(materialId);
      if (!material) {
        return rejectWithValue('Material not found');
      }
      return material;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch material');
    }
  }
);

/**
 * Create new material
 */
export const createMaterial = createAsyncThunk(
  'inventory/createMaterial',
  async (materialData: CreateMaterialData, { rejectWithValue }) => {
    try {
      const material = await InventoryService.createMaterial(materialData);
      return material;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create material');
    }
  }
);

/**
 * Update existing material
 */
export const updateMaterial = createAsyncThunk(
  'inventory/updateMaterial',
  async (
    { materialId, updateData }: { materialId: string; updateData: UpdateMaterialData },
    { rejectWithValue }
  ) => {
    try {
      const material = await InventoryService.updateMaterial(materialId, updateData);
      return material;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update material');
    }
  }
);

/**
 * Delete material
 */
export const deleteMaterial = createAsyncThunk(
  'inventory/deleteMaterial',
  async (materialId: string, { rejectWithValue }) => {
    try {
      await InventoryService.deleteMaterial(materialId);
      return materialId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete material');
    }
  }
);

/**
 * Adjust stock level
 */
export const adjustStock = createAsyncThunk(
  'inventory/adjustStock',
  async (
    { materialId, quantity, reason }: { materialId: string; quantity: number; reason: string },
    { rejectWithValue }
  ) => {
    try {
      const material = await InventoryService.adjustStock(materialId, quantity, reason);
      return material;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to adjust stock');
    }
  }
);

/**
 * Fetch low stock items
 */
export const fetchLowStockItems = createAsyncThunk(
  'inventory/fetchLowStockItems',
  async (_, { rejectWithValue }) => {
    try {
      const materials = await InventoryService.getLowStockItems();
      return materials;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch low stock items');
    }
  }
);

/**
 * Search materials
 */
export const searchMaterials = createAsyncThunk(
  'inventory/searchMaterials',
  async (query: string, { rejectWithValue }) => {
    try {
      const materials = await InventoryService.searchMaterials(query);
      return materials;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to search materials');
    }
  }
);

/**
 * Fetch inventory analytics
 */
export const fetchInventoryAnalytics = createAsyncThunk(
  'inventory/fetchAnalytics',
  async (_, { rejectWithValue }) => {
    try {
      const analytics = await InventoryService.getInventoryAnalytics();
      return analytics;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch analytics');
    }
  }
);

/**
 * Sync pending inventory changes
 */
export const syncInventory = createAsyncThunk(
  'inventory/sync',
  async (_, { rejectWithValue }) => {
    try {
      await InventoryService.syncPendingInventory();
      // Refetch all materials after sync
      const materials = await InventoryService.getAllMaterials();
      return materials;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sync inventory');
    }
  }
);

// Slice
const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    // Set filters
    setFilters: (state, action: PayloadAction<{ category?: string; lowStock?: boolean; search?: string }>) => {
      state.filters = action.payload;
    },
    // Clear filters
    clearFilters: (state) => {
      state.filters = {};
    },
    // Set current material
    setCurrentMaterial: (state, action: PayloadAction<InventoryMaterial | null>) => {
      state.currentMaterial = action.payload;
    },
    // Clear current material
    clearCurrentMaterial: (state) => {
      state.currentMaterial = null;
    },
    // Update material in list (for optimistic updates)
    updateMaterialInList: (state, action: PayloadAction<InventoryMaterial>) => {
      const index = state.materials.findIndex(m => m.id === action.payload.id);
      if (index !== -1) {
        state.materials[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch materials
    builder
      .addCase(fetchMaterials.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMaterials.fulfilled, (state, action) => {
        state.isLoading = false;
        state.materials = action.payload;
        state.lastSync = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchMaterials.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch material by ID
    builder
      .addCase(fetchMaterialById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMaterialById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentMaterial = action.payload;
        state.error = null;
      })
      .addCase(fetchMaterialById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create material
    builder
      .addCase(createMaterial.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createMaterial.fulfilled, (state, action) => {
        state.isLoading = false;
        state.materials.unshift(action.payload); // Add to beginning of list
        state.currentMaterial = action.payload;
        state.error = null;
      })
      .addCase(createMaterial.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update material
    builder
      .addCase(updateMaterial.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateMaterial.fulfilled, (state, action) => {
        state.isLoading = false;

        // Update in list
        const index = state.materials.findIndex(m => m.id === action.payload.id);
        if (index !== -1) {
          state.materials[index] = action.payload;
        }

        // Update current material if it's the same
        if (state.currentMaterial?.id === action.payload.id) {
          state.currentMaterial = action.payload;
        }

        state.error = null;
      })
      .addCase(updateMaterial.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete material
    builder
      .addCase(deleteMaterial.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteMaterial.fulfilled, (state, action) => {
        state.isLoading = false;
        state.materials = state.materials.filter(m => m.id !== action.payload);

        // Clear current material if it's the deleted one
        if (state.currentMaterial?.id === action.payload) {
          state.currentMaterial = null;
        }

        state.error = null;
      })
      .addCase(deleteMaterial.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Adjust stock
    builder
      .addCase(adjustStock.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(adjustStock.fulfilled, (state, action) => {
        state.isLoading = false;

        // Update in list
        const index = state.materials.findIndex(m => m.id === action.payload.id);
        if (index !== -1) {
          state.materials[index] = action.payload;
        }

        // Update current material if it's the same
        if (state.currentMaterial?.id === action.payload.id) {
          state.currentMaterial = action.payload;
        }

        state.error = null;
      })
      .addCase(adjustStock.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch low stock items
    builder
      .addCase(fetchLowStockItems.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLowStockItems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lowStockItems = action.payload;
        state.error = null;
      })
      .addCase(fetchLowStockItems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Search materials
    builder
      .addCase(searchMaterials.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchMaterials.fulfilled, (state, action) => {
        state.isLoading = false;
        state.materials = action.payload;
        state.error = null;
      })
      .addCase(searchMaterials.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch analytics
    builder
      .addCase(fetchInventoryAnalytics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInventoryAnalytics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.analytics = action.payload;
        state.error = null;
      })
      .addCase(fetchInventoryAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Sync inventory
    builder
      .addCase(syncInventory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(syncInventory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.materials = action.payload;
        state.lastSync = new Date().toISOString();
        state.error = null;
      })
      .addCase(syncInventory.rejected, (state, action) => {
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
  setCurrentMaterial,
  clearCurrentMaterial,
  updateMaterialInList,
} = inventorySlice.actions;

// Export reducer
export default inventorySlice.reducer;

// Selectors
export const selectMaterials = (state: { inventory: InventoryState }) => state.inventory.materials;
export const selectCurrentMaterial = (state: { inventory: InventoryState }) => state.inventory.currentMaterial;
export const selectInventoryLoading = (state: { inventory: InventoryState }) => state.inventory.isLoading;
export const selectInventoryError = (state: { inventory: InventoryState }) => state.inventory.error;
export const selectInventoryFilters = (state: { inventory: InventoryState }) => state.inventory.filters;
export const selectLowStockItems = (state: { inventory: InventoryState }) => state.inventory.lowStockItems;
export const selectInventoryAnalytics = (state: { inventory: InventoryState }) => state.inventory.analytics;
export const selectLastSync = (state: { inventory: InventoryState }) => state.inventory.lastSync;

// Filtered selectors
export const selectFilteredMaterials = (state: { inventory: InventoryState }) => {
  const { materials, filters } = state.inventory;
  let filtered = [...materials];

  if (filters.category) {
    filtered = filtered.filter(m => m.category === filters.category);
  }

  if (filters.lowStock) {
    filtered = filtered.filter(m => m.current_stock <= m.minimum_stock);
  }

  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(m =>
      m.name.toLowerCase().includes(search) ||
      m.category.toLowerCase().includes(search) ||
      m.supplier?.toLowerCase().includes(search)
    );
  }

  return filtered;
};

export const selectMaterialsByCategory = (category: string) => (state: { inventory: InventoryState }) =>
  state.inventory.materials.filter(m => m.category === category);

// Selector for getting material by ID
export const selectMaterialById = (state: { inventory: InventoryState }, materialId: string) =>
  state.inventory.materials.find(m => m.id === materialId);
