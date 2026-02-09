/**
 * Auth Slice Unit Tests
 */

import authReducer, {
  clearError,
  setUser,
  initializeAuth,
  login,
  logout,
  register,
  updateProfile,
  changePassword,
  refreshUser,
  selectUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  selectIsInitialized,
} from '../../store/slices/authSlice';

// Mock ApiService
jest.mock('../../services/ApiService', () => ({
  ApiService: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

import { ApiService } from '../../services/ApiService';

describe('authSlice', () => {
  const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    isInitialized: false,
  };

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'manager' as const,
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reducers', () => {
    it('should return initial state', () => {
      expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('should handle clearError', () => {
      const stateWithError = { ...initialState, error: 'Some error' };
      const newState = authReducer(stateWithError, clearError());
      expect(newState.error).toBeNull();
    });

    it('should handle setUser', () => {
      const newState = authReducer(initialState, setUser(mockUser));
      expect(newState.user).toEqual(mockUser);
    });
  });

  describe('initializeAuth', () => {
    it('should set loading true when pending', () => {
      const action = { type: initializeAuth.pending.type };
      const state = authReducer(initialState, action);
      expect(state.isLoading).toBe(true);
    });

    it('should set user and token when fulfilled with data', () => {
      const action = {
        type: initializeAuth.fulfilled.type,
        payload: { token: mockToken, user: mockUser },
      };
      const state = authReducer(initialState, action);

      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(true);
      expect(state.token).toBe(mockToken);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should set initialized without user when no stored data', () => {
      const action = {
        type: initializeAuth.fulfilled.type,
        payload: { token: null, user: null },
      };
      const state = authReducer(initialState, action);

      expect(state.isInitialized).toBe(true);
      expect(state.isAuthenticated).toBe(false);
    });

    it('should set error when rejected', () => {
      const action = {
        type: initializeAuth.rejected.type,
        payload: 'Initialization error',
      };
      const state = authReducer(initialState, action);

      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(true);
      expect(state.error).toBe('Initialization error');
    });
  });

  describe('login', () => {
    it('should set loading true and clear error when pending', () => {
      const stateWithError = { ...initialState, error: 'Previous error' };
      const action = { type: login.pending.type };
      const state = authReducer(stateWithError, action);

      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set authenticated state when fulfilled', () => {
      const action = {
        type: login.fulfilled.type,
        payload: { token: mockToken, user: mockUser },
      };
      const state = authReducer(initialState, action);

      expect(state.isLoading).toBe(false);
      expect(state.token).toBe(mockToken);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set error when rejected', () => {
      const action = {
        type: login.rejected.type,
        payload: 'Invalid credentials',
      };
      const state = authReducer(initialState, action);

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should set loading true when pending', () => {
      const action = { type: register.pending.type };
      const state = authReducer(initialState, action);

      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set authenticated state when fulfilled', () => {
      const action = {
        type: register.fulfilled.type,
        payload: { token: mockToken, user: mockUser },
      };
      const state = authReducer(initialState, action);

      expect(state.isLoading).toBe(false);
      expect(state.token).toBe(mockToken);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should set error when rejected', () => {
      const action = {
        type: register.rejected.type,
        payload: 'Username already exists',
      };
      const state = authReducer(initialState, action);

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Username already exists');
    });
  });

  describe('logout', () => {
    const authenticatedState = {
      ...initialState,
      user: mockUser,
      token: mockToken,
      isAuthenticated: true,
      isInitialized: true,
    };

    it('should set loading true when pending', () => {
      const action = { type: logout.pending.type };
      const state = authReducer(authenticatedState, action);
      expect(state.isLoading).toBe(true);
    });

    it('should reset state when fulfilled', () => {
      const action = { type: logout.fulfilled.type };
      const state = authReducer(authenticatedState, action);

      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isInitialized).toBe(true);
    });

    it('should reset state even when rejected', () => {
      const action = { type: logout.rejected.type };
      const state = authReducer(authenticatedState, action);

      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('updateProfile', () => {
    const authenticatedState = {
      ...initialState,
      user: mockUser,
      token: mockToken,
      isAuthenticated: true,
    };

    it('should update user when fulfilled', () => {
      const updatedUser = { ...mockUser, full_name: 'Updated Name' };
      const action = {
        type: updateProfile.fulfilled.type,
        payload: updatedUser,
      };
      const state = authReducer(authenticatedState, action);

      expect(state.user?.full_name).toBe('Updated Name');
      expect(state.isLoading).toBe(false);
    });

    it('should set error when rejected', () => {
      const action = {
        type: updateProfile.rejected.type,
        payload: 'Update failed',
      };
      const state = authReducer(authenticatedState, action);

      expect(state.error).toBe('Update failed');
    });
  });

  describe('changePassword', () => {
    it('should clear error when fulfilled', () => {
      const stateWithError = { ...initialState, error: 'Previous error' };
      const action = { type: changePassword.fulfilled.type };
      const state = authReducer(stateWithError, action);

      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error when rejected', () => {
      const action = {
        type: changePassword.rejected.type,
        payload: 'Wrong current password',
      };
      const state = authReducer(initialState, action);

      expect(state.error).toBe('Wrong current password');
    });
  });

  describe('refreshUser', () => {
    const authenticatedState = {
      ...initialState,
      user: mockUser,
      token: mockToken,
      isAuthenticated: true,
    };

    it('should update user when fulfilled', () => {
      const refreshedUser = { ...mockUser, email: 'new@example.com' };
      const action = {
        type: refreshUser.fulfilled.type,
        payload: refreshedUser,
      };
      const state = authReducer(authenticatedState, action);

      expect(state.user?.email).toBe('new@example.com');
    });

    it('should set error when rejected', () => {
      const action = {
        type: refreshUser.rejected.type,
        payload: 'Refresh failed',
      };
      const state = authReducer(authenticatedState, action);

      expect(state.error).toBe('Refresh failed');
    });
  });

  describe('selectors', () => {
    const state = {
      auth: {
        user: mockUser,
        token: mockToken,
        isAuthenticated: true,
        isLoading: true,
        error: 'Some error',
        isInitialized: true,
      },
    };

    it('should select user', () => {
      expect(selectUser(state)).toEqual(mockUser);
    });

    it('should select isAuthenticated', () => {
      expect(selectIsAuthenticated(state)).toBe(true);
    });

    it('should select loading state', () => {
      expect(selectAuthLoading(state)).toBe(true);
    });

    it('should select error', () => {
      expect(selectAuthError(state)).toBe('Some error');
    });

    it('should select isInitialized', () => {
      expect(selectIsInitialized(state)).toBe(true);
    });
  });
});
