import { Alert } from 'react-native';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export interface LoginFields {
  username: string;
  password: string;
}

export interface RegisterFields extends LoginFields {
  email: string;
  fullName: string;
  phone: string;
}

/**
 * Validates that username and password are non-empty.
 * Shows an alert and returns false when validation fails.
 */
export function validateLoginFields({ username, password }: LoginFields): boolean {
  if (!username || !password) {
    Alert.alert('Error', 'Please enter username and password');
    return false;
  }
  return true;
}

/**
 * Validates all registration fields including email format and password strength.
 * Shows an alert and returns false when validation fails.
 */
export function validateRegisterFields({
  username,
  password,
  email,
  fullName,
}: RegisterFields): boolean {
  if (!username || !password || !email || !fullName) {
    Alert.alert('Error', 'Please fill in all required fields');
    return false;
  }

  if (!EMAIL_REGEX.test(email)) {
    Alert.alert('Error', 'Please enter a valid email address');
    return false;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    Alert.alert('Error', 'Password must be at least 8 characters long');
    return false;
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    Alert.alert('Error', 'Password must contain uppercase, lowercase, and a number');
    return false;
  }

  return true;
}
