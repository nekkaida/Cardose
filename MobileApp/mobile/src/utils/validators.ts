/**
 * Validation Utilities
 *
 * Common validation functions for forms and user input
 */

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Indonesian phone number.
 *
 * Accepts: +628xxx, 628xxx, 08xxx (with optional spaces/dashes for formatting).
 * Strips formatting characters (spaces, dashes, parentheses) but preserves '+'
 * so the +62 branch is reachable.
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  if (!phone) return false;
  // Strip formatting chars but keep '+'
  const cleaned = phone.trim().replace(/[\s()-]/g, '');
  // Indonesian phone: +62xxx (12-15 chars), 62xxx (11-14 digits), 0xxx (10-13 digits)
  return /^(\+62|62|0)[0-9]{9,12}$/.test(cleaned);
};

/**
 * Validate NPWP (Nomor Pokok Wajib Pajak)
 * Format: XX.XXX.XXX.X-XXX.XXX
 */
export const isValidNPWP = (npwp: string): boolean => {
  if (!npwp) return false;
  const cleaned = npwp.replace(/[.-]/g, '');
  return /^\d{15}$/.test(cleaned);
};

/**
 * Validate positive number
 */
export const isPositiveNumber = (value: string | number): boolean => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num > 0;
};

/**
 * Validate non-negative number
 */
export const isNonNegativeNumber = (value: string | number): boolean => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num >= 0;
};

/**
 * Validate integer
 */
export const isInteger = (value: string | number): boolean => {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return Number.isInteger(num);
};

/**
 * Validate date format (YYYY-MM-DD)
 */
export const isValidDateFormat = (date: string): boolean => {
  if (!date) return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;

  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
};

/**
 * Validate future date
 */
export const isFutureDate = (date: string): boolean => {
  if (!isValidDateFormat(date)) return false;
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate >= today;
};

/**
 * Validate past date
 */
export const isPastDate = (date: string): boolean => {
  if (!isValidDateFormat(date)) return false;
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate < today;
};

/**
 * Validate string length
 */
export const isValidLength = (
  value: string,
  minLength: number,
  maxLength?: number
): boolean => {
  if (!value) return false;
  const length = value.trim().length;
  if (length < minLength) return false;
  if (maxLength && length > maxLength) return false;
  return true;
};

/**
 * Validate required field
 */
export const isRequired = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
};

/**
 * Validate URL format
 */
export const isValidURL = (url: string): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate percentage (0-100)
 */
export const isValidPercentage = (value: string | number): boolean => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num >= 0 && num <= 100;
};

/**
 * Validate Indonesian postal code (5 digits)
 */
export const isValidPostalCode = (postalCode: string): boolean => {
  if (!postalCode) return false;
  return /^\d{5}$/.test(postalCode);
};

/**
 * Validate SKU format (alphanumeric with dashes)
 */
export const isValidSKU = (sku: string): boolean => {
  if (!sku) return false;
  return /^[A-Z0-9-]+$/.test(sku.toUpperCase());
};

/**
 * Validate password strength
 * At least 8 characters, 1 uppercase, 1 lowercase, 1 number
 */
export const isStrongPassword = (password: string): boolean => {
  if (!password || password.length < 8) return false;

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return hasUpperCase && hasLowerCase && hasNumber;
};

/**
 * Validate order number format
 * Expected: PGB-YYYY-XXX
 */
export const isValidOrderNumber = (orderNumber: string): boolean => {
  if (!orderNumber) return false;
  return /^PGB-\d{4}-\d{3}$/.test(orderNumber);
};

/**
 * Validate dimensions (all positive numbers)
 */
export const isValidDimensions = (
  width: number,
  height: number,
  depth: number
): boolean => {
  return width > 0 && height > 0 && depth > 0;
};

/**
 * Validate price range
 */
export const isValidPriceRange = (min: number, max: number): boolean => {
  return min >= 0 && max >= min;
};

/**
 * Validate quantity (positive integer)
 */
export const isValidQuantity = (quantity: string | number): boolean => {
  const num = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity;
  return Number.isInteger(num) && num > 0;
};

/**
 * Validate discount (0-100%)
 */
export const isValidDiscount = (discount: string | number): boolean => {
  return isValidPercentage(discount);
};

/**
 * Validate tax rate
 */
export const isValidTaxRate = (taxRate: string | number): boolean => {
  return isValidPercentage(taxRate);
};

/**
 * Get validation error message
 */
export const getValidationError = (
  fieldName: string,
  validationType: string,
  params?: any
): string => {
  const errorMessages: Record<string, string> = {
    required: `${fieldName} is required`,
    email: `${fieldName} must be a valid email address`,
    phone: `${fieldName} must be a valid phone number`,
    npwp: `${fieldName} must be a valid NPWP (15 digits)`,
    positive: `${fieldName} must be a positive number`,
    integer: `${fieldName} must be a whole number`,
    date: `${fieldName} must be a valid date`,
    futureDate: `${fieldName} must be a future date`,
    pastDate: `${fieldName} must be a past date`,
    url: `${fieldName} must be a valid URL`,
    percentage: `${fieldName} must be between 0-100%`,
    postalCode: `${fieldName} must be a 5-digit postal code`,
    sku: `${fieldName} must be a valid SKU (letters, numbers, and hyphens)`,
    password: `${fieldName} must be at least 8 characters with uppercase, lowercase, and a number`,
    minLength: `${fieldName} must be at least ${params?.minLength} characters`,
    maxLength: `${fieldName} must be at most ${params?.maxLength} characters`,
    quantity: `${fieldName} must be a valid quantity (positive integer)`,
  };

  return errorMessages[validationType] || `${fieldName} is invalid`;
};

/**
 * Comprehensive form validation
 */
export interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'npwp' | 'positive' | 'integer' |
        'date' | 'url' | 'percentage' | 'minLength' | 'maxLength' | 'quantity' | 'custom';
  message?: string;
  params?: any;
  validator?: (value: any) => boolean;
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule[];
}

export interface ValidationErrors {
  [fieldName: string]: string;
}

/**
 * Validate form data against rules
 */
export const validateForm = (
  data: Record<string, any>,
  rules: ValidationRules
): ValidationErrors => {
  const errors: ValidationErrors = {};

  Object.keys(rules).forEach((fieldName) => {
    const fieldRules = rules[fieldName];
    const fieldValue = data[fieldName];

    for (const rule of fieldRules) {
      let isValid = true;

      switch (rule.type) {
        case 'required':
          isValid = isRequired(fieldValue);
          break;
        case 'email':
          isValid = !fieldValue || isValidEmail(fieldValue);
          break;
        case 'phone':
          isValid = !fieldValue || isValidPhoneNumber(fieldValue);
          break;
        case 'npwp':
          isValid = !fieldValue || isValidNPWP(fieldValue);
          break;
        case 'positive':
          isValid = !fieldValue || isPositiveNumber(fieldValue);
          break;
        case 'integer':
          isValid = !fieldValue || isInteger(fieldValue);
          break;
        case 'date':
          isValid = !fieldValue || isValidDateFormat(fieldValue);
          break;
        case 'url':
          isValid = !fieldValue || isValidURL(fieldValue);
          break;
        case 'percentage':
          isValid = !fieldValue || isValidPercentage(fieldValue);
          break;
        case 'minLength':
          isValid = !fieldValue || isValidLength(fieldValue, rule.params?.minLength || 0);
          break;
        case 'maxLength':
          isValid = !fieldValue || isValidLength(fieldValue, 0, rule.params?.maxLength);
          break;
        case 'quantity':
          isValid = !fieldValue || isValidQuantity(fieldValue);
          break;
        case 'custom':
          if (rule.validator) {
            isValid = rule.validator(fieldValue);
          }
          break;
      }

      if (!isValid) {
        errors[fieldName] = rule.message || getValidationError(fieldName, rule.type, rule.params);
        break;
      }
    }
  });

  return errors;
};
