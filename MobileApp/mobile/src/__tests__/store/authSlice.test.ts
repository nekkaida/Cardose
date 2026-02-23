/**
 * Auth Slice Unit Tests
 *
 * Tests reducers, selectors, and exported utility functions
 * (normalizeUser, decodeJwtPayload, isTokenValid).
 */

import authReducer, {
  clearError,
  setUser,
  forceLogout,
  initializeAuth,
  login,
  logout,
  register,
  updateProfile,
  changePassword,
  refreshUser,
  requestPasswordReset,
  selectUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  selectIsInitialized,
  decodeJwtPayload,
  isTokenValid,
  normalizeUser,
} from '../../store/slices/authSlice';

// Mock ApiService
jest.mock('../../services/ApiService', () => ({
  ApiService: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
  },
}));

// Mock tokenStorage
jest.mock('../../utils/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  removeToken: jest.fn(),
  getUser: jest.fn(),
  setUser: jest.fn(),
  removeUser: jest.fn(),
  clearAll: jest.fn(),
}));

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
    fullName: 'Test User',
    role: 'manager' as const,
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Reducer tests ───────────────────────────────────────────────────

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

    it('should handle forceLogout', () => {
      const authenticatedState = {
        ...initialState,
        user: mockUser,
        token: mockToken,
        isAuthenticated: true,
        isInitialized: true,
      };
      const newState = authReducer(authenticatedState, forceLogout());
      expect(newState.user).toBeNull();
      expect(newState.token).toBeNull();
      expect(newState.isAuthenticated).toBe(false);
      expect(newState.isInitialized).toBe(true);
    });
  });

  // ── Thunk reducer transition tests ──────────────────────────────────

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

  describe('requestPasswordReset', () => {
    it('should not mutate state on pending', () => {
      const action = { type: requestPasswordReset.pending.type };
      const state = authReducer(initialState, action);
      expect(state).toEqual(initialState);
    });

    it('should not mutate state on fulfilled', () => {
      const action = { type: requestPasswordReset.fulfilled.type };
      const state = authReducer(initialState, action);
      expect(state).toEqual(initialState);
    });
  });

  describe('updateProfile', () => {
    const authenticatedState = {
      ...initialState,
      user: mockUser,
      token: mockToken,
      isAuthenticated: true,
    };

    it('should not toggle global isLoading (screen manages its own)', () => {
      const pendingState = authReducer(authenticatedState, {
        type: updateProfile.pending.type,
      });
      expect(pendingState.isLoading).toBe(false);
    });

    it('should update user when fulfilled', () => {
      const updatedUser = { ...mockUser, fullName: 'Updated Name' };
      const action = {
        type: updateProfile.fulfilled.type,
        payload: updatedUser,
      };
      const state = authReducer(authenticatedState, action);

      expect(state.user?.fullName).toBe('Updated Name');
    });

    it('should not set global error when rejected (screen-local handling)', () => {
      const action = {
        type: updateProfile.rejected.type,
        payload: 'Update failed',
      };
      const state = authReducer(authenticatedState, action);

      expect(state.error).toBeNull();
    });
  });

  describe('changePassword', () => {
    it('should not toggle global isLoading or error (screen-local handling)', () => {
      const pendingState = authReducer(initialState, {
        type: changePassword.pending.type,
      });
      expect(pendingState.isLoading).toBe(false);

      const rejectedState = authReducer(initialState, {
        type: changePassword.rejected.type,
        payload: 'Wrong password',
      });
      expect(rejectedState.isLoading).toBe(false);
      expect(rejectedState.error).toBeNull();
    });

    it('should not mutate state when fulfilled', () => {
      const stateWithError = { ...initialState, error: 'Previous error' };
      const action = { type: changePassword.fulfilled.type };
      const state = authReducer(stateWithError, action);

      // changePassword is fully screen-local — the pre-existing error is untouched
      expect(state.error).toBe('Previous error');
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

    it('should not set error when rejected (silent background op)', () => {
      const action = {
        type: refreshUser.rejected.type,
        payload: 'Refresh failed',
      };
      const state = authReducer(authenticatedState, action);

      // refreshUser is a silent background operation — no error surfaced to UI
      expect(state.error).toBeNull();
    });
  });

  // ── Selector tests ──────────────────────────────────────────────────

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

  // ── Utility function tests ──────────────────────────────────────────

  describe('decodeJwtPayload', () => {
    it('decodes a valid JWT payload', () => {
      // { "sub": "1234567890", "name": "John Doe", "exp": 9999999999 }
      const token =
        'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjo5OTk5OTk5OTk5fQ.signature';
      const payload = decodeJwtPayload(token);
      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe('1234567890');
      expect(payload?.name).toBe('John Doe');
      expect(payload?.exp).toBe(9999999999);
    });

    it('returns null for malformed token (wrong segment count)', () => {
      expect(decodeJwtPayload('not.a.valid.jwt.token')).toBeNull();
      expect(decodeJwtPayload('single')).toBeNull();
    });

    it('returns null for corrupted base64 payload', () => {
      expect(decodeJwtPayload('header.!!!invalid!!!.sig')).toBeNull();
    });
  });

  describe('isTokenValid', () => {
    it('returns true for token with future expiry', () => {
      // exp far in the future
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // +1 hour
      const payload = JSON.stringify({ exp: futureExp });
      const base64 = Buffer.from(payload).toString('base64url');
      const token = `header.${base64}.signature`;
      expect(isTokenValid(token)).toBe(true);
    });

    it('returns false for expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // -1 hour
      const payload = JSON.stringify({ exp: pastExp });
      const base64 = Buffer.from(payload).toString('base64url');
      const token = `header.${base64}.signature`;
      expect(isTokenValid(token)).toBe(false);
    });

    it('returns false for token expiring within 60s buffer', () => {
      const nearExp = Math.floor(Date.now() / 1000) + 30; // +30s (within 60s buffer)
      const payload = JSON.stringify({ exp: nearExp });
      const base64 = Buffer.from(payload).toString('base64url');
      const token = `header.${base64}.signature`;
      expect(isTokenValid(token)).toBe(false);
    });

    it('returns false for token without exp claim', () => {
      const payload = JSON.stringify({ sub: '123' });
      const base64 = Buffer.from(payload).toString('base64url');
      const token = `header.${base64}.signature`;
      expect(isTokenValid(token)).toBe(false);
    });

    it('returns false for malformed token', () => {
      expect(isTokenValid('garbage')).toBe(false);
    });
  });

  describe('normalizeUser', () => {
    it('normalizes camelCase backend response', () => {
      const user = normalizeUser({
        id: '1',
        username: 'test',
        email: 'test@test.com',
        fullName: 'Test User',
        role: 'manager',
        avatarUrl: 'http://img.com/a.png',
        createdAt: '2024-01-01',
      });
      expect(user.fullName).toBe('Test User');
      expect(user.avatarUrl).toBe('http://img.com/a.png');
      expect(user.createdAt).toBe('2024-01-01');
    });

    it('normalizes snake_case backend response', () => {
      const user = normalizeUser({
        id: '1',
        username: 'test',
        email: 'test@test.com',
        full_name: 'Snake User',
        role: 'owner',
        avatar_url: 'http://img.com/b.png',
        created_at: '2024-06-01',
      });
      expect(user.fullName).toBe('Snake User');
      expect(user.avatarUrl).toBe('http://img.com/b.png');
      expect(user.createdAt).toBe('2024-06-01');
    });

    it('defaults unknown role to employee', () => {
      const user = normalizeUser({
        id: '1',
        username: 'test',
        email: 'test@test.com',
        fullName: 'Test',
        role: 'superadmin',
      });
      expect(user.role).toBe('employee');
    });

    it('accepts valid roles', () => {
      for (const role of ['owner', 'manager', 'employee']) {
        const user = normalizeUser({
          id: '1',
          username: 'test',
          email: 'test@test.com',
          fullName: 'Test',
          role,
        });
        expect(user.role).toBe(role);
      }
    });

    it('throws for null input', () => {
      expect(() => normalizeUser(null)).toThrow('Invalid user data');
    });

    it('throws for missing id', () => {
      expect(() => normalizeUser({ username: 'test' })).toThrow('Invalid user data');
    });

    it('handles missing optional fields', () => {
      const user = normalizeUser({
        id: '1',
        username: 'test',
        email: 'test@test.com',
        role: 'employee',
      });
      expect(user.fullName).toBe('');
      expect(user.avatarUrl).toBeUndefined();
      expect(user.phone).toBeUndefined();
      expect(user.createdAt).toBe('');
    });
  });
});
