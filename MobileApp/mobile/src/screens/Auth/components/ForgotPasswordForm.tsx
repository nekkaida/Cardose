import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../../theme/theme';
import { useAppDispatch } from '../../../store/hooks';
import { requestPasswordReset } from '../../../store/slices/authSlice';
import {
  validateForgotPasswordFields,
  isValid,
  type FieldErrors,
} from '../helpers/validation';

export interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onBackToLogin,
}) => {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const fieldErrors = validateForgotPasswordFields({ email });
    setErrors(fieldErrors);
    if (!isValid(fieldErrors)) return;

    setIsSubmitting(true);
    try {
      await dispatch(requestPasswordReset(email.trim())).unwrap();
    } catch {
      // Always show success to prevent email enumeration
    } finally {
      setSubmitted(true);
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.form} testID="forgot-password-success">
        <Text style={styles.formTitle} accessibilityRole="header">
          Check Your Email
        </Text>
        <Text
          style={styles.description}
          accessibilityRole="alert"
          accessibilityLabel={`If an account exists for ${email.trim()}, password reset instructions have been sent`}
        >
          If an account exists for {email.trim()}, we've sent password reset
          instructions. Please check your inbox and spam folder.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={onBackToLogin}
          accessibilityRole="button"
          accessibilityLabel="Return to login screen"
          testID="button-back-to-login-success"
        >
          <Text style={styles.buttonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.form} testID="forgot-password-form">
      <Text style={styles.formTitle} accessibilityRole="header">
        Reset Password
      </Text>
      <Text style={styles.description}>
        Enter the email associated with your account and we'll send you a link
        to reset your password.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={[styles.input, errors.email ? styles.inputError : null]}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (errors.email) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next.email;
                return next;
              });
            }
          }}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={254}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          accessibilityLabel="Email address"
          accessibilityHint="Enter the email address linked to your account"
          testID="input-forgot-email"
        />
        {errors.email ? (
          <Text style={styles.errorText} accessibilityRole="alert" testID="error-forgot-email">
            {errors.email}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityLabel="Send password reset email"
        accessibilityState={{ disabled: isSubmitting }}
        testID="button-send-reset"
      >
        {isSubmitting ? (
          <ActivityIndicator color={theme.colors.surface} />
        ) : (
          <Text style={styles.buttonText}>Send Reset Link</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.switchModeButton}
        onPress={onBackToLogin}
        accessibilityRole="button"
        accessibilityLabel="Go back to login"
        testID="button-back-to-login"
      >
        <Text style={styles.switchModeText}>Back to Login</Text>
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
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
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
