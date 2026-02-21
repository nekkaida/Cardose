import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
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

  return (
    <>
      <TouchableOpacity style={styles.toggle} onPress={onToggleVisible}>
        <Text style={styles.toggleText}>
          {isVisible ? 'Hide Server Settings' : 'Server Settings'}
        </Text>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
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
          />
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={onTestConnection}
              disabled={serverStatus === 'checking'}
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
            >
              <Text style={[styles.buttonText, { color: theme.colors.textSecondary }]}>
                Reset
              </Text>
            </TouchableOpacity>
          </View>
          {serverStatus === 'online' && (
            <Text style={styles.online}>Connected to server</Text>
          )}
          {serverStatus === 'offline' && (
            <Text style={styles.offline}>Server unreachable</Text>
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
