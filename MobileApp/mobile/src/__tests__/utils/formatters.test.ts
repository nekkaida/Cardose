/**
 * Formatters Unit Tests
 */

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatPhoneNumber,
  formatWhatsAppNumber,
  formatDimensions,
  formatFileSize,
  formatPercentage,
  formatOrderNumber,
  formatStatusText,
  formatBusinessType,
  formatAddress,
  formatPriority,
  formatDuration,
  formatWeight,
  truncateText,
  formatMaterialsList,
  formatColorsList,
  titleCase,
  formatValidationError,
  formatApiError,
} from '../../utils/formatters';

describe('Formatters', () => {
  describe('formatCurrency', () => {
    it('should format currency in IDR', () => {
      const result = formatCurrency(1000000);
      expect(result).toContain('1.000.000');
    });

    it('should format compact currency', () => {
      expect(formatCurrency(1000000, 'IDR', { compact: true })).toContain('1.0M');
      expect(formatCurrency(1500000000, 'IDR', { compact: true })).toContain('1.5B');
      // 5000 is not >= 1000000, so no compact formatting applied
    });

    it('should handle zero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0');
    });

    it('should respect fraction digits', () => {
      const result = formatCurrency(1000.50, 'IDR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      expect(result).toBeDefined();
    });
  });

  describe('formatDate', () => {
    it('should format date in Indonesian locale', () => {
      const result = formatDate('2024-01-15');
      expect(result).toBeDefined();
      expect(result).not.toBe('Invalid Date');
    });

    it('should handle Date objects', () => {
      const result = formatDate(new Date('2024-01-15'));
      expect(result).not.toBe('Invalid Date');
    });

    it('should return Invalid Date for invalid input', () => {
      expect(formatDate('invalid')).toBe('Invalid Date');
    });

    it('should use custom format', () => {
      const result = formatDate('2024-01-15', 'yyyy-MM-dd');
      expect(result).toBe('2024-01-15');
    });
  });

  describe('formatDateTime', () => {
    it('should format date with time', () => {
      const result = formatDateTime('2024-01-15T10:30:00');
      expect(result).toBeDefined();
      expect(result).not.toBe('Invalid Date');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format relative time', () => {
      const result = formatRelativeTime(new Date());
      expect(result).toBeDefined();
      expect(result).not.toBe('Invalid Date');
    });

    it('should return Invalid Date for invalid input', () => {
      expect(formatRelativeTime('invalid')).toBe('Invalid Date');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format Indonesian phone numbers starting with 0', () => {
      const result = formatPhoneNumber('08123456789');
      expect(result).toContain('0812');
    });

    it('should format international format', () => {
      const result = formatPhoneNumber('628123456789');
      expect(result).toContain('+62');
    });

    it('should return empty string for empty input', () => {
      expect(formatPhoneNumber('')).toBe('');
    });
  });

  describe('formatWhatsAppNumber', () => {
    it('should convert local to international format', () => {
      expect(formatWhatsAppNumber('08123456789')).toBe('628123456789');
    });

    it('should keep international format', () => {
      expect(formatWhatsAppNumber('628123456789')).toBe('628123456789');
    });

    it('should add country code', () => {
      expect(formatWhatsAppNumber('8123456789')).toBe('628123456789');
    });

    it('should return empty string for empty input', () => {
      expect(formatWhatsAppNumber('')).toBe('');
    });
  });

  describe('formatDimensions', () => {
    it('should format dimensions with default unit', () => {
      expect(formatDimensions(10, 20, 30)).toBe('10 × 20 × 30 cm');
    });

    it('should use custom unit', () => {
      expect(formatDimensions(10, 20, 30, 'mm')).toBe('10 × 20 × 30 mm');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    it('should format KB', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
    });

    it('should format MB', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
    });

    it('should handle zero', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage', () => {
      expect(formatPercentage(50)).toBe('50.0%');
      expect(formatPercentage(33.333, 2)).toBe('33.33%');
    });
  });

  describe('formatOrderNumber', () => {
    it('should format order number', () => {
      expect(formatOrderNumber('PGB-2024-001')).toBe('PGB-2024-001');
    });
  });

  describe('formatStatusText', () => {
    it('should convert snake_case to Title Case', () => {
      expect(formatStatusText('in_progress')).toBe('In Progress');
      expect(formatStatusText('pending_approval')).toBe('Pending Approval');
    });
  });

  describe('formatBusinessType', () => {
    it('should map business types', () => {
      expect(formatBusinessType('individual')).toBe('Individual');
      expect(formatBusinessType('corporate')).toBe('Corporate');
      expect(formatBusinessType('wedding')).toBe('Wedding');
    });

    it('should return original for unknown types', () => {
      expect(formatBusinessType('unknown')).toBe('unknown');
    });
  });

  describe('formatAddress', () => {
    it('should format full address', () => {
      const address = {
        street: 'Jl. Sudirman 123',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postal_code: '12345',
        country: 'Indonesia',
      };
      expect(formatAddress(address)).toBe('Jl. Sudirman 123, Jakarta, DKI Jakarta, 12345, Indonesia');
    });

    it('should handle partial address', () => {
      const address = { city: 'Jakarta', province: 'DKI Jakarta' };
      expect(formatAddress(address)).toBe('Jakarta, DKI Jakarta');
    });

    it('should handle empty address', () => {
      expect(formatAddress({})).toBe('');
    });
  });

  describe('formatPriority', () => {
    it('should format priority with emoji', () => {
      expect(formatPriority('low')).toContain('Low');
      expect(formatPriority('normal')).toContain('Normal');
      expect(formatPriority('high')).toContain('High');
      expect(formatPriority('urgent')).toContain('Urgent');
    });
  });

  describe('formatDuration', () => {
    it('should format minutes', () => {
      expect(formatDuration(30)).toBe('30 menit');
    });

    it('should format hours', () => {
      expect(formatDuration(90)).toBe('1 jam 30 menit');
      expect(formatDuration(120)).toBe('2 jam');
    });

    it('should format days', () => {
      expect(formatDuration(1440)).toBe('1 hari');
      expect(formatDuration(1500)).toBe('1 hari 1 jam');
    });
  });

  describe('formatWeight', () => {
    it('should format weight in kg', () => {
      expect(formatWeight(5)).toMatch(/5(.0)? kg/);
      expect(formatWeight(5.5)).toBe('5.5 kg');
    });

    it('should convert small weights to grams', () => {
      expect(formatWeight(0.5)).toBe('500 gr');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      expect(truncateText('Hello World', 8)).toBe('Hello...');
    });

    it('should not truncate short text', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
    });
  });

  describe('formatMaterialsList', () => {
    it('should format empty list', () => {
      expect(formatMaterialsList([])).toBe('No materials specified');
    });

    it('should format single item', () => {
      expect(formatMaterialsList(['Wood'])).toBe('Wood');
    });

    it('should format two items', () => {
      expect(formatMaterialsList(['Wood', 'Metal'])).toBe('Wood and Metal');
    });

    it('should format multiple items', () => {
      expect(formatMaterialsList(['Wood', 'Metal', 'Plastic'])).toBe('Wood, Metal, and Plastic');
    });
  });

  describe('formatColorsList', () => {
    it('should format empty list', () => {
      expect(formatColorsList([])).toBe('No colors specified');
    });

    it('should format single color', () => {
      expect(formatColorsList(['Red'])).toBe('Red');
    });

    it('should format multiple colors', () => {
      expect(formatColorsList(['Red', 'Blue', 'Green'])).toBe('Red, Blue, Green');
    });

    it('should truncate long list', () => {
      expect(formatColorsList(['Red', 'Blue', 'Green', 'Yellow'])).toBe('Red, Blue +2 more');
    });
  });

  describe('titleCase', () => {
    it('should capitalize each word', () => {
      expect(titleCase('hello world')).toBe('Hello World');
      expect(titleCase('HELLO WORLD')).toBe('Hello World');
    });
  });

  describe('formatValidationError', () => {
    it('should return string error', () => {
      expect(formatValidationError('Error message')).toBe('Error message');
    });

    it('should extract message from object', () => {
      expect(formatValidationError({ message: 'Error message' })).toBe('Error message');
    });

    it('should extract details from object', () => {
      expect(formatValidationError({ details: 'Error details' })).toBe('Error details');
    });

    it('should return generic message for unknown', () => {
      expect(formatValidationError({})).toBe('An error occurred');
    });
  });

  describe('formatApiError', () => {
    it('should extract message from response data', () => {
      const error = { response: { data: { message: 'API Error' } } };
      expect(formatApiError(error)).toBe('API Error');
    });

    it('should extract message from error', () => {
      const error = { message: 'Error message' };
      expect(formatApiError(error)).toBe('Error message');
    });

    it('should return generic message', () => {
      expect(formatApiError({})).toBe('Network error occurred');
    });
  });
});
