import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../../theme/theme';

export type AuthMode = 'login' | 'register';

export interface LoginFormProps {
  mode: AuthMode;
  username: string;
  password: string;
  email: string;
  fullName: string;
  phone: string;
  isLoading: boolean;
  isSubmitting: boolean;
  onChangeUsername: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangeFullName: (value: string) => void;
  onChangePhone: (value: string) => void;
  onSubmit: () => void;
  onToggleMode: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  mode,
  username,
  password,
  email,
  fullName,
  phone,
  isLoading,
  isSubmitting,
  onChangeUsername,
  onChangePassword,
  onChangeEmail,
  onChangeFullName,
  onChangePhone,
  onSubmit,
  onToggleMode,
}) => {
  const passwordRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const fullNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  const disabled = isSubmitting || isLoading;

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>
        {mode === 'login' ? 'Login to Your Account' : 'Create New Account'}
      </Text>

      {/* Username */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={onChangeUsername}
          placeholder="Enter username"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={50}
          returnKeyType="next"
          onSubmitEditing={() => {
            if (mode === 'register') {
              fullNameRef.current?.focus();
            } else {
              passwordRef.current?.focus();
            }
          }}
        />
      </View>

      {/* Registration-only fields */}
      {mode === 'register' && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              ref={fullNameRef}
              style={styles.input}
              value={fullName}
              onChangeText={onChangeFullName}
              placeholder="Enter full name"
              autoCapitalize="words"
              maxLength={100}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              ref={emailRef}
              style={styles.input}
              value={email}
              onChangeText={onChangeEmail}
              placeholder="Enter email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={254}
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              ref={phoneRef}
              style={styles.input}
              value={phone}
              onChangeText={onChangePhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              maxLength={20}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>
        </>
      )}

      {/* Password */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          ref={passwordRef}
          style={styles.input}
          value={password}
          onChangeText={onChangePassword}
          placeholder="Enter password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={128}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={disabled}
      >
        {isLoading ? (
          <ActivityIndicator color={theme.colors.surface} />
        ) : (
          <Text style={styles.buttonText}>
            {mode === 'login' ? 'Login' : 'Register'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Mode toggle */}
      <TouchableOpacity
        style={styles.switchModeButton}
        onPress={onToggleMode}
        disabled={isLoading}
      >
        <Text style={styles.switchModeText}>
          {mode === 'login'
            ? "Don't have an account? Register"
            : 'Already have an account? Login'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  form: {
    backgroundColor: theme.colors.surface,
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
    borderColor: theme.colors.borderDark,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.colors.surface,
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
    color: theme.colors.surface,
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
});
