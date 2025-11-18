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
 * Validate Indonesian phone number
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');

  // Indonesian phone numbers can be:
  // - 08xx (10-13 digits)
  // - 628xx (11-14 digits)
  // - +628xx (11-14 digits)
  const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/;
  return phoneRegex.test(cleaned);
};

/**
 * Validate NPWP (Nomor Pokok Wajib Pajak)
 * Format: XX.XXX.XXX.X-XXX.XXX
 */
export const isValidNPWP = (npwp: string): boolean => {
  if (!npwp) return false;
  const cleaned = npwp.replace(/[.-]/g, '');

  // NPWP must be exactly 15 digits
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

  // Check if it's a valid date
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
    required: `${fieldName} wajib diisi`,
    email: `${fieldName} harus berupa email yang valid`,
    phone: `${fieldName} harus berupa nomor telepon yang valid`,
    npwp: `${fieldName} harus berupa NPWP yang valid (15 digit)`,
    positive: `${fieldName} harus berupa angka positif`,
    integer: `${fieldName} harus berupa bilangan bulat`,
    date: `${fieldName} harus berupa tanggal yang valid`,
    futureDate: `${fieldName} harus berupa tanggal di masa depan`,
    pastDate: `${fieldName} harus berupa tanggal di masa lalu`,
    url: `${fieldName} harus berupa URL yang valid`,
    percentage: `${fieldName} harus antara 0-100%`,
    postalCode: `${fieldName} harus berupa kode pos 5 digit`,
    sku: `${fieldName} harus berupa SKU yang valid (huruf, angka, dan tanda hubung)`,
    password: `${fieldName} minimal 8 karakter dengan huruf besar, kecil, dan angka`,
    minLength: `${fieldName} minimal ${params?.minLength} karakter`,
    maxLength: `${fieldName} maksimal ${params?.maxLength} karakter`,
    quantity: `${fieldName} harus berupa jumlah yang valid (bilangan bulat positif)`,
  };

  return errorMessages[validationType] || `${fieldName} tidak valid`;
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
        break; // Stop at first error for this field
      }
    }
  });

  return errors;
};
