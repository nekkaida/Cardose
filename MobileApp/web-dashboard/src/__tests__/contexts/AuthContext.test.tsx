/**
 * AuthContext Unit Tests
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test component that uses the auth context
const TestComponent: React.FC = () => {
  const { user, isAuthenticated, loading, login, logout, token } = useAuth();

  const handleLogin = async () => {
    await login('testuser', 'testpass');
  };

  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="user">{user ? user.username : 'null'}</div>
      <div data-testid="token">{token || 'null'}</div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    delete axios.defaults.headers.common['Authorization'];
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
      expect(screen.getByTestId('token').textContent).toBe('null');
    });

    it('should restore user from localStorage', async () => {
      const savedUser = { id: '1', username: 'saveduser', email: 'saved@test.com', role: 'admin' };
      const savedToken = 'saved-token';

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'auth_token') return savedToken;
        if (key === 'auth_user') return JSON.stringify(savedUser);
        return null;
      });

      // Mock the token verification API call
      mockedAxios.get.mockResolvedValueOnce({ data: { valid: true } });

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
      expect(screen.getByTestId('token').textContent).toBe('saved-token');
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
      expect(screen.getByTestId('token').textContent).toBe('test-token');
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

      // Mock the token verification API call
      mockedAxios.get.mockResolvedValueOnce({ data: { valid: true } });

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
      expect(screen.getByTestId('token').textContent).toBe('null');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user');
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleError.mockRestore();
    });
  });
});
