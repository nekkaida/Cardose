import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { theme } from '../../theme/theme';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { login, register, selectAuthLoading, selectAuthError, clearError } from '../../store/slices/authSlice';
import { ApiService } from '../../services/ApiService';
import { API_CONFIG } from '../../config';

export const LoginScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectAuthLoading);
  const authError = useAppSelector(selectAuthError);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Registration fields
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Server settings
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(ApiService.getBaseUrl());
  const [serverStatus, setServerStatus] = useState<'unknown' | 'checking' | 'online' | 'offline'>('unknown');

  useEffect(() => {
    setServerUrl(ApiService.getBaseUrl());
  }, []);

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

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    try {
      await dispatch(login({ username, password })).unwrap();
    } catch (error: any) {
      Alert.alert('Login Failed', typeof error === 'string' ? error : error?.message || 'Invalid credentials');
    }
  };

  const handleRegister = async () => {
    if (!username || !password || !email || !fullName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
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
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setPassword('');
    dispatch(clearError());
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>🎁 Cardose</Text>
            <Text style={styles.subtitle}>Premium Gift Box Management</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>
              {mode === 'login' ? 'Login to Your Account' : 'Create New Account'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {mode === 'register' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter full name"
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email *</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={mode === 'login' ? handleLogin : handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === 'login' ? 'Login' : 'Register'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchModeButton}
              onPress={toggleMode}
              disabled={isLoading}
            >
              <Text style={styles.switchModeText}>
                {mode === 'login'
                  ? "Don't have an account? Register"
                  : 'Already have an account? Login'}
              </Text>
            </TouchableOpacity>

            {mode === 'login' && (
              <TouchableOpacity style={styles.forgotPasswordButton} disabled={isLoading}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Server Configuration */}
          <TouchableOpacity
            style={styles.serverToggle}
            onPress={() => setShowServerConfig(!showServerConfig)}
          >
            <Text style={styles.serverToggleText}>
              {showServerConfig ? 'Hide Server Settings' : 'Server Settings'}
            </Text>
            <View style={[
              styles.serverDot,
              { backgroundColor: serverStatus === 'online' ? '#10B981' : serverStatus === 'offline' ? '#EF4444' : '#9CA3AF' }
            ]} />
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.serverConfig}>
              <Text style={styles.serverLabel}>Server URL</Text>
              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://192.168.1.100:3001"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <View style={styles.serverActions}>
                <TouchableOpacity
                  style={[styles.serverButton, styles.serverTestButton]}
                  onPress={handleTestConnection}
                  disabled={serverStatus === 'checking'}
                >
                  {serverStatus === 'checking' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.serverButtonText}>Test Connection</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.serverButton, styles.serverResetButton]}
                  onPress={handleResetServer}
                >
                  <Text style={[styles.serverButtonText, { color: theme.colors.textSecondary }]}>Reset</Text>
                </TouchableOpacity>
              </View>
              {serverStatus === 'online' && (
                <Text style={styles.serverOnline}>Connected to server</Text>
              )}
              {serverStatus === 'offline' && (
                <Text style={styles.serverOffline}>Server unreachable</Text>
              )}
            </View>
          )}

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
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  form: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchModeButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchModeText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPasswordButton: {
    marginTop: 8,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  serverToggle: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  serverToggleText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  serverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  serverConfig: {
    marginTop: 12,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  serverLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  serverActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  serverButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  serverTestButton: {
    backgroundColor: theme.colors.primary,
  },
  serverResetButton: {
    backgroundColor: '#F3F4F6',
  },
  serverButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  serverOnline: {
    marginTop: 8,
    fontSize: 12,
    color: '#10B981',
    textAlign: 'center',
  },
  serverOffline: {
    marginTop: 8,
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
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
