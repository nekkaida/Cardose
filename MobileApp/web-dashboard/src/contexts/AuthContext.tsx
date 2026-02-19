import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 seconds
});

// Module-level ref so the 401 interceptor can call logout without circular deps
let logoutFn: (() => void) | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login') &&
      !error.config?.url?.includes('/auth/verify')
    ) {
      logoutFn?.();
    }
    return Promise.reject(error);
  }
);

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('auth_token');
      const savedUser = localStorage.getItem('auth_user');

      if (savedToken && savedUser) {
        try {
          const response = await apiClient.get('/auth/verify', {
            headers: { Authorization: `Bearer ${savedToken}` }
          });

          if (response.data.valid) {
            const parsed = JSON.parse(savedUser);
            if (!parsed || !parsed.id || !parsed.username) {
              throw new Error('Invalid stored user data');
            }
            setToken(savedToken);
            setUser(parsed);
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
          } else {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
          }
        } catch {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await apiClient.post('/auth/login', {
        username,
        password
      });

      if (response.data.success) {
        const { token: authToken, user: userData } = response.data;

        if (!authToken || typeof authToken !== 'string' || !userData || !userData.id) {
          console.error('Login failed');
          return false;
        }

        setToken(authToken);
        setUser(userData);

        // Save to localStorage
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('auth_user', JSON.stringify(userData));

        // Set default authorization header
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Login failed');
      if (error.response) {
        // Server responded with error status
        return false;
      } else if (error.request) {
        // No response received (network error)
        throw new Error('Unable to connect to server. Please check your connection.');
      } else {
        throw new Error('An unexpected error occurred.');
      }
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);

    // Remove from localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');

    // Remove authorization header
    delete apiClient.defaults.headers.common['Authorization'];
  }, []);

  // Keep module-level ref in sync so the 401 interceptor can trigger logout
  useEffect(() => {
    logoutFn = logout;
    return () => { logoutFn = null; };
  }, [logout]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
