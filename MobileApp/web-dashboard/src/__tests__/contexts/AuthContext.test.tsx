/**
 * AuthContext Unit Tests
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

// Mock axios — provide a create() that returns an object with interceptors
vi.mock('axios', () => {
  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    defaults: { headers: { common: {} } },
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  };
  return {
    default: {
      create: vi.fn(() => instance),
      defaults: { headers: { common: {} } },
      get: vi.fn(),
      post: vi.fn(),
    },
    __esModule: true,
  };
});

// Get a reference to the mocked axios instance used by AuthContext
import { apiClient } from '../../contexts/AuthContext';
const mockedAxios = apiClient as any;

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test component that uses the auth context
const TestComponent: React.FC = () => {
  const { user, isAuthenticated, loading, login, logout } = useAuth();

  const handleLogin = async () => {
    try {
      await login('testuser', 'testpass');
    } catch {
      // Expected in error tests
    }
  };

  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="user">{user ? user.username : 'null'}</div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    delete axios.defaults.headers.common['Authorization'];
    // Default: any un-mocked post/get returns a resolved promise
    // (prevents TypeError when .catch() is called on undefined)
    mockedAxios.post.mockResolvedValue({});
  });

  describe('Initial State', () => {
    it('should have no user initially', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('null');
    });

    it('should restore user from localStorage', async () => {
      const savedUser = { id: '1', username: 'saveduser', email: 'saved@test.com', role: 'admin' };
      const savedToken = 'saved-token';

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'auth_token') return savedToken;
        if (key === 'auth_user') return JSON.stringify(savedUser);
        return null;
      });

      // Mock the token verification API call (must include user data for verifyResponseSchema)
      mockedAxios.get.mockResolvedValueOnce({
        data: { valid: true, user: savedUser },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('saveduser');
    });
  });

  describe('Login', () => {
    it('should login successfully', async () => {
      const mockUser = { id: '1', username: 'testuser', email: 'test@test.com', role: 'user' };
      const mockToken = 'test-token';

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          token: mockToken,
          user: mockUser,
        },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      const loginButton = screen.getByText('Login');
      await act(async () => {
        await userEvent.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      expect(screen.getByTestId('user').textContent).toBe('testuser');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', mockToken);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_user', JSON.stringify(mockUser));
    });

    it('should handle login failure', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: false,
        },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      const loginButton = screen.getByText('Login');
      await act(async () => {
        await userEvent.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('false');
      });

      expect(screen.getByTestId('user').textContent).toBe('null');
    });

    it('should handle login error', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      const loginButton = screen.getByText('Login');
      await act(async () => {
        await userEvent.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('false');
      });
    });
  });

  describe('Logout', () => {
    it('should logout successfully', async () => {
      const savedUser = { id: '1', username: 'saveduser', email: 'saved@test.com', role: 'admin' };
      const savedToken = 'saved-token';

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'auth_token') return savedToken;
        if (key === 'auth_user') return JSON.stringify(savedUser);
        return null;
      });

      // Mock the token verification API call (must include user data for verifyResponseSchema)
      mockedAxios.get.mockResolvedValueOnce({
        data: { valid: true, user: savedUser },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      const logoutButton = screen.getByText('Logout');
      await act(async () => {
        await userEvent.click(logoutButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('false');
      });

      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user');
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleError.mockRestore();
    });
  });

  describe('Token verification', () => {
    it('should clear localStorage when verify returns invalid Zod data', async () => {
      const savedToken = 'bad-token';
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'auth_token') return savedToken;
        if (key === 'auth_user')
          return JSON.stringify({ id: '1', username: 'user', email: 'e', role: 'r' });
        return null;
      });

      // Return data that fails verifyResponseSchema (missing user object)
      mockedAxios.get.mockResolvedValueOnce({ data: { valid: true } });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user');
    });

    it('should clear localStorage when verify request fails', async () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'auth_token') return 'expired-token';
        if (key === 'auth_user')
          return JSON.stringify({ id: '1', username: 'user', email: 'e', role: 'r' });
        return null;
      });

      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('Login validation', () => {
    it('should return false when login response fails Zod validation', async () => {
      // Response has success:true but missing token/user — fails loginResponseSchema
      mockedAxios.post.mockResolvedValueOnce({
        data: { success: true },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      const loginButton = screen.getByText('Login');
      await act(async () => {
        await userEvent.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('false');
      });
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  describe('Server-side logout', () => {
    it('should call POST /auth/logout when logging out', async () => {
      const savedUser = { id: '1', username: 'saveduser', email: 'saved@test.com', role: 'admin' };
      const savedToken = 'saved-token';

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'auth_token') return savedToken;
        if (key === 'auth_user') return JSON.stringify(savedUser);
        return null;
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: { valid: true, user: savedUser },
      });
      mockedAxios.post.mockResolvedValue({});

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      const logoutButton = screen.getByText('Logout');
      await act(async () => {
        await userEvent.click(logoutButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('false');
      });

      // Verify the server-side revocation was called
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/auth/logout',
        {},
        expect.objectContaining({
          headers: { Authorization: `Bearer ${savedToken}` },
        })
      );
    });
  });
});
