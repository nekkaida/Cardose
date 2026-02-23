import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { theme } from '../../../theme/theme';

export type ServerStatus = 'unknown' | 'checking' | 'online' | 'offline';

export interface ServerConfigProps {
  isVisible: boolean;
  serverUrl: string;
  serverStatus: ServerStatus;
  onToggleVisible: () => void;
  onChangeUrl: (value: string) => void;
  onTestConnection: () => void;
  onReset: () => void;
}

/**
 * Returns true if the URL is safe to use (HTTPS in production, any in dev).
 * Shows an alert and returns false for unsafe URLs in production.
 */
function validateServerUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) {
    Alert.alert('Error', 'Please enter a server URL');
    return false;
  }

  const isDev = __DEV__;
  const isLocalhost =
    trimmed.includes('localhost') ||
    trimmed.includes('127.0.0.1') ||
    /192\.168\.\d+\.\d+/.test(trimmed) ||
    /10\.\d+\.\d+\.\d+/.test(trimmed);

  // In production, require HTTPS unless it's a local address
  if (!isDev && !isLocalhost && !trimmed.startsWith('https://')) {
    Alert.alert(
      'Insecure Connection',
      'Production servers must use HTTPS to protect your credentials. Please use an https:// URL.',
    );
    return false;
  }

  return true;
}

export const ServerConfig: React.FC<ServerConfigProps> = ({
  isVisible,
  serverUrl,
  serverStatus,
  onToggleVisible,
  onChangeUrl,
  onTestConnection,
  onReset,
}) => {
  const dotColor =
    serverStatus === 'online'
      ? theme.colors.success
      : serverStatus === 'offline'
        ? theme.colors.error
        : theme.colors.disabled;

  const handleTestConnection = () => {
    if (validateServerUrl(serverUrl)) {
      onTestConnection();
    }
  };

  // Only show in development builds
  if (!__DEV__) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.toggle}
        onPress={onToggleVisible}
        accessibilityRole="button"
        accessibilityLabel={
          isVisible ? 'Hide server settings' : 'Show server settings'
        }
        accessibilityState={{ expanded: isVisible }}
      >
        <Text style={styles.toggleText}>
          {isVisible ? 'Hide Server Settings' : 'Server Settings'}
        </Text>
        <View
          style={[styles.dot, { backgroundColor: dotColor }]}
          accessibilityLabel={`Server status: ${serverStatus}`}
        />
      </TouchableOpacity>

      {isVisible && (
        <View style={styles.config}>
          <Text style={styles.label}>Server URL</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={onChangeUrl}
            placeholder="http://192.168.1.100:3001"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            maxLength={200}
            accessibilityLabel="Server URL input"
            accessibilityHint="Enter the URL of your Cardose backend server"
            testID="input-server-url"
          />
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={handleTestConnection}
              disabled={serverStatus === 'checking'}
              accessibilityRole="button"
              accessibilityLabel="Test server connection"
              accessibilityState={{ disabled: serverStatus === 'checking', busy: serverStatus === 'checking' }}
              testID="button-test-connection"
            >
              {serverStatus === 'checking' ? (
                <ActivityIndicator size="small" color={theme.colors.surface} />
              ) : (
                <Text style={styles.buttonText}>Test Connection</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={onReset}
              accessibilityRole="button"
              accessibilityLabel="Reset server URL to default"
              testID="button-reset-server"
            >
              <Text style={[styles.buttonText, { color: theme.colors.textSecondary }]}>
                Reset
              </Text>
            </TouchableOpacity>
          </View>
          {serverStatus === 'online' && (
            <Text style={styles.online} accessibilityRole="alert">
              Connected to server
            </Text>
          )}
          {serverStatus === 'offline' && (
            <Text style={styles.offline} accessibilityRole="alert">
              Server unreachable
            </Text>
          )}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  toggle: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
  },
  toggleText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  config: {
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.borderDark,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.colors.surface,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  testButton: {
    backgroundColor: theme.colors.primary,
  },
  resetButton: {
    backgroundColor: theme.colors.backgroundVariant,
  },
  buttonText: {
    color: theme.colors.surface,
    fontSize: 13,
    fontWeight: '600',
  },
  online: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.success,
    textAlign: 'center',
  },
  offline: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.error,
    textAlign: 'center',
  },
});
