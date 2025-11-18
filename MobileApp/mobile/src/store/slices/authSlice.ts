/**
 * Authentication Slice
 *
 * Manages user authentication state including:
 * - Login/logout
 * - User profile
 * - Authentication token
 * - Registration
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../../services/ApiService';

const TOKEN_KEY = '@cardose_token';
const USER_KEY = '@cardose_user';

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'sales' | 'production' | 'finance';
  avatar_url?: string;
  phone?: string;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false,
};

// Async thunks

/**
 * Initialize auth state from AsyncStorage
 */
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const [token, userJson] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (token && userJson) {
        const user = JSON.parse(userJson);
        return { token, user };
      }

      return { token: null, user: null };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Login user
 */
export const login = createAsyncThunk(
  'auth/login',
  async (
    credentials: { username: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await ApiService.post<{ token: string; user: User }>(
        '/auth/login',
        credentials
      );

      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Login failed');
      }

      const { token, user } = response.data;

      // Store token and user in AsyncStorage
      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, token),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
      ]);

      return { token, user };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

/**
 * Register new user
 */
export const register = createAsyncThunk(
  'auth/register',
  async (
    userData: {
      username: string;
      password: string;
      email: string;
      full_name: string;
      phone?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await ApiService.post<{ token: string; user: User }>(
        '/auth/register',
        userData
      );

      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Registration failed');
      }

      const { token, user } = response.data;

      // Store token and user in AsyncStorage
      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, token),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
      ]);

      return { token, user };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

/**
 * Logout user
 */
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Call logout endpoint (optional, for token invalidation)
      await ApiService.post('/auth/logout', {});

      // Clear AsyncStorage
      await Promise.all([
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);

      return null;
    } catch (error: any) {
      // Even if API call fails, clear local storage
      await Promise.all([
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);

      return null;
    }
  }
);

/**
 * Update user profile
 */
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (
    updates: Partial<Pick<User, 'full_name' | 'email' | 'phone' | 'avatar_url'>>,
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { auth: AuthState };
      const userId = state.auth.user?.id;

      if (!userId) {
        return rejectWithValue('User not authenticated');
      }

      const response = await ApiService.patch<User>(
        `/users/${userId}`,
        updates
      );

      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Update failed');
      }

      // Update user in AsyncStorage
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data));

      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Update failed');
    }
  }
);

/**
 * Change password
 */
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (
    passwords: { current_password: string; new_password: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await ApiService.post('/auth/change-password', passwords);

      if (!response.success) {
        return rejectWithValue(response.error || 'Password change failed');
      }

      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Password change failed');
    }
  }
);

/**
 * Refresh user data from server
 */
export const refreshUser = createAsyncThunk(
  'auth/refreshUser',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const userId = state.auth.user?.id;

      if (!userId) {
        return rejectWithValue('User not authenticated');
      }

      const response = await ApiService.get<User>(`/users/${userId}`);

      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Refresh failed');
      }

      // Update user in AsyncStorage
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data));

      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Refresh failed');
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    // Set user (for manual updates)
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Initialize
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = !!action.payload.token;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.error = action.payload as string;
      });

    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        // Reset to initial state
        return {
          ...initialState,
          isInitialized: true,
        };
      })
      .addCase(logout.rejected, (state) => {
        // Still reset on error
        return {
          ...initialState,
          isInitialized: true,
        };
      });

    // Update profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Change password
    builder
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Refresh user
    builder
      .addCase(refreshUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(refreshUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(refreshUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const { clearError, setUser } = authSlice.actions;

// Export reducer
export default authSlice.reducer;

// Selectors
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectIsInitialized = (state: { auth: AuthState }) => state.auth.isInitialized;
