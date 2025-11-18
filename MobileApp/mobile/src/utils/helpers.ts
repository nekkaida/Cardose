/**
 * Helper Functions
 *
 * Common utility functions for various operations
 */

import { Alert, Linking, Platform } from 'react-native';
import { BUSINESS_CONFIG } from '../config';

/**
 * Calculate total price with discount and tax
 */
export const calculateTotalPrice = (
  unitPrice: number,
  quantity: number,
  discountPercentage: number = 0,
  taxRate: number = BUSINESS_CONFIG.PPN_RATE
): {
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
} => {
  const subtotal = unitPrice * quantity;
  const discount = subtotal * (discountPercentage / 100);
  const afterDiscount = subtotal - discount;
  const taxAmount = afterDiscount * (taxRate / 100);
  const total = afterDiscount + taxAmount;

  return {
    subtotal,
    discount,
    taxAmount,
    total,
  };
};

/**
 * Calculate stock level status
 */
export const getStockLevelStatus = (
  currentStock: number,
  minimumStock: number
): 'out_of_stock' | 'low' | 'in_stock' | 'overstocked' => {
  if (currentStock === 0) return 'out_of_stock';
  if (currentStock < minimumStock) return 'low';
  if (currentStock > minimumStock * 3) return 'overstocked';
  return 'in_stock';
};

/**
 * Calculate stock level percentage
 */
export const getStockLevelPercentage = (
  currentStock: number,
  minimumStock: number
): number => {
  if (minimumStock === 0) return 100;
  return Math.min((currentStock / minimumStock) * 100, 100);
};

/**
 * Open WhatsApp with phone number
 */
export const openWhatsApp = async (phoneNumber: string, message?: string): Promise<void> => {
  const phone = phoneNumber.startsWith('0')
    ? BUSINESS_CONFIG.WHATSAPP_COUNTRY_CODE + phoneNumber.substring(1)
    : phoneNumber;

  const url = message
    ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`
    : `whatsapp://send?phone=${phone}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'WhatsApp tidak terinstall di perangkat Anda');
    }
  } catch (error) {
    console.error('Error opening WhatsApp:', error);
    Alert.alert('Error', 'Gagal membuka WhatsApp');
  }
};

/**
 * Make phone call
 */
export const makePhoneCall = async (phoneNumber: string): Promise<void> => {
  const url = `tel:${phoneNumber}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Tidak dapat melakukan panggilan telepon');
    }
  } catch (error) {
    console.error('Error making phone call:', error);
    Alert.alert('Error', 'Gagal melakukan panggilan');
  }
};

/**
 * Send email
 */
export const sendEmail = async (
  email: string,
  subject?: string,
  body?: string
): Promise<void> => {
  const url = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}${body ? `&body=${encodeURIComponent(body)}` : ''}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Tidak dapat mengirim email');
    }
  } catch (error) {
    console.error('Error sending email:', error);
    Alert.alert('Error', 'Gagal mengirim email');
  }
};

/**
 * Generate order number
 */
export const generateOrderNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, '0');
  return `${BUSINESS_CONFIG.ORDER_PREFIX}-${year}-${random}`;
};

/**
 * Generate invoice number
 */
export const generateInvoiceNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, '0');
  return `${BUSINESS_CONFIG.INVOICE_PREFIX}-${year}-${random}`;
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';

  const words = name.trim().split(' ');
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

/**
 * Generate random color for avatar
 */
export const getAvatarColor = (name: string): string => {
  const colors = [
    '#F44336',
    '#E91E63',
    '#9C27B0',
    '#673AB7',
    '#3F51B5',
    '#2196F3',
    '#03A9F4',
    '#00BCD4',
    '#009688',
    '#4CAF50',
    '#8BC34A',
    '#CDDC39',
    '#FFC107',
    '#FF9800',
    '#FF5722',
  ];

  const hash = name
    .split('')
    .reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

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
 * Calculate percentage
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

/**
 * Calculate percentage change
 */
export const calculatePercentageChange = (
  oldValue: number,
  newValue: number
): number => {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
};

/**
 * Round to decimal places
 */
export const roundToDecimal = (value: number, decimals: number = 2): number => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

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

/**
 * Generate random ID
 */
export const generateRandomId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Sleep/delay function
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Retry async function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }

  throw lastError!;
};

/**
 * Format number with thousand separators
 */
export const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Clamp number between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Check if platform is iOS
 */
export const isIOS = (): boolean => {
  return Platform.OS === 'ios';
};

/**
 * Check if platform is Android
 */
export const isAndroid = (): boolean => {
  return Platform.OS === 'android';
};

/**
 * Show confirmation dialog
 */
export const showConfirmDialog = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
): void => {
  Alert.alert(
    title,
    message,
    [
      {
        text: 'Batal',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: 'Ya',
        onPress: onConfirm,
      },
    ],
    { cancelable: true }
  );
};

/**
 * Show delete confirmation dialog
 */
export const showDeleteConfirmation = (
  itemName: string,
  onConfirm: () => void,
  onCancel?: () => void
): void => {
  Alert.alert(
    'Konfirmasi Hapus',
    `Apakah Anda yakin ingin menghapus ${itemName}? Tindakan ini tidak dapat dibatalkan.`,
    [
      {
        text: 'Batal',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: onConfirm,
      },
    ],
    { cancelable: true }
  );
};
