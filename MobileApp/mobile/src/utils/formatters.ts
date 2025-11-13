import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { id } from 'date-fns/locale';

/**
 * Format currency in Indonesian Rupiah
 */
export const formatCurrency = (
  amount: number, 
  currency: string = 'IDR',
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    compact?: boolean;
  } = {}
): string => {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
    compact = false
  } = options;

  if (compact && amount >= 1000000) {
    // Format large numbers in compact form (e.g., "2.5M", "1.2K")
    if (amount >= 1000000000) {
      return `${currency} ${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `${currency} ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${currency} ${(amount / 1000).toFixed(1)}K`;
    }
  }

  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  } catch (error) {
    // Fallback for unsupported currencies
    return `${currency} ${amount.toLocaleString('id-ID', {
      minimumFractionDigits,
      maximumFractionDigits,
    })}`;
  }
};

/**
 * Format date in Indonesian format
 */
export const formatDate = (
  date: string | Date,
  formatString: string = 'dd MMM yyyy'
): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      return 'Invalid Date';
    }

    return format(dateObj, formatString, { locale: id });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Format date and time in Indonesian format
 */
export const formatDateTime = (
  date: string | Date,
  formatString: string = 'dd MMM yyyy, HH:mm'
): string => {
  return formatDate(date, formatString);
};

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export const formatRelativeTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObj)) {
      return 'Invalid Date';
    }

    return formatDistanceToNow(dateObj, { 
      addSuffix: true,
      locale: id 
    });
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Format phone number for Indonesian format
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Indonesian phone number formatting
  if (cleaned.startsWith('62')) {
    // International format: +62 xxx xxxx xxxx
    return `+62 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 9)} ${cleaned.slice(9)}`;
  } else if (cleaned.startsWith('0')) {
    // Local format: 0xxx xxxx xxxx
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8)}`;
  }
  
  return phone; // Return original if format is unknown
};

/**
 * Format WhatsApp number for API calls
 */
export const formatWhatsAppNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Ensure it starts with 62 (Indonesian country code)
  if (cleaned.startsWith('0')) {
    return `62${cleaned.slice(1)}`;
  } else if (!cleaned.startsWith('62')) {
    return `62${cleaned}`;
  }
  
  return cleaned;
};

/**
 * Format dimensions with unit
 */
export const formatDimensions = (
  width: number,
  height: number,
  depth: number,
  unit: string = 'cm'
): string => {
  return `${width} × ${height} × ${depth} ${unit}`;
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format percentage
 */
export const formatPercentage = (
  value: number, 
  decimals: number = 1
): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format order number
 */
export const formatOrderNumber = (orderNumber: string): string => {
  // Add visual separation for better readability
  return orderNumber.replace(/^(PGB)-(\d{4})-(\d{3})$/, '$1-$2-$3');
};

/**
 * Format status text for display
 */
export const formatStatusText = (status: string): string => {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format business type for display
 */
export const formatBusinessType = (type: string): string => {
  const typeMap: Record<string, string> = {
    individual: 'Individual',
    corporate: 'Corporate',
    wedding: 'Wedding',
    event: 'Event'
  };
  
  return typeMap[type] || type;
};

/**
 * Format address for display
 */
export const formatAddress = (address: {
  street?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
}): string => {
  const parts = [
    address.street,
    address.city,
    address.province,
    address.postal_code,
    address.country
  ].filter(Boolean);
  
  return parts.join(', ');
};

/**
 * Format priority level with emoji
 */
export const formatPriority = (priority: 'low' | 'normal' | 'high' | 'urgent'): string => {
  const priorityMap = {
    low: '🟢 Low',
    normal: '🔵 Normal',
    high: '🟠 High',
    urgent: '🔴 Urgent'
  };
  
  return priorityMap[priority] || priority;
};

/**
 * Format duration (in minutes) to human readable format
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} menit`;
  } else if (minutes < 1440) { // less than 24 hours
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? `${hours} jam ${remainingMinutes} menit`
      : `${hours} jam`;
  } else {
    const days = Math.floor(minutes / 1440);
    const remainingHours = Math.floor((minutes % 1440) / 60);
    return remainingHours > 0
      ? `${days} hari ${remainingHours} jam`
      : `${days} hari`;
  }
};

/**
 * Format weight with unit
 */
export const formatWeight = (weight: number, unit: string = 'kg'): string => {
  if (weight < 1 && unit === 'kg') {
    return `${(weight * 1000).toFixed(0)} gr`;
  }
  return `${weight.toFixed(weight < 10 ? 1 : 0)} ${unit}`;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

/**
 * Format materials list for display
 */
export const formatMaterialsList = (materials: string[]): string => {
  if (materials.length === 0) return 'No materials specified';
  if (materials.length === 1) return materials[0];
  if (materials.length === 2) return materials.join(' and ');
  
  return `${materials.slice(0, -1).join(', ')}, and ${materials[materials.length - 1]}`;
};

/**
 * Format colors list for display
 */
export const formatColorsList = (colors: string[]): string => {
  if (colors.length === 0) return 'No colors specified';
  if (colors.length === 1) return colors[0];
  if (colors.length <= 3) return colors.join(', ');
  
  return `${colors.slice(0, 2).join(', ')} +${colors.length - 2} more`;
};

/**
 * Capitalize first letter of each word
 */
export const titleCase = (text: string): string => {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format validation errors for display
 */
export const formatValidationError = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.details) return error.details;
  return 'An error occurred';
};

/**
 * Format API response errors
 */
export const formatApiError = (error: any): string => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return 'Network error occurred';
};