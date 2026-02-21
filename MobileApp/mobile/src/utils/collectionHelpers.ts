/**
 * Collection Helper Functions
 *
 * Utilities for working with arrays and objects: grouping, sorting,
 * filtering, deduplication, and emptiness checks.
 */

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Group array by key
 */
export const groupBy = <T extends Record<string, any>>(
  array: T[],
  key: keyof T
): Record<string, T[]> => {
  return array.reduce((result, currentValue) => {
    const groupKey = String(currentValue[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(currentValue);
    return result;
  }, {} as Record<string, T[]>);
};

/**
 * Sort array by key
 */
export const sortBy = <T extends Record<string, any>>(
  array: T[],
  key: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Filter array by search query
 */
export const filterBySearch = <T extends Record<string, any>>(
  array: T[],
  searchQuery: string,
  searchKeys: (keyof T)[]
): T[] => {
  const query = searchQuery.toLowerCase().trim();
  if (!query) return array;

  return array.filter((item) =>
    searchKeys.some((key) =>
      String(item[key]).toLowerCase().includes(query)
    )
  );
};

/**
 * Check if array is empty
 */
export const isEmpty = <T>(arr: T[] | null | undefined): boolean => {
  return !arr || arr.length === 0;
};

/**
 * Check if object is empty
 */
export const isEmptyObject = (obj: Record<string, any> | null | undefined): boolean => {
  return !obj || Object.keys(obj).length === 0;
};

/**
 * Remove duplicates from array
 */
export const removeDuplicates = <T>(array: T[]): T[] => {
  return Array.from(new Set(array));
};

/**
 * Remove duplicates from array of objects by key
 */
export const removeDuplicatesByKey = <T extends Record<string, any>>(
  array: T[],
  key: keyof T
): T[] => {
  const seen = new Set();
  return array.filter((item) => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};
