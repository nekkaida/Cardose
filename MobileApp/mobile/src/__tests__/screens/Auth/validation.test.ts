/**
 * Auth Validation Unit Tests
 *
 * Tests validateLoginFields, validateRegisterFields,
 * validateForgotPasswordFields, and isValid.
 */

import {
  validateLoginFields,
  validateRegisterFields,
  validateForgotPasswordFields,
  isValid,
} from '../../../screens/Auth/helpers/validation';

describe('validateLoginFields', () => {
  it('returns no errors for valid input', () => {
    const errors = validateLoginFields({ username: 'admin', password: 'secret' });
    expect(isValid(errors)).toBe(true);
  });

  it('requires username', () => {
    const errors = validateLoginFields({ username: '', password: 'secret' });
    expect(errors.username).toBeDefined();
  });

  it('treats whitespace-only username as empty', () => {
    const errors = validateLoginFields({ username: '   ', password: 'secret' });
    expect(errors.username).toBeDefined();
  });

  it('requires password', () => {
    const errors = validateLoginFields({ username: 'admin', password: '' });
    expect(errors.password).toBeDefined();
  });

  it('returns multiple errors when both fields are empty', () => {
    const errors = validateLoginFields({ username: '', password: '' });
    expect(errors.username).toBeDefined();
    expect(errors.password).toBeDefined();
  });
});

describe('validateRegisterFields', () => {
  const validFields = {
    username: 'testuser',
    password: 'Passw0rd',
    email: 'user@example.com',
    fullName: 'Test User',
    phone: '',
  };

  it('returns no errors for valid input', () => {
    expect(isValid(validateRegisterFields(validFields))).toBe(true);
  });

  it('requires username', () => {
    const errors = validateRegisterFields({ ...validFields, username: '' });
    expect(errors.username).toBeDefined();
  });

  it('enforces min 3 char username', () => {
    const errors = validateRegisterFields({ ...validFields, username: 'ab' });
    expect(errors.username).toContain('at least 3');
  });

  it('rejects special characters in username', () => {
    const errors = validateRegisterFields({ ...validFields, username: 'user@name' });
    expect(errors.username).toContain('letters, numbers');
  });

  it('allows underscores and dashes in username', () => {
    const errors = validateRegisterFields({ ...validFields, username: 'user_name-1' });
    expect(errors.username).toBeUndefined();
  });

  it('requires fullName', () => {
    const errors = validateRegisterFields({ ...validFields, fullName: '' });
    expect(errors.fullName).toBeDefined();
  });

  it('requires email', () => {
    const errors = validateRegisterFields({ ...validFields, email: '' });
    expect(errors.email).toBeDefined();
  });

  it('validates email format', () => {
    const errors = validateRegisterFields({ ...validFields, email: 'notanemail' });
    expect(errors.email).toContain('valid email');
  });

  it('accepts valid email', () => {
    const errors = validateRegisterFields({ ...validFields, email: 'user@example.com' });
    expect(errors.email).toBeUndefined();
  });

  it('allows empty phone (optional)', () => {
    const errors = validateRegisterFields({ ...validFields, phone: '' });
    expect(errors.phone).toBeUndefined();
  });

  it('validates phone format when provided', () => {
    const errors = validateRegisterFields({ ...validFields, phone: '12345' });
    expect(errors.phone).toBeDefined();
  });

  it('accepts valid Indonesian phone with +62', () => {
    const errors = validateRegisterFields({ ...validFields, phone: '+6281234567890' });
    expect(errors.phone).toBeUndefined();
  });

  it('accepts valid Indonesian phone with 08', () => {
    const errors = validateRegisterFields({ ...validFields, phone: '081234567890' });
    expect(errors.phone).toBeUndefined();
  });

  it('requires password', () => {
    const errors = validateRegisterFields({ ...validFields, password: '' });
    expect(errors.password).toBeDefined();
  });

  it('enforces password strength (needs uppercase, lowercase, number, 8+ chars)', () => {
    const errors = validateRegisterFields({ ...validFields, password: 'weak' });
    expect(errors.password).toBeDefined();
  });

  it('accepts strong password', () => {
    const errors = validateRegisterFields({ ...validFields, password: 'StrongPass1' });
    expect(errors.password).toBeUndefined();
  });
});

describe('validateForgotPasswordFields', () => {
  it('returns no errors for valid email', () => {
    expect(isValid(validateForgotPasswordFields({ email: 'user@example.com' }))).toBe(true);
  });

  it('requires email', () => {
    const errors = validateForgotPasswordFields({ email: '' });
    expect(errors.email).toBeDefined();
  });

  it('validates email format', () => {
    const errors = validateForgotPasswordFields({ email: 'bad' });
    expect(errors.email).toContain('valid email');
  });
});

describe('isValid', () => {
  it('returns true for empty object', () => {
    expect(isValid({})).toBe(true);
  });

  it('returns false when errors exist', () => {
    expect(isValid({ username: 'error' })).toBe(false);
  });
});
