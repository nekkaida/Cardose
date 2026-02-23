import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import axios from 'axios';
import { z } from 'zod';
import { loginResponseSchema } from '../utils/apiValidation';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Warn if production is running over plain HTTP
if (
  import.meta.env.PROD &&
  API_BASE_URL.startsWith('http://') &&
  !API_BASE_URL.includes('localhost')
) {
  console.error(
    '[Security] API URL uses HTTP in production. HTTPS is required for secure operation.'
  );
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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

// Single source of truth for auth user shape (also used by loginResponseSchema in apiValidation)
const authUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.string(),
});

type User = z.infer<typeof authUserSchema>;

// Verify endpoint returns user data from JWT claims
const verifyResponseSchema = z.object({
  valid: z.literal(true),
  user: authUserSchema,
});

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
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
  const [loading, setLoading] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutRef = useRef<() => void>(() => {});

  // ── Server-side logout (best-effort, fire-and-forget) ──────────
  const revokeTokenOnServer = useCallback(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      apiClient
        .post(
          '/auth/logout',
          {},
          {
            headers: { Authorization: `Bearer ${savedToken}` },
          }
        )
        .catch(() => {
          // Best-effort: if the server is unreachable the token will
          // expire naturally. Client-side cleanup still happens below.
        });
    }
  }, []);

  // ── Idle timeout: auto-logout after inactivity ─────────────────
  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      logoutRef.current();
    }, IDLE_TIMEOUT_MS);
  }, []);

  const startIdleTracking = useCallback(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    const handler = () => resetIdleTimer();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetIdleTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdleTimer]);

  // ── Init: verify saved token on mount ──────────────────────────
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('auth_token');

      if (savedToken) {
        try {
          const response = await apiClient.get('/auth/verify', {
            headers: { Authorization: `Bearer ${savedToken}` },
          });

          // Use server-returned user data, NOT localStorage (prevents role tampering)
          const parsed = verifyResponseSchema.safeParse(response.data);
          if (parsed.success) {
            const serverUser: User = {
              id: parsed.data.user.id,
              username: parsed.data.user.username,
              email: parsed.data.user.email,
              role: parsed.data.user.role,
            };
            setUser(serverUser);
            // Sync localStorage with authoritative server data
            localStorage.setItem('auth_user', JSON.stringify(serverUser));
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

  // ── Login ──────────────────────────────────────────────────────
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await apiClient.post('/auth/login', { username, password });

      // Use Zod schema for strict validation of login response
      const parsed = loginResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        return false;
      }

      const { token: authToken, user: userData } = parsed.data;

      const validUser: User = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
      };

      setUser(validUser);
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('auth_user', JSON.stringify(validUser));
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

      return true;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Server responded with error (wrong credentials, etc.)
          return false;
        } else if (error.request) {
          throw new Error('Unable to connect to server. Please check your connection.');
        }
      }
      throw new Error('An unexpected error occurred.');
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────
  const logout = useCallback(() => {
    revokeTokenOnServer();
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    delete apiClient.defaults.headers.common['Authorization'];
    if (idleTimer.current) clearTimeout(idleTimer.current);
  }, [revokeTokenOnServer]);

  // Keep refs in sync
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  useEffect(() => {
    logoutFn = logout;
    return () => {
      logoutFn = null;
    };
  }, [logout]);

  // ── Start/stop idle tracking when auth state changes ───────────
  useEffect(() => {
    if (user) {
      const cleanup = startIdleTracking();
      return cleanup;
    }
  }, [user, startIdleTracking]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
