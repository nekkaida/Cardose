import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../../theme/theme';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import type { FieldErrors } from '../helpers/validation';

export type AuthMode = 'login' | 'register';

export interface LoginFormProps {
  mode: AuthMode;
  username: string;
  password: string;
  email: string;
  fullName: string;
  phone: string;
  isLoading: boolean;
  isLockedOut: boolean;
  lockoutRemaining: number;
  errors: FieldErrors;
  onChangeUsername: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangeFullName: (value: string) => void;
  onChangePhone: (value: string) => void;
  onClearError: (field: string) => void;
  onSubmit: () => void;
  onToggleMode: () => void;
  onForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  mode,
  username,
  password,
  email,
  fullName,
  phone,
  isLoading,
  isLockedOut,
  lockoutRemaining,
  errors,
  onChangeUsername,
  onChangePassword,
  onChangeEmail,
  onChangeFullName,
  onChangePhone,
  onClearError,
  onSubmit,
  onToggleMode,
  onForgotPassword,
}) => {
  const passwordRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const fullNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleChange = (field: string, setter: (v: string) => void) => (value: string) => {
    setter(value);
    if (errors[field]) {
      onClearError(field);
    }
  };

  const isSubmitDisabled = isLoading || isLockedOut;

  return (
    <View style={styles.form} testID="login-form">
      <Text style={styles.formTitle} accessibilityRole="header">
        {mode === 'login' ? 'Login to Your Account' : 'Create New Account'}
      </Text>

      {/* Server/general error banner */}
      {errors._form ? (
        <View style={styles.errorBanner} accessibilityRole="alert" testID="form-error-banner">
          <Text style={styles.errorBannerText}>{errors._form}</Text>
        </View>
      ) : null}

      {/* Lockout countdown banner */}
      {isLockedOut && !errors._form ? (
        <View style={styles.errorBanner} accessibilityRole="alert" testID="lockout-banner">
          <Text style={styles.errorBannerText}>
            Too many attempts. Try again in {lockoutRemaining}s.
          </Text>
        </View>
      ) : null}

      {/* Username */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Username *</Text>
        <TextInput
          style={[styles.input, errors.username ? styles.inputError : null]}
          value={username}
          onChangeText={handleChange('username', onChangeUsername)}
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
          accessibilityLabel="Username"
          accessibilityHint="Enter your username"
          accessibilityState={{ disabled: isSubmitDisabled }}
          editable={!isSubmitDisabled}
          testID="input-username"
        />
        {errors.username ? (
          <Text style={styles.errorText} accessibilityRole="alert" testID="error-username">
            {errors.username}
          </Text>
        ) : null}
      </View>

      {/* Registration-only fields */}
      {mode === 'register' && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              ref={fullNameRef}
              style={[styles.input, errors.fullName ? styles.inputError : null]}
              value={fullName}
              onChangeText={handleChange('fullName', onChangeFullName)}
              placeholder="Enter full name"
              autoCapitalize="words"
              maxLength={100}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              accessibilityLabel="Full name"
              accessibilityHint="Enter your full name"
              accessibilityState={{ disabled: isLoading }}
              editable={!isLoading}
              testID="input-fullname"
            />
            {errors.fullName ? (
              <Text style={styles.errorText} accessibilityRole="alert" testID="error-fullname">
                {errors.fullName}
              </Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              ref={emailRef}
              style={[styles.input, errors.email ? styles.inputError : null]}
              value={email}
              onChangeText={handleChange('email', onChangeEmail)}
              placeholder="Enter email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={254}
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              accessibilityLabel="Email address"
              accessibilityHint="Enter your email address"
              accessibilityState={{ disabled: isLoading }}
              editable={!isLoading}
              testID="input-email"
            />
            {errors.email ? (
              <Text style={styles.errorText} accessibilityRole="alert" testID="error-email">
                {errors.email}
              </Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              ref={phoneRef}
              style={[styles.input, errors.phone ? styles.inputError : null]}
              value={phone}
              onChangeText={handleChange('phone', onChangePhone)}
              placeholder="Enter phone number (optional)"
              keyboardType="phone-pad"
              maxLength={20}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              accessibilityLabel="Phone number"
              accessibilityHint="Optional phone number"
              accessibilityState={{ disabled: isLoading }}
              editable={!isLoading}
              testID="input-phone"
            />
            {errors.phone ? (
              <Text style={styles.errorText} accessibilityRole="alert" testID="error-phone">
                {errors.phone}
              </Text>
            ) : null}
          </View>
        </>
      )}

      {/* Password */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Password *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            ref={passwordRef}
            style={[
              styles.input,
              styles.passwordInput,
              errors.password ? styles.inputError : null,
            ]}
            value={password}
            onChangeText={handleChange('password', onChangePassword)}
            placeholder="Enter password"
            secureTextEntry={!passwordVisible}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={128}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            accessibilityLabel="Password"
            accessibilityHint={passwordVisible ? 'Password is visible' : 'Password is hidden'}
            accessibilityState={{ disabled: isSubmitDisabled }}
            editable={!isSubmitDisabled}
            testID="input-password"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setPasswordVisible(!passwordVisible)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            testID="toggle-password-visibility"
          >
            <Text style={styles.eyeIcon}>{passwordVisible ? '\u25C9' : '\u25CE'}</Text>
          </TouchableOpacity>
        </View>
        {errors.password ? (
          <Text style={styles.errorText} accessibilityRole="alert" testID="error-password">
            {errors.password}
          </Text>
        ) : null}

        {/* Password strength indicator for registration */}
        {mode === 'register' && <PasswordStrengthIndicator password={password} />}
      </View>

      {/* Forgot password link (login mode only) */}
      {mode === 'login' && (
        <TouchableOpacity
          style={styles.forgotPasswordButton}
          onPress={onForgotPassword}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Forgot your password? Tap to reset"
          testID="button-forgot-password"
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
      )}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.button, isSubmitDisabled && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={isSubmitDisabled}
        accessibilityRole="button"
        accessibilityLabel={mode === 'login' ? 'Log in' : 'Create account'}
        accessibilityState={{ disabled: isSubmitDisabled, busy: isLoading }}
        testID="button-submit"
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
        accessibilityRole="button"
        accessibilityLabel={
          mode === 'login'
            ? 'Switch to registration form'
            : 'Switch to login form'
        }
        testID="button-toggle-mode"
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
  errorBanner: {
    backgroundColor: theme.colors.errorLight,
    borderWidth: 1,
    borderColor: theme.colors.errorBorder,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: theme.colors.error,
    fontSize: 13,
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
  inputError: {
    borderColor: theme.colors.error,
    borderWidth: 1.5,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 20,
    color: theme.colors.textSecondary,
  },
  forgotPasswordButton: {
    alignItems: 'flex-end',
    marginBottom: 8,
    marginTop: -8,
    minHeight: 44,
    justifyContent: 'center',
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '500',
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
    minHeight: 44,
    justifyContent: 'center',
  },
  switchModeText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});
