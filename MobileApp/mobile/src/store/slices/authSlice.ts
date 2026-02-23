/**
 * Authentication Slice
 *
 * Manages user authentication state including:
 * - Login/logout
 * - User profile
 * - Authentication token
 * - Registration
 * - Token expiry validation
 * - Password reset request
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ApiService } from '../../services/ApiService';
import { VALID_ROLES, type UserRole } from '../../utils/authConstants';
import * as tokenStorage from '../../utils/tokenStorage';

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
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

// ── Utilities ──────────────────────────────────────────────────────────

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

/**
 * Hermes-compatible base64 decode (atob is not available in Hermes).
 */
function base64Decode(input: string): string {
  let output = '';
  const str = input.replace(/[^A-Za-z0-9+/=]/g, '');

  for (let i = 0; i < str.length; i += 4) {
    const enc1 = BASE64_CHARS.indexOf(str.charAt(i));
    const enc2 = BASE64_CHARS.indexOf(str.charAt(i + 1));
    const enc3 = BASE64_CHARS.indexOf(str.charAt(i + 2));
    const enc4 = BASE64_CHARS.indexOf(str.charAt(i + 3));

    output += String.fromCharCode((enc1 << 2) | (enc2 >> 4));
    if (enc3 !== 64) output += String.fromCharCode(((enc2 & 15) << 4) | (enc3 >> 2));
    if (enc4 !== 64) output += String.fromCharCode(((enc3 & 3) << 6) | enc4);
  }

  return output;
}

/**
 * Decode JWT payload without a library.
 * Returns null if the token is malformed.
 */
export function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64url → base64
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    const json = base64Decode(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Returns true if the JWT token has not expired.
 * Adds a 60-second buffer to account for clock skew.
 */
export function isTokenValid(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp > nowSeconds + 60; // 60s buffer
}

/**
 * Normalize user object from backend (handles both full_name and fullName).
 * Validates that required fields exist and role is a known value.
 */
export function normalizeUser(raw: any): User {
  if (!raw || typeof raw !== 'object' || !raw.id) {
    throw new Error('Invalid user data received from server');
  }

  const rawRole = raw.role as string;
  const role: UserRole = VALID_ROLES.includes(rawRole as UserRole)
    ? (rawRole as UserRole)
    : 'employee'; // safe default for unknown roles

  return {
    id: raw.id,
    username: raw.username,
    email: raw.email,
    fullName: raw.fullName || raw.full_name || '',
    role,
    avatarUrl: raw.avatarUrl || raw.avatar_url,
    phone: raw.phone,
    createdAt: raw.createdAt || raw.created_at || '',
  };
}

// ── Async thunks ───────────────────────────────────────────────────────

/**
 * Initialize auth state from storage.
 * Validates token expiry before restoring session.
 */
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const [token, userJson] = await Promise.all([
        tokenStorage.getToken(),
        tokenStorage.getUser(),
      ]);

      if (token && userJson) {
        if (!isTokenValid(token)) {
          await tokenStorage.clearAll();
          return { token: null, user: null };
        }

        try {
          const user = normalizeUser(JSON.parse(userJson));
          return { token, user };
        } catch {
          await tokenStorage.clearAll();
          return { token: null, user: null };
        }
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
      const response = await ApiService.post<{ token: string; user: any }>(
        '/auth/login',
        credentials
      );

      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Login failed');
      }

      const { token, user: rawUser } = response.data;

      // Validate token structure before storing
      if (!isTokenValid(token)) {
        return rejectWithValue('Server returned an invalid or expired token');
      }

      const user = normalizeUser(rawUser);

      await Promise.all([
        tokenStorage.setToken(token),
        tokenStorage.setUser(JSON.stringify(user)),
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
      fullName: string;
      phone?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await ApiService.post<{ token: string; user: any }>(
        '/auth/register',
        userData
      );

      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Registration failed');
      }

      const { token, user: rawUser } = response.data;

      if (!isTokenValid(token)) {
        return rejectWithValue('Server returned an invalid or expired token');
      }

      const user = normalizeUser(rawUser);

      await Promise.all([
        tokenStorage.setToken(token),
        tokenStorage.setUser(JSON.stringify(user)),
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
  async () => {
    try {
      await ApiService.post('/auth/logout', {});
    } catch {
      // Even if API call fails, continue clearing local storage
    }

    await tokenStorage.clearAll();
    return null;
  }
);

/**
 * Request a password reset email.
 * Always resolves successfully to prevent email enumeration.
 */
export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async (email: string) => {
    try {
      await ApiService.post('/auth/request-reset', { email });
    } catch {
      // Swallow errors — show success regardless to prevent enumeration
    }
    return true;
  }
);

/**
 * Update user profile via the self-service /auth/profile endpoint.
 */
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (
    updates: { fullName?: string; email?: string; phone?: string },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { auth: AuthState };
      const currentUser = state.auth.user;

      if (!currentUser) {
        return rejectWithValue('User not authenticated');
      }

      const response = await ApiService.put<{ success: boolean; message?: string }>(
        '/auth/profile',
        updates
      );

      if (!response.success) {
        return rejectWithValue(response.error || 'Update failed');
      }

      const updatedUser: User = {
        ...currentUser,
        ...(updates.fullName !== undefined && { fullName: updates.fullName }),
        ...(updates.email !== undefined && { email: updates.email }),
        ...(updates.phone !== undefined && { phone: updates.phone }),
      };

      await tokenStorage.setUser(JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Update failed');
    }
  }
);

/**
 * Change password.
 */
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (
    passwords: { currentPassword: string; newPassword: string },
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
 * Refresh user data from server via the self-service /auth/profile endpoint.
 */
export const refreshUser = createAsyncThunk(
  'auth/refreshUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ApiService.get<any>('/auth/profile');

      if (!response.success || !response.data?.user) {
        return rejectWithValue(response.error || 'Refresh failed');
      }

      const user = normalizeUser(response.data.user);

      await tokenStorage.setUser(JSON.stringify(user));

      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Refresh failed');
    }
  }
);

// ── Slice ──────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    forceLogout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.isInitialized = true;
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
      .addCase(logout.fulfilled, () => ({
        ...initialState,
        isInitialized: true,
      }))
      .addCase(logout.rejected, () => ({
        ...initialState,
        isInitialized: true,
      }));

    // Request password reset (no state changes needed — always succeeds)
    builder
      .addCase(requestPasswordReset.pending, () => {})
      .addCase(requestPasswordReset.fulfilled, () => {})
      .addCase(requestPasswordReset.rejected, () => {});

    // Update profile — fully screen-local; no global isLoading or error
    builder
      .addCase(updateProfile.pending, () => {})
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, () => {});

    // Change password — fully screen-local; no global isLoading or error
    builder
      .addCase(changePassword.pending, () => {})
      .addCase(changePassword.fulfilled, () => {})
      .addCase(changePassword.rejected, () => {});

    // Refresh user — silent background operation, no global isLoading or error
    builder
      .addCase(refreshUser.pending, () => {})
      .addCase(refreshUser.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(refreshUser.rejected, () => {});
  },
});

// Export actions
export const { clearError, setUser, forceLogout } = authSlice.actions;

// Export reducer
export default authSlice.reducer;

// Selectors
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectIsInitialized = (state: { auth: AuthState }) => state.auth.isInitialized;
