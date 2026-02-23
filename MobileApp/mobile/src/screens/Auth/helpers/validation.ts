/**
 * Auth Form Validation
 *
 * Returns per-field error maps instead of firing Alerts.
 * Uses the shared validators from utils/validators.ts as the single source of truth.
 */

import { isValidEmail, isValidPhoneNumber, isStrongPassword } from '../../../utils/validators';

export interface FieldErrors {
  [field: string]: string;
}

export interface LoginFields {
  username: string;
  password: string;
}

export interface RegisterFields extends LoginFields {
  email: string;
  fullName: string;
  phone: string;
}

export interface ForgotPasswordFields {
  email: string;
}

/**
 * Validate login fields and return per-field errors.
 * Returns an empty object when everything is valid.
 */
export function validateLoginFields({ username, password }: LoginFields): FieldErrors {
  const errors: FieldErrors = {};

  if (!username.trim()) {
    errors.username = 'Username is required';
  }
  if (!password) {
    errors.password = 'Password is required';
  }

  return errors;
}

/**
 * Validate registration fields and return per-field errors.
 */
export function validateRegisterFields({
  username,
  password,
  email,
  fullName,
  phone,
}: RegisterFields): FieldErrors {
  const errors: FieldErrors = {};

  if (!username.trim()) {
    errors.username = 'Username is required';
  } else if (username.trim().length < 3) {
    errors.username = 'Username must be at least 3 characters';
  } else if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
    errors.username = 'Username can only contain letters, numbers, _ and -';
  }

  if (!fullName.trim()) {
    errors.fullName = 'Full name is required';
  }

  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  // Phone is optional, but validate format when provided
  if (phone.trim() && !isValidPhoneNumber(phone.trim())) {
    errors.phone = 'Enter a valid phone number (e.g. 08xx or +62xx)';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (!isStrongPassword(password)) {
    errors.password = 'Min 8 chars with uppercase, lowercase, and a number';
  }

  return errors;
}

/**
 * Validate forgot-password fields.
 */
export function validateForgotPasswordFields({ email }: ForgotPasswordFields): FieldErrors {
  const errors: FieldErrors = {};

  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  return errors;
}

/**
 * Returns true when the error map has zero entries.
 */
export function isValid(errors: FieldErrors): boolean {
  return Object.keys(errors).length === 0;
}
