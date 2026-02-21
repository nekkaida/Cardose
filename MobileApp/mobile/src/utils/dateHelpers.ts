/**
 * Date Helper Functions
 *
 * Utilities for date comparison and manipulation.
 * For date *formatting*, see formatters.ts (formatDate, formatDateTime, formatRelativeTime).
 */

/**
 * Check if date is today
 */
export const isToday = (date: Date | string): boolean => {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();

  return (
    inputDate.getDate() === today.getDate() &&
    inputDate.getMonth() === today.getMonth() &&
    inputDate.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if date is in the past
 */
export const isPast = (date: Date | string): boolean => {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return inputDate < now;
};

/**
 * Check if date is in the future
 */
export const isFuture = (date: Date | string): boolean => {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return inputDate > now;
};

/**
 * Get days between two dates
 */
export const getDaysBetween = (
  startDate: Date | string,
  endDate: Date | string
): number => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * Add days to date
 */
export const addDays = (date: Date | string, days: number): Date => {
  const result = typeof date === 'string' ? new Date(date) : new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
