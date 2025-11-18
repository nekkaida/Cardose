export type BusinessType = 'individual' | 'corporate' | 'wedding' | 'event';
export type LoyaltyStatus = 'new' | 'regular' | 'vip';
export type PreferredContact = 'whatsapp' | 'email' | 'phone';

export interface CustomerAddress {
  street?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
}

export interface CustomerPreferences {
  preferred_materials?: string[];
  preferred_colors?: string[];
  budget_range?: {
    min: number;
    max: number;
  };
  communication_preference?: PreferredContact;
  delivery_preference?: string;
  special_notes?: string;
}

export interface CustomerMetrics {
  total_orders: number;
  total_value: number;
  average_order_value: number;
  last_order_date?: string;
  first_order_date?: string;
  lifetime_value: number;
  order_frequency_days?: number;
}

export interface Customer {
  id: string;

  // Personal Information
  name: string;
  email?: string;
  whatsapp?: string;
  phone?: string;
  address?: CustomerAddress;

  // Business Information
  type?: 'individual' | 'company'; // Alias for business_type for backward compatibility
  business_type: BusinessType;
  company_name?: string;
  industry?: string;
  tax_id?: string;
  contact_person?: string; // For company customers
  
  // Preferences
  preferences: CustomerPreferences;
  preferred_contact?: PreferredContact;
  
  // Relationship Management
  loyalty_status: LoyaltyStatus;
  referred_by?: string;
  referrals?: string[];
  
  // Analytics & Metrics
  metrics: CustomerMetrics;
  
  // Legacy fields for backward compatibility
  total_orders?: number;
  total_value?: number;
  average_order_value?: number;
  last_order_date?: string;
  preferred_materials?: string[];
  preferred_colors?: string[];
  
  // Communication & Notes
  notes?: string;
  tags?: string[];
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Offline/sync support
  is_synced?: boolean;
  last_synced?: string;
}

export interface CreateCustomerData {
  name: string;
  email?: string;
  whatsapp?: string;
  phone?: string;
  address?: CustomerAddress | string; // Allow string for simple address input
  type?: 'individual' | 'company'; // Backward compatibility
  business_type: BusinessType;
  company_name?: string;
  industry?: string;
  tax_id?: string;
  contact_person?: string;
  preferences?: Partial<CustomerPreferences>;
  preferred_contact?: PreferredContact;
  notes?: string;
  tags?: string[];
  referred_by?: string;
}

export interface UpdateCustomerData {
  name?: string;
  email?: string;
  whatsapp?: string;
  phone?: string;
  address?: Partial<CustomerAddress>;
  business_type?: BusinessType;
  company_name?: string;
  industry?: string;
  preferences?: Partial<CustomerPreferences>;
  preferred_contact?: PreferredContact;
  loyalty_status?: LoyaltyStatus;
  notes?: string;
  tags?: string[];
}

export interface CustomerCommunication {
  id: string;
  customer_id: string;
  type: 'whatsapp' | 'email' | 'phone' | 'meeting' | 'note';
  direction: 'incoming' | 'outgoing' | 'internal';
  subject?: string;
  content: string;
  order_id?: string;
  created_at: string;
  created_by: string;
  attachments?: string[];
}

export interface CustomerTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  created_at: string;
}

export interface CustomerAnalytics {
  customer_id: string;
  period: {
    start: string;
    end: string;
  };
  orders: {
    total: number;
    completed: number;
    cancelled: number;
    in_progress: number;
  };
  revenue: {
    total: number;
    average_per_order: number;
    growth_percentage: number;
  };
  behavior: {
    order_frequency_days: number;
    preferred_box_types: string[];
    seasonal_patterns: Record<string, number>;
    communication_response_rate: number;
  };
  satisfaction: {
    rating?: number;
    feedback_count: number;
    complaints_count: number;
    compliments_count: number;
  };
}

// Customer search and filtering
export interface CustomerFilters {
  business_type?: BusinessType | BusinessType[];
  loyalty_status?: LoyaltyStatus | LoyaltyStatus[];
  city?: string;
  province?: string;
  tags?: string[];
  order_count_range?: {
    min: number;
    max: number;
  };
  total_value_range?: {
    min: number;
    max: number;
  };
  last_order_date_range?: {
    start: string;
    end: string;
  };
  search_query?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'name' | 'created_at' | 'last_order_date' | 'total_value' | 'total_orders';
  sort_order?: 'asc' | 'desc';
}

export interface CustomerSearchResult {
  customers: Customer[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Customer segments for marketing and analysis
export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  criteria: CustomerFilters;
  customer_count: number;
  total_value: number;
  created_at: string;
  updated_at: string;
}

// Customer lifecycle stages
export type CustomerLifecycleStage = 
  | 'prospect'      // Inquired but hasn't ordered
  | 'new'          // First order completed
  | 'active'       // Regular orders (< 6 months since last order)
  | 'at_risk'      // No orders for 6-12 months
  | 'inactive'     // No orders for > 12 months
  | 'champion';    // High value, frequent orders

export interface CustomerLifecycle {
  customer_id: string;
  current_stage: CustomerLifecycleStage;
  stage_since: string;
  previous_stage?: CustomerLifecycleStage;
  stage_history: Array<{
    stage: CustomerLifecycleStage;
    start_date: string;
    end_date?: string;
    duration_days?: number;
  }>;
}

// Default values and constants
export const DEFAULT_CUSTOMER_VALUES = {
  business_type: 'individual' as BusinessType,
  loyalty_status: 'new' as LoyaltyStatus,
  preferred_contact: 'whatsapp' as PreferredContact,
  lifecycle_stage: 'prospect' as CustomerLifecycleStage,
};

export const BUSINESS_TYPE_LABELS = {
  individual: 'Individual',
  corporate: 'Corporate',
  wedding: 'Wedding',
  event: 'Event'
} as const;

export const LOYALTY_STATUS_LABELS = {
  new: 'New Customer',
  regular: 'Regular Customer', 
  vip: 'VIP Customer'
} as const;

export const PREFERRED_CONTACT_LABELS = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  phone: 'Phone Call'
} as const;

// Customer validation rules
export interface CustomerValidationRules {
  name: {
    minLength: number;
    maxLength: number;
    required: boolean;
  };
  email: {
    format: RegExp;
    required: boolean;
  };
  whatsapp: {
    format: RegExp;
    required: boolean;
  };
  phone: {
    format: RegExp;
    required: boolean;
  };
  company_name: {
    maxLength: number;
    required: boolean;
  };
}

export const CUSTOMER_VALIDATION_RULES: CustomerValidationRules = {
  name: {
    minLength: 2,
    maxLength: 100,
    required: true
  },
  email: {
    format: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    required: false
  },
  whatsapp: {
    format: /^(\+62|62|0)[0-9]{9,13}$/,
    required: false
  },
  phone: {
    format: /^(\+62|62|0)[0-9]{9,13}$/,
    required: false
  },
  company_name: {
    maxLength: 200,
    required: false
  }
};

// Customer metrics calculation helpers
export interface CustomerMetricsCalculation {
  calculateLifetimeValue: (orders: any[]) => number;
  calculateOrderFrequency: (orders: any[]) => number;
  calculateAverageOrderValue: (orders: any[]) => number;
  determineLifecycleStage: (customer: Customer, orders: any[]) => CustomerLifecycleStage;
  calculateLoyaltyStatus: (customer: Customer, orders: any[]) => LoyaltyStatus;
}