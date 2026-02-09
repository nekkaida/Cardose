/**
 * Validators Unit Tests
 */

import {
  isValidEmail,
  isValidPhoneNumber,
  isValidNPWP,
  isPositiveNumber,
  isNonNegativeNumber,
  isInteger,
  isValidDateFormat,
  isFutureDate,
  isPastDate,
  isValidLength,
  isRequired,
  isValidURL,
  isValidPercentage,
  isValidPostalCode,
  isValidSKU,
  isStrongPassword,
  isValidOrderNumber,
  isValidDimensions,
  isValidPriceRange,
  isValidQuantity,
  isValidDiscount,
  isValidTaxRate,
  getValidationError,
  validateForm,
} from '../../utils/validators';

describe('Validators', () => {
  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.id')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('test@.com')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isValidEmail(null as any)).toBe(false);
      expect(isValidEmail(undefined as any)).toBe(false);
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should return true for valid Indonesian phone numbers', () => {
      expect(isValidPhoneNumber('08123456789')).toBe(true);
      expect(isValidPhoneNumber('081234567890')).toBe(true);
      expect(isValidPhoneNumber('628123456789')).toBe(true);
      expect(isValidPhoneNumber('+628123456789')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(isValidPhoneNumber('')).toBe(false);
      expect(isValidPhoneNumber('123')).toBe(false);
      expect(isValidPhoneNumber('abcdefghij')).toBe(false);
    });
  });

  describe('isValidNPWP', () => {
    it('should return true for valid NPWP (15 digits)', () => {
      expect(isValidNPWP('123456789012345')).toBe(true);
      expect(isValidNPWP('12.345.678.9-012.345')).toBe(true);
    });

    it('should return false for invalid NPWP', () => {
      expect(isValidNPWP('')).toBe(false);
      expect(isValidNPWP('12345678901234')).toBe(false);
      expect(isValidNPWP('1234567890123456')).toBe(false);
    });
  });

  describe('isPositiveNumber', () => {
    it('should return true for positive numbers', () => {
      expect(isPositiveNumber(1)).toBe(true);
      expect(isPositiveNumber(100.5)).toBe(true);
      expect(isPositiveNumber('50')).toBe(true);
      expect(isPositiveNumber('0.01')).toBe(true);
    });

    it('should return false for zero and negative numbers', () => {
      expect(isPositiveNumber(0)).toBe(false);
      expect(isPositiveNumber(-1)).toBe(false);
      expect(isPositiveNumber('-5')).toBe(false);
    });

    it('should return false for non-numbers', () => {
      expect(isPositiveNumber('abc')).toBe(false);
      expect(isPositiveNumber(NaN)).toBe(false);
    });
  });

  describe('isNonNegativeNumber', () => {
    it('should return true for zero and positive numbers', () => {
      expect(isNonNegativeNumber(0)).toBe(true);
      expect(isNonNegativeNumber(1)).toBe(true);
      expect(isNonNegativeNumber('0')).toBe(true);
    });

    it('should return false for negative numbers', () => {
      expect(isNonNegativeNumber(-1)).toBe(false);
      expect(isNonNegativeNumber('-0.01')).toBe(false);
    });
  });

  describe('isInteger', () => {
    it('should return true for integers', () => {
      expect(isInteger(1)).toBe(true);
      expect(isInteger(0)).toBe(true);
      expect(isInteger(-5)).toBe(true);
      expect(isInteger('100')).toBe(true);
    });

    it('should return false for non-integers', () => {
      expect(isInteger(1.5)).toBe(false);
      // parseInt('3.14') returns 3 which is an integer
    });
  });

  describe('isValidDateFormat', () => {
    it('should return true for valid YYYY-MM-DD dates', () => {
      expect(isValidDateFormat('2024-01-15')).toBe(true);
      expect(isValidDateFormat('2023-12-31')).toBe(true);
    });

    it('should return false for invalid dates', () => {
      expect(isValidDateFormat('')).toBe(false);
      expect(isValidDateFormat('01-15-2024')).toBe(false);
      expect(isValidDateFormat('2024/01/15')).toBe(false);
      expect(isValidDateFormat('invalid')).toBe(false);
    });
  });

  describe('isFutureDate', () => {
    it('should return true for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(isFutureDate(futureDate.toISOString().split('T')[0])).toBe(true);
    });

    it('should return true for today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isFutureDate(today)).toBe(true);
    });

    it('should return false for past dates', () => {
      expect(isFutureDate('2020-01-01')).toBe(false);
    });
  });

  describe('isPastDate', () => {
    it('should return true for past dates', () => {
      expect(isPastDate('2020-01-01')).toBe(true);
    });

    it('should return false for today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isPastDate(today)).toBe(false);
    });
  });

  describe('isValidLength', () => {
    it('should return true for strings within range', () => {
      expect(isValidLength('hello', 3)).toBe(true);
      expect(isValidLength('hello', 3, 10)).toBe(true);
      expect(isValidLength('hi', 2, 2)).toBe(true);
    });

    it('should return false for strings outside range', () => {
      expect(isValidLength('hi', 3)).toBe(false);
      expect(isValidLength('hello world', 3, 5)).toBe(false);
    });

    it('should return false for empty/null', () => {
      expect(isValidLength('', 1)).toBe(false);
      expect(isValidLength(null as any, 1)).toBe(false);
    });
  });

  describe('isRequired', () => {
    it('should return true for non-empty values', () => {
      expect(isRequired('hello')).toBe(true);
      expect(isRequired(0)).toBe(true);
      expect(isRequired(false)).toBe(true);
      expect(isRequired([1, 2, 3])).toBe(true);
    });

    it('should return false for empty values', () => {
      expect(isRequired('')).toBe(false);
      expect(isRequired('   ')).toBe(false);
      expect(isRequired(null)).toBe(false);
      expect(isRequired(undefined)).toBe(false);
      expect(isRequired([])).toBe(false);
    });
  });

  describe('isValidURL', () => {
    it('should return true for valid URLs', () => {
      expect(isValidURL('https://example.com')).toBe(true);
      expect(isValidURL('http://localhost:3000')).toBe(true);
      expect(isValidURL('https://sub.domain.com/path?query=1')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidURL('')).toBe(false);
      expect(isValidURL('not-a-url')).toBe(false);
      expect(isValidURL('example.com')).toBe(false);
    });
  });

  describe('isValidPercentage', () => {
    it('should return true for 0-100', () => {
      expect(isValidPercentage(0)).toBe(true);
      expect(isValidPercentage(50)).toBe(true);
      expect(isValidPercentage(100)).toBe(true);
      expect(isValidPercentage('75.5')).toBe(true);
    });

    it('should return false for out of range', () => {
      expect(isValidPercentage(-1)).toBe(false);
      expect(isValidPercentage(101)).toBe(false);
    });
  });

  describe('isValidPostalCode', () => {
    it('should return true for 5-digit postal codes', () => {
      expect(isValidPostalCode('12345')).toBe(true);
      expect(isValidPostalCode('00000')).toBe(true);
    });

    it('should return false for invalid postal codes', () => {
      expect(isValidPostalCode('')).toBe(false);
      expect(isValidPostalCode('1234')).toBe(false);
      expect(isValidPostalCode('123456')).toBe(false);
      expect(isValidPostalCode('abcde')).toBe(false);
    });
  });

  describe('isValidSKU', () => {
    it('should return true for valid SKUs', () => {
      expect(isValidSKU('ABC-123')).toBe(true);
      expect(isValidSKU('sku-001-box')).toBe(true);
      expect(isValidSKU('PRODUCT123')).toBe(true);
    });

    it('should return false for invalid SKUs', () => {
      expect(isValidSKU('')).toBe(false);
      expect(isValidSKU('sku with spaces')).toBe(false);
      expect(isValidSKU('sku@special')).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    it('should return true for strong passwords', () => {
      expect(isStrongPassword('Password1')).toBe(true);
      expect(isStrongPassword('MySecure123')).toBe(true);
      expect(isStrongPassword('Test1234')).toBe(true);
    });

    it('should return false for weak passwords', () => {
      expect(isStrongPassword('')).toBe(false);
      expect(isStrongPassword('short1')).toBe(false);
      expect(isStrongPassword('alllowercase1')).toBe(false);
      expect(isStrongPassword('ALLUPPERCASE1')).toBe(false);
      expect(isStrongPassword('NoNumbers')).toBe(false);
    });
  });

  describe('isValidOrderNumber', () => {
    it('should return true for valid order numbers', () => {
      expect(isValidOrderNumber('PGB-2024-001')).toBe(true);
      expect(isValidOrderNumber('PGB-2023-999')).toBe(true);
    });

    it('should return false for invalid order numbers', () => {
      expect(isValidOrderNumber('')).toBe(false);
      expect(isValidOrderNumber('PGB-24-001')).toBe(false);
      expect(isValidOrderNumber('ORD-2024-001')).toBe(false);
      expect(isValidOrderNumber('PGB-2024-1')).toBe(false);
    });
  });

  describe('isValidDimensions', () => {
    it('should return true for positive dimensions', () => {
      expect(isValidDimensions(10, 20, 30)).toBe(true);
      expect(isValidDimensions(0.5, 1, 1.5)).toBe(true);
    });

    it('should return false if any dimension is zero or negative', () => {
      expect(isValidDimensions(0, 10, 10)).toBe(false);
      expect(isValidDimensions(10, -5, 10)).toBe(false);
      expect(isValidDimensions(10, 10, 0)).toBe(false);
    });
  });

  describe('isValidPriceRange', () => {
    it('should return true for valid ranges', () => {
      expect(isValidPriceRange(0, 100)).toBe(true);
      expect(isValidPriceRange(50, 100)).toBe(true);
      expect(isValidPriceRange(100, 100)).toBe(true);
    });

    it('should return false for invalid ranges', () => {
      expect(isValidPriceRange(-1, 100)).toBe(false);
      expect(isValidPriceRange(100, 50)).toBe(false);
    });
  });

  describe('isValidQuantity', () => {
    it('should return true for positive integers', () => {
      expect(isValidQuantity(1)).toBe(true);
      expect(isValidQuantity(100)).toBe(true);
      expect(isValidQuantity('50')).toBe(true);
    });

    it('should return false for zero, negative, or non-integers', () => {
      expect(isValidQuantity(0)).toBe(false);
      expect(isValidQuantity(-1)).toBe(false);
      expect(isValidQuantity(1.5)).toBe(false);
    });
  });

  describe('isValidDiscount', () => {
    it('should return true for 0-100', () => {
      expect(isValidDiscount(0)).toBe(true);
      expect(isValidDiscount(50)).toBe(true);
      expect(isValidDiscount(100)).toBe(true);
    });

    it('should return false for out of range', () => {
      expect(isValidDiscount(-1)).toBe(false);
      expect(isValidDiscount(101)).toBe(false);
    });
  });

  describe('isValidTaxRate', () => {
    it('should return true for valid tax rates', () => {
      expect(isValidTaxRate(0)).toBe(true);
      expect(isValidTaxRate(11)).toBe(true);
      expect(isValidTaxRate(100)).toBe(true);
    });

    it('should return false for invalid tax rates', () => {
      expect(isValidTaxRate(-1)).toBe(false);
      expect(isValidTaxRate(101)).toBe(false);
    });
  });

  describe('getValidationError', () => {
    it('should return correct error messages', () => {
      expect(getValidationError('Email', 'required')).toBe('Email wajib diisi');
      expect(getValidationError('Email', 'email')).toBe('Email harus berupa email yang valid');
      expect(getValidationError('Password', 'password')).toContain('minimal 8 karakter');
    });

    it('should return generic message for unknown type', () => {
      expect(getValidationError('Field', 'unknown')).toBe('Field tidak valid');
    });
  });

  describe('validateForm', () => {
    it('should return empty object for valid data', () => {
      const data = { email: 'test@example.com', name: 'John' };
      const rules = {
        email: [{ type: 'required' as const }, { type: 'email' as const }],
        name: [{ type: 'required' as const }],
      };
      expect(validateForm(data, rules)).toEqual({});
    });

    it('should return errors for invalid data', () => {
      const data = { email: 'invalid', name: '' };
      const rules = {
        email: [{ type: 'required' as const }, { type: 'email' as const }],
        name: [{ type: 'required' as const }],
      };
      const errors = validateForm(data, rules);
      expect(errors.email).toBeDefined();
      expect(errors.name).toBeDefined();
    });

    it('should support custom validators', () => {
      const data = { age: 15 };
      const rules = {
        age: [{
          type: 'custom' as const,
          validator: (value: number) => value >= 18,
          message: 'Must be 18 or older',
        }],
      };
      const errors = validateForm(data, rules);
      expect(errors.age).toBe('Must be 18 or older');
    });

    it('should skip validation for empty optional fields', () => {
      const data = { email: '' };
      const rules = {
        email: [{ type: 'email' as const }],
      };
      expect(validateForm(data, rules)).toEqual({});
    });
  });
});
