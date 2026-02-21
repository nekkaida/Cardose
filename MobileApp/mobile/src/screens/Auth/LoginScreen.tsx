import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { theme } from '../../theme/theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { login, register, selectAuthLoading, clearError } from '../../store/slices/authSlice';
import { ApiService } from '../../services/ApiService';
import { API_CONFIG } from '../../config';
import { BrandHeader, LoginForm, ServerConfig } from './components';
import type { AuthMode, ServerStatus } from './components';
import { validateLoginFields, validateRegisterFields } from './helpers/validation';

export const LoginScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectAuthLoading);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('login');

  // Registration fields
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Server settings
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(ApiService.getBaseUrl());
  const [serverStatus, setServerStatus] = useState<ServerStatus>('unknown');

  useEffect(() => {
    setServerUrl(ApiService.getBaseUrl());
  }, []);

  // ── Server handlers ──────────────────────────────────────────────────

  const handleTestConnection = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }
    setServerStatus('checking');
    try {
      await ApiService.setBaseUrl(serverUrl.trim());
      const reachable = await ApiService.ping();
      setServerStatus(reachable ? 'online' : 'offline');
      if (!reachable) {
        Alert.alert('Connection Failed', 'Could not reach the server. Check the URL and make sure the server is running.');
      }
    } catch {
      setServerStatus('offline');
      Alert.alert('Connection Failed', 'Could not reach the server.');
    }
  };

  const handleResetServer = async () => {
    await ApiService.clearBaseUrl();
    setServerUrl(API_CONFIG.DEFAULT_BASE_URL);
    setServerStatus('unknown');
  };

  // ── Auth handlers ────────────────────────────────────────────────────

  const handleLogin = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!validateLoginFields({ username, password })) {
      setIsSubmitting(false);
      return;
    }

    try {
      await dispatch(login({ username, password })).unwrap();
    } catch (error: any) {
      Alert.alert('Login Failed', typeof error === 'string' ? error : error?.message || 'Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!validateRegisterFields({ username, password, email, fullName, phone })) {
      setIsSubmitting(false);
      return;
    }

    try {
      await dispatch(register({
        username,
        password,
        email,
        full_name: fullName,
        phone: phone || undefined,
      })).unwrap();
      Alert.alert('Success', 'Registration successful!');
    } catch (error: any) {
      Alert.alert('Registration Failed', typeof error === 'string' ? error : error?.message || 'Unable to register');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setPassword('');
    dispatch(clearError());
  };

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <BrandHeader />

          <LoginForm
            mode={mode}
            username={username}
            password={password}
            email={email}
            fullName={fullName}
            phone={phone}
            isLoading={isLoading}
            isSubmitting={isSubmitting}
            onChangeUsername={setUsername}
            onChangePassword={setPassword}
            onChangeEmail={setEmail}
            onChangeFullName={setFullName}
            onChangePhone={setPhone}
            onSubmit={mode === 'login' ? handleLogin : handleRegister}
            onToggleMode={toggleMode}
          />

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
            <Text style={styles.footerText}>Self-hosted • Secure • Private</Text>
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
