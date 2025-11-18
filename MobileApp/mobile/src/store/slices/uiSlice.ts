/**
 * UI Slice
 *
 * Manages global UI state including:
 * - Loading states
 * - Error messages
 * - Success messages
 * - Toast notifications
 * - Modal states
 * - Theme settings
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface Modal {
  id: string;
  isOpen: boolean;
  data?: any;
}

interface UIState {
  // Loading states
  isGlobalLoading: boolean;
  loadingMessage?: string;

  // Toast notifications
  toasts: Toast[];

  // Modals
  modals: { [key: string]: Modal };

  // Theme
  theme: 'light' | 'dark';

  // Network status
  isOnline: boolean;

  // Drawer/sidebar
  isDrawerOpen: boolean;

  // Bottom sheet
  activeBottomSheet: string | null;
  bottomSheetData?: any;

  // Error messages
  globalError: string | null;

  // Success messages
  globalSuccess: string | null;
}

// Initial state
const initialState: UIState = {
  isGlobalLoading: false,
  loadingMessage: undefined,
  toasts: [],
  modals: {},
  theme: 'light',
  isOnline: true,
  isDrawerOpen: false,
  activeBottomSheet: null,
  bottomSheetData: undefined,
  globalError: null,
  globalSuccess: null,
};

// Slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Loading
    setGlobalLoading: (state, action: PayloadAction<{ isLoading: boolean; message?: string }>) => {
      state.isGlobalLoading = action.payload.isLoading;
      state.loadingMessage = action.payload.message;
    },
    clearGlobalLoading: (state) => {
      state.isGlobalLoading = false;
      state.loadingMessage = undefined;
    },

    // Toasts
    showToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      const toast: Toast = {
        ...action.payload,
        id: Date.now().toString() + Math.random().toString(36).substr(2),
      };
      state.toasts.push(toast);
    },
    hideToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(t => t.id !== action.payload);
    },
    clearAllToasts: (state) => {
      state.toasts = [];
    },

    // Success toast shorthand
    showSuccess: (state, action: PayloadAction<string>) => {
      const toast: Toast = {
        id: Date.now().toString() + Math.random().toString(36).substr(2),
        type: 'success',
        message: action.payload,
        duration: 3000,
      };
      state.toasts.push(toast);
    },

    // Error toast shorthand
    showError: (state, action: PayloadAction<string>) => {
      const toast: Toast = {
        id: Date.now().toString() + Math.random().toString(36).substr(2),
        type: 'error',
        message: action.payload,
        duration: 4000,
      };
      state.toasts.push(toast);
    },

    // Warning toast shorthand
    showWarning: (state, action: PayloadAction<string>) => {
      const toast: Toast = {
        id: Date.now().toString() + Math.random().toString(36).substr(2),
        type: 'warning',
        message: action.payload,
        duration: 3000,
      };
      state.toasts.push(toast);
    },

    // Info toast shorthand
    showInfo: (state, action: PayloadAction<string>) => {
      const toast: Toast = {
        id: Date.now().toString() + Math.random().toString(36).substr(2),
        type: 'info',
        message: action.payload,
        duration: 3000,
      };
      state.toasts.push(toast);
    },

    // Modals
    openModal: (state, action: PayloadAction<{ id: string; data?: any }>) => {
      state.modals[action.payload.id] = {
        id: action.payload.id,
        isOpen: true,
        data: action.payload.data,
      };
    },
    closeModal: (state, action: PayloadAction<string>) => {
      if (state.modals[action.payload]) {
        state.modals[action.payload].isOpen = false;
      }
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(key => {
        state.modals[key].isOpen = false;
      });
    },

    // Theme
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },

    // Network status
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;

      // Show toast when going offline/online
      if (!action.payload) {
        const toast: Toast = {
          id: 'offline-' + Date.now(),
          type: 'warning',
          message: 'You are offline. Changes will be synced when connection is restored.',
          duration: 5000,
        };
        state.toasts.push(toast);
      } else {
        const toast: Toast = {
          id: 'online-' + Date.now(),
          type: 'success',
          message: 'You are back online.',
          duration: 3000,
        };
        state.toasts.push(toast);
      }
    },

    // Drawer
    openDrawer: (state) => {
      state.isDrawerOpen = true;
    },
    closeDrawer: (state) => {
      state.isDrawerOpen = false;
    },
    toggleDrawer: (state) => {
      state.isDrawerOpen = !state.isDrawerOpen;
    },

    // Bottom sheet
    openBottomSheet: (state, action: PayloadAction<{ id: string; data?: any }>) => {
      state.activeBottomSheet = action.payload.id;
      state.bottomSheetData = action.payload.data;
    },
    closeBottomSheet: (state) => {
      state.activeBottomSheet = null;
      state.bottomSheetData = undefined;
    },

    // Global error
    setGlobalError: (state, action: PayloadAction<string>) => {
      state.globalError = action.payload;
    },
    clearGlobalError: (state) => {
      state.globalError = null;
    },

    // Global success
    setGlobalSuccess: (state, action: PayloadAction<string>) => {
      state.globalSuccess = action.payload;
    },
    clearGlobalSuccess: (state) => {
      state.globalSuccess = null;
    },

    // Clear all UI states (useful for logout)
    resetUI: () => initialState,
  },
});

// Export actions
export const {
  setGlobalLoading,
  clearGlobalLoading,
  showToast,
  hideToast,
  clearAllToasts,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  openModal,
  closeModal,
  closeAllModals,
  setTheme,
  toggleTheme,
  setOnlineStatus,
  openDrawer,
  closeDrawer,
  toggleDrawer,
  openBottomSheet,
  closeBottomSheet,
  setGlobalError,
  clearGlobalError,
  setGlobalSuccess,
  clearGlobalSuccess,
  resetUI,
} = uiSlice.actions;

// Export reducer
export default uiSlice.reducer;

// Selectors
export const selectIsGlobalLoading = (state: { ui: UIState }) => state.ui.isGlobalLoading;
export const selectLoadingMessage = (state: { ui: UIState }) => state.ui.loadingMessage;
export const selectToasts = (state: { ui: UIState }) => state.ui.toasts;
export const selectModals = (state: { ui: UIState }) => state.ui.modals;
export const selectModal = (id: string) => (state: { ui: UIState }) => state.ui.modals[id];
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectIsOnline = (state: { ui: UIState }) => state.ui.isOnline;
export const selectIsDrawerOpen = (state: { ui: UIState }) => state.ui.isDrawerOpen;
export const selectActiveBottomSheet = (state: { ui: UIState }) => state.ui.activeBottomSheet;
export const selectBottomSheetData = (state: { ui: UIState }) => state.ui.bottomSheetData;
export const selectGlobalError = (state: { ui: UIState }) => state.ui.globalError;
export const selectGlobalSuccess = (state: { ui: UIState }) => state.ui.globalSuccess;
