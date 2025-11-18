/**
 * Application Constants
 *
 * Contains all constant values used throughout the application
 */

// Order Status Constants
export const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PRODUCTION: 'in_production',
  QUALITY_CHECK: 'quality_check',
  COMPLETED: 'completed',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export const ORDER_STATUS_LABELS = {
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  in_production: 'Dalam Produksi',
  quality_check: 'Quality Check',
  completed: 'Selesai',
  delivered: 'Terkirim',
  cancelled: 'Dibatalkan',
} as const;

export const ORDER_STATUS_COLORS = {
  pending: '#FFA500',
  confirmed: '#2196F3',
  in_production: '#9C27B0',
  quality_check: '#FF9800',
  completed: '#4CAF50',
  delivered: '#00BCD4',
  cancelled: '#F44336',
} as const;

// Customer Type Constants
export const CUSTOMER_TYPES = {
  INDIVIDUAL: 'individual',
  COMPANY: 'company',
} as const;

export const CUSTOMER_TYPE_LABELS = {
  individual: 'Individual',
  company: 'Perusahaan',
} as const;

// Material Category Constants
export const MATERIAL_CATEGORIES = {
  PAPER: 'paper',
  RIBBON: 'ribbon',
  BOX: 'box',
  DECORATION: 'decoration',
  OTHER: 'other',
} as const;

export const MATERIAL_CATEGORY_LABELS = {
  paper: 'Kertas',
  ribbon: 'Pita',
  box: 'Box',
  decoration: 'Dekorasi',
  other: 'Lainnya',
} as const;

// Unit Constants
export const UNITS = {
  KG: 'kg',
  G: 'g',
  M: 'm',
  CM: 'cm',
  PCS: 'pcs',
  ROLL: 'roll',
  SHEET: 'sheet',
  BOX: 'box',
} as const;

export const UNIT_LABELS = {
  kg: 'Kilogram',
  g: 'Gram',
  m: 'Meter',
  cm: 'Centimeter',
  pcs: 'Pieces',
  roll: 'Roll',
  sheet: 'Sheet',
  box: 'Box',
} as const;

// Task Status Constants
export const TASK_STATUSES = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const TASK_STATUS_LABELS = {
  pending: 'Menunggu',
  assigned: 'Ditugaskan',
  in_progress: 'Dalam Proses',
  review: 'Review',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
} as const;

export const TASK_STATUS_COLORS = {
  pending: '#9E9E9E',
  assigned: '#2196F3',
  in_progress: '#FF9800',
  review: '#9C27B0',
  completed: '#4CAF50',
  cancelled: '#F44336',
} as const;

// Priority Constants
export const PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export const PRIORITY_LABELS = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
} as const;

export const PRIORITY_COLORS = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#F44336',
} as const;

// Invoice Status Constants
export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
} as const;

export const INVOICE_STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Terkirim',
  paid: 'Lunas',
  overdue: 'Terlambat',
  cancelled: 'Dibatalkan',
} as const;

export const INVOICE_STATUS_COLORS = {
  draft: '#9E9E9E',
  sent: '#2196F3',
  paid: '#4CAF50',
  overdue: '#F44336',
  cancelled: '#757575',
} as const;

// Payment Method Constants
export const PAYMENT_METHODS = {
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  CREDIT_CARD: 'credit_card',
  MOBILE_PAYMENT: 'mobile_payment',
} as const;

export const PAYMENT_METHOD_LABELS = {
  cash: 'Tunai',
  bank_transfer: 'Transfer Bank',
  credit_card: 'Kartu Kredit',
  mobile_payment: 'E-Wallet',
} as const;

// Stock Level Constants
export const STOCK_LEVELS = {
  OUT_OF_STOCK: 'out_of_stock',
  LOW: 'low',
  IN_STOCK: 'in_stock',
  OVERSTOCKED: 'overstocked',
} as const;

export const STOCK_LEVEL_LABELS = {
  out_of_stock: 'Habis',
  low: 'Rendah',
  in_stock: 'Tersedia',
  overstocked: 'Berlebih',
} as const;

export const STOCK_LEVEL_COLORS = {
  out_of_stock: '#F44336',
  low: '#FF9800',
  in_stock: '#4CAF50',
  overstocked: '#2196F3',
} as const;

// Date Format Constants
export const DATE_FORMATS = {
  DISPLAY: 'dd MMM yyyy',
  DISPLAY_LONG: 'dd MMMM yyyy',
  DISPLAY_WITH_TIME: 'dd MMM yyyy, HH:mm',
  INPUT: 'yyyy-MM-dd',
  INPUT_WITH_TIME: 'yyyy-MM-dd HH:mm:ss',
} as const;

// API Constants
export const API_TIMEOUT = {
  DEFAULT: 30000, // 30 seconds
  UPLOAD: 120000, // 2 minutes
} as const;

// Pagination Constants
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

// Toast Duration Constants
export const TOAST_DURATION = {
  SHORT: 2000,
  MEDIUM: 3000,
  LONG: 5000,
} as const;

// Refresh Intervals
export const REFRESH_INTERVALS = {
  DASHBOARD: 300000, // 5 minutes
  ORDER_LIST: 60000, // 1 minute
  INVENTORY: 300000, // 5 minutes
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
  UNAUTHORIZED: 'Sesi Anda telah berakhir. Silakan login kembali.',
  FORBIDDEN: 'Anda tidak memiliki akses untuk melakukan tindakan ini.',
  NOT_FOUND: 'Data tidak ditemukan.',
  SERVER_ERROR: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
  VALIDATION_ERROR: 'Data yang Anda masukkan tidak valid.',
  TIMEOUT_ERROR: 'Permintaan memakan waktu terlalu lama. Silakan coba lagi.',
  UNKNOWN_ERROR: 'Terjadi kesalahan yang tidak diketahui.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  ORDER_CREATED: 'Pesanan berhasil dibuat',
  ORDER_UPDATED: 'Pesanan berhasil diperbarui',
  ORDER_DELETED: 'Pesanan berhasil dihapus',
  CUSTOMER_CREATED: 'Pelanggan berhasil ditambahkan',
  CUSTOMER_UPDATED: 'Pelanggan berhasil diperbarui',
  CUSTOMER_DELETED: 'Pelanggan berhasil dihapus',
  MATERIAL_CREATED: 'Material berhasil ditambahkan',
  MATERIAL_UPDATED: 'Material berhasil diperbarui',
  MATERIAL_DELETED: 'Material berhasil dihapus',
  STOCK_ADJUSTED: 'Stok berhasil disesuaikan',
  TASK_CREATED: 'Tugas berhasil dibuat',
  TASK_UPDATED: 'Tugas berhasil diperbarui',
  TASK_DELETED: 'Tugas berhasil dihapus',
  INVOICE_CREATED: 'Invoice berhasil dibuat',
  INVOICE_SENT: 'Invoice berhasil dikirim',
  PAYMENT_RECORDED: 'Pembayaran berhasil dicatat',
  LOGIN_SUCCESS: 'Login berhasil',
  LOGOUT_SUCCESS: 'Logout berhasil',
  DATA_SYNCED: 'Data berhasil disinkronkan',
} as const;

// Validation Constants
export const VALIDATION = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MIN_DESCRIPTION_LENGTH: 3,
  MAX_DESCRIPTION_LENGTH: 500,
  MIN_PASSWORD_LENGTH: 8,
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 10000,
  MIN_PRICE: 0,
  MAX_PRICE: 1000000000, // 1 billion
  NPWP_LENGTH: 15,
  POSTAL_CODE_LENGTH: 5,
} as const;

// Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_INDONESIA: /^(\+62|62|0)[0-9]{9,13}$/,
  NPWP: /^\d{15}$/,
  POSTAL_CODE: /^\d{5}$/,
  ORDER_NUMBER: /^ORD-\d{4}-\d{5}$/,
  INVOICE_NUMBER: /^INV-\d{4}-\d{5}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  ALPHANUMERIC_WITH_DASH: /^[a-zA-Z0-9-]+$/,
} as const;

// Indonesian Business Constants
export const INDONESIAN_BUSINESS = {
  PPN_RATE: 11, // 11% VAT
  CURRENCY: 'IDR',
  CURRENCY_SYMBOL: 'Rp',
  COUNTRY_CODE: '+62',
  LOCALE: 'id-ID',
} as const;

// App Information
export const APP_INFO = {
  NAME: 'Cardose',
  FULL_NAME: 'Cardose - Premium Gift Box',
  VERSION: '1.0.0',
  COMPANY: 'Cardose',
  SUPPORT_EMAIL: 'support@cardose.com',
  SUPPORT_PHONE: '+62 xxx xxxx xxxx',
  WEBSITE: 'https://cardose.com',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@cardose:auth_token',
  USER_DATA: '@cardose:user_data',
  THEME_MODE: '@cardose:theme_mode',
  LANGUAGE: '@cardose:language',
  LAST_SYNC: '@cardose:last_sync',
  OFFLINE_QUEUE: '@cardose:offline_queue',
} as const;

// Screen Names
export const SCREENS = {
  // Auth
  LOGIN: 'Login',
  REGISTER: 'Register',

  // Main Tabs
  DASHBOARD: 'Dashboard',
  ORDERS: 'Orders',
  CUSTOMERS: 'Customers',
  INVENTORY: 'Inventory',
  PRODUCTION: 'Production',
  FINANCIAL: 'Financial',
  PROFILE: 'Profile',

  // Orders Stack
  ORDERS_LIST: 'OrdersList',
  ORDER_DETAILS: 'OrderDetails',
  CREATE_ORDER: 'CreateOrder',
  EDIT_ORDER: 'EditOrder',
  UPDATE_ORDER_STATUS: 'UpdateOrderStatus',

  // Customers Stack
  CUSTOMERS_LIST: 'CustomersList',
  CUSTOMER_DETAILS: 'CustomerDetails',
  CREATE_CUSTOMER: 'CreateCustomer',
  EDIT_CUSTOMER: 'EditCustomer',

  // Inventory Stack
  INVENTORY_LIST: 'InventoryList',
  MATERIAL_DETAILS: 'MaterialDetails',
  CREATE_MATERIAL: 'CreateMaterial',
  EDIT_MATERIAL: 'EditMaterial',

  // Production Stack
  PRODUCTION_LIST: 'ProductionList',
  TASK_DETAILS: 'TaskDetails',
  CREATE_TASK: 'CreateTask',
  EDIT_TASK: 'EditTask',

  // Financial Stack
  FINANCIAL_LIST: 'FinancialList',
  INVOICE_DETAILS: 'InvoiceDetails',
  CREATE_INVOICE: 'CreateInvoice',
  EDIT_INVOICE: 'EditInvoice',
  RECORD_PAYMENT: 'RecordPayment',
} as const;
