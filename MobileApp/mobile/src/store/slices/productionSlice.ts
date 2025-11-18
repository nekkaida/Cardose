/**
 * Production Slice
 *
 * Manages production state including:
 * - Production tasks
 * - Task assignments
 * - Task status tracking
 * - Production analytics
 * - Worker productivity
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ProductionService } from '../../services/ProductionService';
import { ProductionTask, CreateTaskData, UpdateTaskData, TaskStatus } from '../../types/Production';

// Types
interface ProductionState {
  tasks: ProductionTask[];
  currentTask: ProductionTask | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    status?: TaskStatus;
    assigned_to?: string;
    order_id?: string;
    search?: string;
  };
  analytics: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    averageCompletionTime: number;
    tasksByStatus: { [key in TaskStatus]: number };
  } | null;
  lastSync: string | null;
}

// Initial state
const initialState: ProductionState = {
  tasks: [],
  currentTask: null,
  isLoading: false,
  error: null,
  filters: {},
  analytics: null,
  lastSync: null,
};

// Async thunks

/**
 * Fetch all tasks with optional filters
 */
export const fetchTasks = createAsyncThunk(
  'production/fetchTasks',
  async (filters?: { status?: TaskStatus; assigned_to?: string; order_id?: string }, { rejectWithValue }) => {
    try {
      const tasks = await ProductionService.getAllTasks(filters);
      return tasks;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch tasks');
    }
  }
);

/**
 * Fetch single task by ID
 */
export const fetchTaskById = createAsyncThunk(
  'production/fetchTaskById',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const task = await ProductionService.getTaskById(taskId);
      if (!task) {
        return rejectWithValue('Task not found');
      }
      return task;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch task');
    }
  }
);

/**
 * Create new task
 */
export const createTask = createAsyncThunk(
  'production/createTask',
  async (taskData: CreateTaskData, { rejectWithValue }) => {
    try {
      const task = await ProductionService.createTask(taskData);
      return task;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create task');
    }
  }
);

/**
 * Update existing task
 */
export const updateTask = createAsyncThunk(
  'production/updateTask',
  async (
    { taskId, updateData }: { taskId: string; updateData: UpdateTaskData },
    { rejectWithValue }
  ) => {
    try {
      const task = await ProductionService.updateTask(taskId, updateData);
      return task;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update task');
    }
  }
);

/**
 * Update task status
 */
export const updateTaskStatus = createAsyncThunk(
  'production/updateTaskStatus',
  async (
    { taskId, status, notes }: { taskId: string; status: TaskStatus; notes?: string },
    { rejectWithValue }
  ) => {
    try {
      const task = await ProductionService.updateTaskStatus(taskId, status, notes);
      return task;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update task status');
    }
  }
);

/**
 * Assign task to worker
 */
export const assignTask = createAsyncThunk(
  'production/assignTask',
  async (
    { taskId, workerId }: { taskId: string; workerId: string },
    { rejectWithValue }
  ) => {
    try {
      const task = await ProductionService.assignTask(taskId, workerId);
      return task;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to assign task');
    }
  }
);

/**
 * Start task
 */
export const startTask = createAsyncThunk(
  'production/startTask',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const task = await ProductionService.startTask(taskId);
      return task;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to start task');
    }
  }
);

/**
 * Complete task
 */
export const completeTask = createAsyncThunk(
  'production/completeTask',
  async (
    { taskId, notes }: { taskId: string; notes?: string },
    { rejectWithValue }
  ) => {
    try {
      const task = await ProductionService.completeTask(taskId, notes);
      return task;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to complete task');
    }
  }
);

/**
 * Delete task
 */
export const deleteTask = createAsyncThunk(
  'production/deleteTask',
  async (taskId: string, { rejectWithValue }) => {
    try {
      await ProductionService.deleteTask(taskId);
      return taskId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete task');
    }
  }
);

/**
 * Fetch tasks by order
 */
export const fetchTasksByOrder = createAsyncThunk(
  'production/fetchTasksByOrder',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const tasks = await ProductionService.getTasksByOrder(orderId);
      return tasks;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch tasks by order');
    }
  }
);

/**
 * Fetch tasks by worker
 */
export const fetchTasksByWorker = createAsyncThunk(
  'production/fetchTasksByWorker',
  async (workerId: string, { rejectWithValue }) => {
    try {
      const tasks = await ProductionService.getTasksByWorker(workerId);
      return tasks;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch tasks by worker');
    }
  }
);

/**
 * Fetch production analytics
 */
export const fetchProductionAnalytics = createAsyncThunk(
  'production/fetchAnalytics',
  async (period: 'week' | 'month' | 'quarter' | 'year' = 'month', { rejectWithValue }) => {
    try {
      const analytics = await ProductionService.getProductionAnalytics(period);
      return analytics;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch analytics');
    }
  }
);

/**
 * Sync pending tasks
 */
export const syncTasks = createAsyncThunk(
  'production/sync',
  async (_, { rejectWithValue }) => {
    try {
      await ProductionService.syncPendingTasks();
      // Refetch all tasks after sync
      const tasks = await ProductionService.getAllTasks();
      return tasks;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sync tasks');
    }
  }
);

// Slice
const productionSlice = createSlice({
  name: 'production',
  initialState,
  reducers: {
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    // Set filters
    setFilters: (state, action: PayloadAction<{ status?: TaskStatus; assigned_to?: string; order_id?: string; search?: string }>) => {
      state.filters = action.payload;
    },
    // Clear filters
    clearFilters: (state) => {
      state.filters = {};
    },
    // Set current task
    setCurrentTask: (state, action: PayloadAction<ProductionTask | null>) => {
      state.currentTask = action.payload;
    },
    // Clear current task
    clearCurrentTask: (state) => {
      state.currentTask = null;
    },
    // Update task in list (for optimistic updates)
    updateTaskInList: (state, action: PayloadAction<ProductionTask>) => {
      const index = state.tasks.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch tasks
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tasks = action.payload;
        state.lastSync = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch task by ID
    builder
      .addCase(fetchTaskById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentTask = action.payload;
        state.error = null;
      })
      .addCase(fetchTaskById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create task
    builder
      .addCase(createTask.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tasks.unshift(action.payload); // Add to beginning of list
        state.currentTask = action.payload;
        state.error = null;
      })
      .addCase(createTask.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update task
    builder
      .addCase(updateTask.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.isLoading = false;

        // Update in list
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }

        // Update current task if it's the same
        if (state.currentTask?.id === action.payload.id) {
          state.currentTask = action.payload;
        }

        state.error = null;
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update task status
    builder
      .addCase(updateTaskStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        state.isLoading = false;

        // Update in list
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }

        // Update current task if it's the same
        if (state.currentTask?.id === action.payload.id) {
          state.currentTask = action.payload;
        }

        state.error = null;
      })
      .addCase(updateTaskStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Assign task
    builder
      .addCase(assignTask.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(assignTask.fulfilled, (state, action) => {
        state.isLoading = false;

        // Update in list
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }

        // Update current task if it's the same
        if (state.currentTask?.id === action.payload.id) {
          state.currentTask = action.payload;
        }

        state.error = null;
      })
      .addCase(assignTask.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Start task
    builder
      .addCase(startTask.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startTask.fulfilled, (state, action) => {
        state.isLoading = false;

        // Update in list
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }

        // Update current task if it's the same
        if (state.currentTask?.id === action.payload.id) {
          state.currentTask = action.payload;
        }

        state.error = null;
      })
      .addCase(startTask.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Complete task
    builder
      .addCase(completeTask.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(completeTask.fulfilled, (state, action) => {
        state.isLoading = false;

        // Update in list
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }

        // Update current task if it's the same
        if (state.currentTask?.id === action.payload.id) {
          state.currentTask = action.payload;
        }

        state.error = null;
      })
      .addCase(completeTask.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete task
    builder
      .addCase(deleteTask.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tasks = state.tasks.filter(t => t.id !== action.payload);

        // Clear current task if it's the deleted one
        if (state.currentTask?.id === action.payload) {
          state.currentTask = null;
        }

        state.error = null;
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch tasks by order
    builder
      .addCase(fetchTasksByOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTasksByOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tasks = action.payload;
        state.error = null;
      })
      .addCase(fetchTasksByOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch tasks by worker
    builder
      .addCase(fetchTasksByWorker.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTasksByWorker.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tasks = action.payload;
        state.error = null;
      })
      .addCase(fetchTasksByWorker.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch analytics
    builder
      .addCase(fetchProductionAnalytics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProductionAnalytics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.analytics = action.payload;
        state.error = null;
      })
      .addCase(fetchProductionAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Sync tasks
    builder
      .addCase(syncTasks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(syncTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tasks = action.payload;
        state.lastSync = new Date().toISOString();
        state.error = null;
      })
      .addCase(syncTasks.rejected, (state, action) => {
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
  setCurrentTask,
  clearCurrentTask,
  updateTaskInList,
} = productionSlice.actions;

// Export reducer
export default productionSlice.reducer;

// Selectors
export const selectTasks = (state: { production: ProductionState }) => state.production.tasks;
export const selectCurrentTask = (state: { production: ProductionState }) => state.production.currentTask;
export const selectProductionLoading = (state: { production: ProductionState }) => state.production.isLoading;
export const selectProductionError = (state: { production: ProductionState }) => state.production.error;
export const selectProductionFilters = (state: { production: ProductionState }) => state.production.filters;
export const selectProductionAnalytics = (state: { production: ProductionState }) => state.production.analytics;
export const selectLastSync = (state: { production: ProductionState }) => state.production.lastSync;

// Filtered selectors
export const selectFilteredTasks = (state: { production: ProductionState }) => {
  const { tasks, filters } = state.production;
  let filtered = [...tasks];

  if (filters.status) {
    filtered = filtered.filter(t => t.status === filters.status);
  }

  if (filters.assigned_to) {
    filtered = filtered.filter(t => t.assigned_to === filters.assigned_to);
  }

  if (filters.order_id) {
    filtered = filtered.filter(t => t.order_id === filters.order_id);
  }

  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(search) ||
      t.description?.toLowerCase().includes(search)
    );
  }

  return filtered;
};

export const selectTasksByStatus = (status: TaskStatus) => (state: { production: ProductionState }) =>
  state.production.tasks.filter(t => t.status === status);

// Selector for getting task by ID
export const selectTaskById = (state: { production: ProductionState }, taskId: string) =>
  state.production.tasks.find(t => t.id === taskId);
