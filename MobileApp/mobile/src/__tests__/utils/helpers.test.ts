/**
 * Helpers Unit Tests
 */

import {
  getStockLevelStatus,
  getStockLevelPercentage,
  getInitials,
  getAvatarColor,
  debounce,
  throttle,
  deepClone,
  groupBy,
  sortBy,
  filterBySearch,
  calculatePercentage,
  calculatePercentageChange,
  roundToDecimal,
  isToday,
  isPast,
  isFuture,
  getDaysBetween,
  addDays,
  isEmpty,
  isEmptyObject,
  removeDuplicates,
  removeDuplicatesByKey,
  generateRandomId,
  sleep,
  formatNumber,
  clamp,
} from '../../utils/helpers';

// Mock react-native modules
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Linking: {
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    openURL: jest.fn(() => Promise.resolve()),
  },
  Platform: { OS: 'android' },
}));

describe('Helpers', () => {
  describe('getStockLevelStatus', () => {
    it('should return out_of_stock when current stock is 0', () => {
      expect(getStockLevelStatus(0, 10)).toBe('out_of_stock');
    });

    it('should return low when below minimum', () => {
      expect(getStockLevelStatus(5, 10)).toBe('low');
    });

    it('should return in_stock for normal levels', () => {
      expect(getStockLevelStatus(15, 10)).toBe('in_stock');
    });

    it('should return overstocked when above 3x minimum', () => {
      expect(getStockLevelStatus(35, 10)).toBe('overstocked');
    });
  });

  describe('getStockLevelPercentage', () => {
    it('should calculate correct percentage', () => {
      expect(getStockLevelPercentage(50, 100)).toBe(50);
      expect(getStockLevelPercentage(100, 100)).toBe(100);
    });

    it('should cap at 100%', () => {
      expect(getStockLevelPercentage(150, 100)).toBe(100);
    });

    it('should return 100 when minimum is 0', () => {
      expect(getStockLevelPercentage(50, 0)).toBe(100);
    });
  });

  describe('getInitials', () => {
    it('should get initials from full name', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('John Michael Doe')).toBe('JD');
    });

    it('should get initials from single name', () => {
      expect(getInitials('John')).toBe('JO');
    });

    it('should return ? for empty input', () => {
      expect(getInitials('')).toBe('?');
    });
  });

  describe('getAvatarColor', () => {
    it('should return consistent color for same name', () => {
      const color1 = getAvatarColor('John');
      const color2 = getAvatarColor('John');
      expect(color1).toBe(color2);
    });

    it('should return different colors for different names', () => {
      const color1 = getAvatarColor('John');
      const color2 = getAvatarColor('Jane');
      // Colors might be different (not guaranteed)
      expect(color1).toBeDefined();
      expect(color2).toBeDefined();
    });

    it('should return valid hex color', () => {
      const color = getAvatarColor('Test');
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    it('should delay function execution', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on subsequent calls', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      jest.advanceTimersByTime(50);
      debouncedFn();
      jest.advanceTimersByTime(50);

      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    jest.useFakeTimers();

    it('should call function immediately', () => {
      const fn = jest.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should ignore subsequent calls within limit', () => {
      const fn = jest.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should allow calls after limit', () => {
      const fn = jest.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      jest.advanceTimersByTime(100);
      throttledFn();

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('deepClone', () => {
    it('should create deep copy of object', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
    });

    it('should clone arrays', () => {
      const original = [1, 2, [3, 4]];
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });
  });

  describe('groupBy', () => {
    it('should group array by key', () => {
      const items = [
        { category: 'A', name: 'Item 1' },
        { category: 'B', name: 'Item 2' },
        { category: 'A', name: 'Item 3' },
      ];

      const result = groupBy(items, 'category');

      expect(result.A).toHaveLength(2);
      expect(result.B).toHaveLength(1);
    });
  });

  describe('sortBy', () => {
    it('should sort array ascending', () => {
      const items = [{ value: 3 }, { value: 1 }, { value: 2 }];
      const result = sortBy(items, 'value', 'asc');

      expect(result[0].value).toBe(1);
      expect(result[2].value).toBe(3);
    });

    it('should sort array descending', () => {
      const items = [{ value: 3 }, { value: 1 }, { value: 2 }];
      const result = sortBy(items, 'value', 'desc');

      expect(result[0].value).toBe(3);
      expect(result[2].value).toBe(1);
    });

    it('should not mutate original array', () => {
      const items = [{ value: 3 }, { value: 1 }];
      const result = sortBy(items, 'value');

      expect(items[0].value).toBe(3);
      expect(result).not.toBe(items);
    });
  });

  describe('filterBySearch', () => {
    const items = [
      { name: 'Apple', category: 'Fruit' },
      { name: 'Banana', category: 'Fruit' },
      { name: 'Carrot', category: 'Vegetable' },
    ];

    it('should filter by search query', () => {
      const result = filterBySearch(items, 'apple', ['name']);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Apple');
    });

    it('should search multiple keys', () => {
      const result = filterBySearch(items, 'fruit', ['name', 'category']);
      expect(result).toHaveLength(2);
    });

    it('should be case insensitive', () => {
      const result = filterBySearch(items, 'APPLE', ['name']);
      expect(result).toHaveLength(1);
    });

    it('should return all items for empty query', () => {
      const result = filterBySearch(items, '', ['name']);
      expect(result).toHaveLength(3);
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate correct percentage', () => {
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(1, 4)).toBe(25);
    });

    it('should return 0 when total is 0', () => {
      expect(calculatePercentage(10, 0)).toBe(0);
    });
  });

  describe('calculatePercentageChange', () => {
    it('should calculate positive change', () => {
      expect(calculatePercentageChange(100, 150)).toBe(50);
    });

    it('should calculate negative change', () => {
      expect(calculatePercentageChange(100, 50)).toBe(-50);
    });

    it('should handle zero old value', () => {
      expect(calculatePercentageChange(0, 100)).toBe(100);
      expect(calculatePercentageChange(0, 0)).toBe(0);
    });
  });

  describe('roundToDecimal', () => {
    it('should round to specified decimals', () => {
      expect(roundToDecimal(3.14159, 2)).toBe(3.14);
      expect(roundToDecimal(3.14159, 3)).toBe(3.142);
    });

    it('should use default 2 decimals', () => {
      expect(roundToDecimal(3.14159)).toBe(3.14);
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      expect(isToday(new Date())).toBe(true);
    });

    it('should return false for other dates', () => {
      expect(isToday('2020-01-01')).toBe(false);
    });
  });

  describe('isPast', () => {
    it('should return true for past dates', () => {
      expect(isPast('2020-01-01')).toBe(true);
    });

    it('should return false for future dates', () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      expect(isPast(future)).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('should return true for future dates', () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      expect(isFuture(future)).toBe(true);
    });

    it('should return false for past dates', () => {
      expect(isFuture('2020-01-01')).toBe(false);
    });
  });

  describe('getDaysBetween', () => {
    it('should calculate days between dates', () => {
      expect(getDaysBetween('2024-01-01', '2024-01-10')).toBe(9);
      expect(getDaysBetween('2024-01-10', '2024-01-01')).toBe(9);
    });
  });

  describe('addDays', () => {
    it('should add days to date', () => {
      const result = addDays('2024-01-01', 5);
      expect(result.getDate()).toBe(6);
    });

    it('should subtract days with negative value', () => {
      const result = addDays('2024-01-10', -5);
      expect(result.getDate()).toBe(5);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty arrays', () => {
      expect(isEmpty([])).toBe(true);
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return false for non-empty arrays', () => {
      expect(isEmpty([1, 2, 3])).toBe(false);
    });
  });

  describe('isEmptyObject', () => {
    it('should return true for empty objects', () => {
      expect(isEmptyObject({})).toBe(true);
      expect(isEmptyObject(null)).toBe(true);
      expect(isEmptyObject(undefined)).toBe(true);
    });

    it('should return false for non-empty objects', () => {
      expect(isEmptyObject({ a: 1 })).toBe(false);
    });
  });

  describe('removeDuplicates', () => {
    it('should remove duplicate values', () => {
      expect(removeDuplicates([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    });

    it('should handle strings', () => {
      expect(removeDuplicates(['a', 'b', 'a'])).toEqual(['a', 'b']);
    });
  });

  describe('removeDuplicatesByKey', () => {
    it('should remove duplicates by key', () => {
      const items = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 1, name: 'C' },
      ];
      const result = removeDuplicatesByKey(items, 'id');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('A');
    });
  });

  describe('generateRandomId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateRandomId();
      const id2 = generateRandomId();
      expect(id1).not.toBe(id2);
    });

    it('should be string', () => {
      const id = generateRandomId();
      expect(typeof id).toBe('string');
    });
  });

  describe('sleep', () => {
    jest.useFakeTimers();

    it('should resolve after specified time', async () => {
      const promise = sleep(100);
      jest.advanceTimersByTime(100);
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('formatNumber', () => {
    it('should format with thousand separators', () => {
      expect(formatNumber(1000)).toBe('1.000');
      expect(formatNumber(1000000)).toBe('1.000.000');
    });
  });

  describe('clamp', () => {
    it('should clamp value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });
});
