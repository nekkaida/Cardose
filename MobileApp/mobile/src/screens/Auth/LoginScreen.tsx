import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { theme } from '../../theme/theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  login,
  register,
  selectAuthLoading,
  clearError,
} from '../../store/slices/authSlice';
import { ApiService } from '../../services/ApiService';
import { API_CONFIG } from '../../config';
import { BrandHeader, LoginForm, ServerConfig, ForgotPasswordForm } from './components';
import type { AuthMode, ServerStatus } from './components';
import {
  validateLoginFields,
  validateRegisterFields,
  isValid,
  type FieldErrors,
} from './helpers/validation';

type ScreenMode = AuthMode | 'forgotPassword';

// ── Rate limiting ──────────────────────────────────────────────────────
const MAX_ATTEMPTS = 5;
const BASE_LOCKOUT_MS = 30_000; // 30 seconds

export const LoginScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectAuthLoading);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<ScreenMode>('login');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Registration fields
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Server settings
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(ApiService.getBaseUrl());
  const [serverStatus, setServerStatus] = useState<ServerStatus>('unknown');

  // Rate limiting state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setServerUrl(ApiService.getBaseUrl());
  }, []);

  // Countdown timer for lockout display
  useEffect(() => {
    if (lockoutUntil <= Date.now()) {
      setLockoutRemaining(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutRemaining(remaining);
      if (remaining <= 0 && lockoutTimerRef.current) {
        clearInterval(lockoutTimerRef.current);
        lockoutTimerRef.current = null;
      }
    };

    tick();
    lockoutTimerRef.current = setInterval(tick, 1000);
    return () => {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
    };
  }, [lockoutUntil]);

  const isLockedOut = lockoutRemaining > 0;

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // ── Server handlers ──────────────────────────────────────────────────

  const handleTestConnection = async () => {
    if (!serverUrl.trim()) return;
    setServerStatus('checking');
    try {
      await ApiService.setBaseUrl(serverUrl.trim());
      const reachable = await ApiService.ping();
      setServerStatus(reachable ? 'online' : 'offline');
    } catch {
      setServerStatus('offline');
    }
  };

  const handleResetServer = async () => {
    await ApiService.clearBaseUrl();
    setServerUrl(API_CONFIG.DEFAULT_BASE_URL);
    setServerStatus('unknown');
  };

  // ── Network check ─────────────────────────────────────────────────────

  const checkConnectivity = (): Promise<boolean> => ApiService.ping();

  // ── Auth handlers ────────────────────────────────────────────────────

  const handleLogin = async () => {
    if (isLoading || isLockedOut) return;

    const errors = validateLoginFields({ username, password });
    setFieldErrors(errors);
    if (!isValid(errors)) return;

    // Quick connectivity check
    const online = await checkConnectivity();
    if (!online) {
      setFieldErrors({ _form: 'Cannot reach the server. Check your connection and server settings.' });
      return;
    }

    try {
      await dispatch(login({ username, password })).unwrap();
      // Reset rate limiting on success
      setFailedAttempts(0);
      setLockoutUntil(0);
    } catch (error: any) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        const multiplier = Math.pow(2, Math.floor((newAttempts - MAX_ATTEMPTS) / MAX_ATTEMPTS));
        const lockoutMs = BASE_LOCKOUT_MS * multiplier;
        const lockoutSec = Math.ceil(lockoutMs / 1000);
        setLockoutUntil(Date.now() + lockoutMs);
        setFieldErrors({
          _form: `Too many failed attempts. Please wait ${lockoutSec} seconds before trying again.`,
        });
      } else {
        const message = typeof error === 'string' ? error : error?.message || 'Invalid credentials';
        setFieldErrors({ _form: message });
      }
    }
  };

  const handleRegister = async () => {
    if (isLoading) return;

    const errors = validateRegisterFields({ username, password, email, fullName, phone });
    setFieldErrors(errors);
    if (!isValid(errors)) return;

    // Quick connectivity check
    const online = await checkConnectivity();
    if (!online) {
      setFieldErrors({ _form: 'Cannot reach the server. Check your connection and server settings.' });
      return;
    }

    try {
      await dispatch(register({
        username,
        password,
        email,
        fullName,
        phone: phone || undefined,
      })).unwrap();
    } catch (error: any) {
      const message = typeof error === 'string' ? error : error?.message || 'Unable to register';
      setFieldErrors({ _form: message });
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    // Clear all fields on mode switch
    setPassword('');
    setEmail('');
    setFullName('');
    setPhone('');
    setFieldErrors({});
    setFailedAttempts(0);
    setLockoutUntil(0);
    dispatch(clearError());
  };

  const goToForgotPassword = () => {
    setFieldErrors({});
    setMode('forgotPassword');
  };

  const backToLogin = () => {
    setFieldErrors({});
    setMode('login');
  };

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        testID="login-scroll-view"
      >
        <View style={styles.content}>
          <BrandHeader />

          {mode === 'forgotPassword' ? (
            <ForgotPasswordForm onBackToLogin={backToLogin} />
          ) : (
            <LoginForm
              mode={mode}
              username={username}
              password={password}
              email={email}
              fullName={fullName}
              phone={phone}
              isLoading={isLoading}
              isLockedOut={isLockedOut}
              lockoutRemaining={lockoutRemaining}
              errors={fieldErrors}
              onChangeUsername={setUsername}
              onChangePassword={setPassword}
              onChangeEmail={setEmail}
              onChangeFullName={setFullName}
              onChangePhone={setPhone}
              onClearError={clearFieldError}
              onSubmit={mode === 'login' ? handleLogin : handleRegister}
              onToggleMode={toggleMode}
              onForgotPassword={goToForgotPassword}
            />
          )}

          <ServerConfig
            isVisible={showServerConfig}
            serverUrl={serverUrl}
            serverStatus={serverStatus}
            onToggleVisible={() => setShowServerConfig(!showServerConfig)}
            onChangeUrl={setServerUrl}
            onTestConnection={handleTestConnection}
            onReset={handleResetServer}
          />

          <View style={styles.footer}>
            <Text
              style={styles.footerText}
              accessibilityRole="text"
              testID="login-footer"
            >
              Self-hosted {'\u00B7'} Private
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
