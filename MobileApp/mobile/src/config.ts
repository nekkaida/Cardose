/**
 * Application Configuration
 *
 * Centralized configuration for:
 * - API endpoints
 * - Environment settings
 * - App constants
 * - Feature flags
 */

// Environment detection
const ENV = process.env.NODE_ENV || 'development';
const IS_DEV = ENV === 'development';
const IS_PROD = ENV === 'production';

// API Configuration
export const API_CONFIG = {
  // Default Base URL (compile-time fallback)
  DEFAULT_BASE_URL: IS_PROD
    ? 'https://api.cardose.com'
    : 'http://localhost:3001',

  // Runtime base URL (set from AsyncStorage on app startup)
  _runtimeBaseUrl: '',

  get BASE_URL(): string {
    return this._runtimeBaseUrl || this.DEFAULT_BASE_URL;
  },

  set BASE_URL(url: string) {
    this._runtimeBaseUrl = url;
  },

  // API endpoint path
  API_PATH: '/api',

  // Full API URL (computed)
  get API_URL() {
    return `${this.BASE_URL}${this.API_PATH}`;
  },

  // AsyncStorage key for user-configured server URL
  SERVER_URL_KEY: '@cardose_server_url',

  // Timeout settings
  TIMEOUT: 30000, // 30 seconds
  UPLOAD_TIMEOUT: 120000, // 2 minutes for file uploads

  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Database Configuration
export const DB_CONFIG = {
  NAME: 'cardose.db',
  VERSION: 1,

  // Cache settings
  CACHE_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
};

// Sync Configuration
export const SYNC_CONFIG = {
  // Auto-sync settings
  AUTO_SYNC_ENABLED: true,
  AUTO_SYNC_INTERVAL: 15 * 60 * 1000, // 15 minutes in milliseconds

  // Sync retry settings
  MAX_SYNC_RETRIES: 3,
  SYNC_RETRY_DELAY: 5000, // 5 seconds

  // Batch sync settings
  BATCH_SIZE: 50, // Number of items to sync at once
};

// App Configuration
export const APP_CONFIG = {
  // App info
  NAME: 'Cardose',
  VERSION: '1.0.0',

  // Feature flags
  FEATURES: {
    OFFLINE_MODE: true,
    PUSH_NOTIFICATIONS: true,
    ANALYTICS: false,
    DARK_MODE: true,
    WHATSAPP_INTEGRATION: true,
    PDF_GENERATION: true,
  },

  // UI settings
  ITEMS_PER_PAGE: 20,
  DEBOUNCE_DELAY: 300, // milliseconds
  TOAST_DURATION: 3000, // milliseconds

  // File upload settings
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
};

// Indonesian Business Configuration
export const BUSINESS_CONFIG = {
  // Tax settings
  PPN_RATE: 0.11, // 11% PPN (Pajak Pertambahan Nilai)

  // Currency
  CURRENCY: 'IDR',
  CURRENCY_SYMBOL: 'Rp',

  // Number formatting
  LOCALE: 'id-ID',

  // Invoice settings
  INVOICE_PREFIX: 'INV',
  INVOICE_NUMBER_LENGTH: 6,

  // Order settings
  ORDER_PREFIX: 'ORD',
  ORDER_NUMBER_LENGTH: 6,

  // Payment terms (in days)
  DEFAULT_PAYMENT_TERMS: 30,

  // WhatsApp settings
  WHATSAPP_COUNTRY_CODE: '62', // Indonesia
};

// Status Options
export const STATUS_OPTIONS = {
  ORDER: [
    { value: 'pending', label: 'Pending', color: '#FFA500' },
    { value: 'confirmed', label: 'Dikonfirmasi', color: '#4169E1' },
    { value: 'in_production', label: 'Dalam Produksi', color: '#9370DB' },
    { value: 'ready', label: 'Siap', color: '#32CD32' },
    { value: 'delivered', label: 'Terkirim', color: '#228B22' },
    { value: 'completed', label: 'Selesai', color: '#006400' },
    { value: 'cancelled', label: 'Dibatalkan', color: '#DC143C' },
  ],

  INVOICE: [
    { value: 'draft', label: 'Draft', color: '#808080' },
    { value: 'sent', label: 'Terkirim', color: '#4169E1' },
    { value: 'paid', label: 'Lunas', color: '#228B22' },
    { value: 'overdue', label: 'Jatuh Tempo', color: '#DC143C' },
    { value: 'cancelled', label: 'Dibatalkan', color: '#696969' },
  ],

  TASK: [
    { value: 'pending', label: 'Pending', color: '#FFA500' },
    { value: 'assigned', label: 'Ditugaskan', color: '#4169E1' },
    { value: 'in_progress', label: 'Dalam Proses', color: '#9370DB' },
    { value: 'review', label: 'Review', color: '#FFD700' },
    { value: 'completed', label: 'Selesai', color: '#228B22' },
    { value: 'cancelled', label: 'Dibatalkan', color: '#DC143C' },
  ],
};

// Color Palette
export const COLORS = {
  // Primary colors
  primary: '#2563EB',
  primaryDark: '#1E40AF',
  primaryLight: '#60A5FA',

  // Secondary colors
  secondary: '#10B981',
  secondaryDark: '#059669',
  secondaryLight: '#34D399',

  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Neutral colors
  black: '#000000',
  white: '#FFFFFF',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Background colors
  background: '#F9FAFB',
  surface: '#FFFFFF',

  // Text colors
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
};

// Typography
export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },

  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

// Border Radius
export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Breakpoints (for responsive design)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

// Export combined config
export default {
  ENV,
  IS_DEV,
  IS_PROD,
  API_CONFIG,
  DB_CONFIG,
  SYNC_CONFIG,
  APP_CONFIG,
  BUSINESS_CONFIG,
  STATUS_OPTIONS,
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  BREAKPOINTS,
};
