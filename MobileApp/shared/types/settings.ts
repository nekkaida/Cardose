export interface SettingData {
  value: string;
  description: string | null;
  is_protected?: boolean;
}

export type SettingsMap = Record<string, SettingData>;

export interface SettingsListResponse {
  success: boolean;
  settings: SettingsMap;
}

export interface UpdateSettingPayload {
  value: string;
  description?: string;
}

export type SettingType = 'text' | 'number' | 'boolean' | 'select' | 'currency';

export interface SettingMetadata {
  label: string;
  category: string;
  type: SettingType;
  options?: string[];
  min?: number;
  max?: number;
  unit?: string;
}

export const SETTING_REGISTRY: Record<string, SettingMetadata> = {
  business_name: {
    label: 'Business Name',
    category: 'business',
    type: 'text',
  },
  currency: {
    label: 'Currency',
    category: 'business',
    type: 'select',
    options: ['IDR', 'USD', 'EUR', 'SGD', 'MYR'],
  },
  tax_rate: {
    label: 'Tax Rate',
    category: 'tax',
    type: 'number',
    min: 0,
    max: 100,
    unit: '%',
  },
  default_markup: {
    label: 'Default Markup',
    category: 'pricing',
    type: 'number',
    min: 0,
    max: 1000,
    unit: '%',
  },
  backup_frequency: {
    label: 'Backup Frequency',
    category: 'system',
    type: 'number',
    min: 1,
    max: 24,
    unit: 'hours',
  },
  sync_enabled: {
    label: 'Auto Sync',
    category: 'system',
    type: 'boolean',
  },
} as const;

export const SETTING_CATEGORIES: Record<string, string> = {
  business: 'Business',
  tax: 'Tax & Compliance',
  pricing: 'Pricing',
  system: 'System',
  other: 'Other',
} as const;
