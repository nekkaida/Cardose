export type TransactionType = 'income' | 'expense';

export type TransactionCategory = 
  // Income categories
  | 'order_payment'
  | 'deposit'
  | 'refund_received'
  | 'other_income'
  // Expense categories
  | 'materials'
  | 'labor'
  | 'overhead'
  | 'equipment'
  | 'marketing'
  | 'utilities'
  | 'rent'
  | 'transport'
  | 'other_expense';

export type PaymentMethod = 
  | 'cash'
  | 'bank_transfer'
  | 'credit_card'
  | 'mobile_payment'
  | 'check'
  | 'other';

export type PaymentStatus = 
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export interface FinancialTransaction {
  id: string;
  
  // Basic Information
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  currency: string;
  description: string;
  
  // Reference Information
  order_id?: string;
  customer_id?: string;
  supplier_id?: string;
  invoice_number?: string;
  reference_number?: string;
  
  // Payment Information
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_date?: string;
  due_date?: string;
  
  // Banking/Accounting
  account_number?: string;
  bank_name?: string;
  tax_amount?: number;
  tax_rate?: number;
  gross_amount?: number; // Before tax
  net_amount: number;    // After tax
  
  // Business Context
  project_code?: string;
  cost_center?: string;
  tags?: string[];
  
  // Metadata
  notes?: string;
  attachments?: string[]; // File paths/URLs
  
  // Tracking
  created_at: string;
  updated_at: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  
  // Offline/sync support
  is_synced?: boolean;
  last_synced?: string;
}

export interface CreateTransactionData {
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string;
  order_id?: string;
  customer_id?: string;
  supplier_id?: string;
  payment_method: PaymentMethod;
  payment_status?: PaymentStatus;
  payment_date?: string;
  due_date?: string;
  tax_rate?: number;
  notes?: string;
  tags?: string[];
}

export interface UpdateTransactionData {
  category?: TransactionCategory;
  amount?: number;
  description?: string;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  payment_date?: string;
  due_date?: string;
  tax_rate?: number;
  notes?: string;
  tags?: string[];
}

// Invoice management
export interface Invoice {
  id: string;
  invoice_number: string;
  
  // Customer Information
  customer_id: string;
  customer_name: string;
  customer_address: string;
  customer_email?: string;
  
  // Order Information
  order_id?: string;
  order_number?: string;
  
  // Invoice Items
  items: InvoiceItem[];
  
  // Pricing
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount?: number;
  discount_percentage?: number;
  total_amount: number;
  currency: string;
  
  // Terms
  payment_terms: string; // e.g., "Net 30", "Due on receipt"
  due_date: string;
  
  // Status
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  
  // Dates
  issue_date: string;
  paid_date?: string;
  
  // Payment Information
  payment_method?: PaymentMethod;
  payment_reference?: string;
  
  // Notes
  notes?: string;
  terms_and_conditions?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  
  // Product/Service Details
  product_id?: string;
  sku?: string;
  unit: string;
  
  // Tax
  tax_rate?: number;
  tax_amount?: number;
}

// Pricing and cost calculation
export interface PricingCalculation {
  id: string;
  
  // Order Specifications
  box_type: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
    unit: string;
  };
  quantity: number;
  materials: string[];
  colors: string[];
  finishing_type?: string;
  complexity_level: 'simple' | 'moderate' | 'complex' | 'premium';
  
  // Cost Breakdown
  material_costs: {
    cardboard: number;
    fabric: number;
    ribbons: number;
    accessories: number;
    other: number;
    total: number;
  };
  
  labor_costs: {
    design_time: number;
    production_time: number;
    finishing_time: number;
    hourly_rate: number;
    total: number;
  };
  
  overhead_costs: {
    equipment: number;
    utilities: number;
    workspace: number;
    packaging: number;
    total: number;
  };
  
  // Pricing Strategy
  cost_total: number;
  markup_percentage: number;
  markup_amount: number;
  
  // Final Pricing
  base_price: number;
  tax_rate: number;
  tax_amount: number;
  final_price: number;
  
  // Profit Analysis
  profit_amount: number;
  profit_margin: number;
  
  // Competitive Analysis
  market_price_range?: {
    min: number;
    max: number;
    average: number;
  };
  
  // Metadata
  calculated_at: string;
  calculated_by: string;
  notes?: string;
}

// Financial analytics and reporting
export interface FinancialSummary {
  period: {
    start: string;
    end: string;
    type: 'week' | 'month' | 'quarter' | 'year';
  };
  
  revenue: {
    total: number;
    from_orders: number;
    other_income: number;
    growth_percentage: number; // Compared to previous period
  };
  
  expenses: {
    total: number;
    by_category: Record<string, number>;
    growth_percentage: number;
  };
  
  expense_breakdown: {
    materials: number;
    labor: number;
    overhead: number;
    other: number;
  };
  
  profit: {
    gross: number;
    net: number;
    margin: number; // Percentage
  };
  
  orders: {
    completed: number;
    total_value: number;
    average_value: number;
  };
  
  cash_flow: {
    opening_balance: number;
    closing_balance: number;
    net_change: number;
  };
  
  outstanding: {
    receivables: number; // Money owed to us
    payables: number;    // Money we owe
    overdue_invoices: number;
  };
}

export interface RevenueAnalytics {
  monthly_trend: Array<{
    month: string;
    revenue: number;
    orders: number;
    average_order_value: number;
  }>;
  
  revenue_by_source: {
    individual_customers: number;
    corporate_clients: number;
    wedding_events: number;
    other_events: number;
  };
  
  top_customers: Array<{
    customer_id: string;
    customer_name: string;
    revenue: number;
    orders: number;
  }>;
  
  seasonal_patterns: {
    q1: number; // Jan-Mar
    q2: number; // Apr-Jun
    q3: number; // Jul-Sep
    q4: number; // Oct-Dec
  };
  
  profitability: {
    most_profitable_products: Array<{
      product_type: string;
      revenue: number;
      profit_margin: number;
    }>;
    
    least_profitable_products: Array<{
      product_type: string;
      revenue: number;
      profit_margin: number;
    }>;
  };
}

// Budget planning and tracking
export interface Budget {
  id: string;
  name: string;
  period: {
    start: string;
    end: string;
    type: 'monthly' | 'quarterly' | 'yearly';
  };
  
  revenue_targets: {
    total_target: number;
    monthly_breakdown: number[];
  };
  
  expense_budgets: Record<TransactionCategory, {
    budgeted_amount: number;
    actual_amount: number;
    variance: number;
    variance_percentage: number;
  }>;
  
  profit_targets: {
    gross_profit_target: number;
    net_profit_target: number;
    margin_target: number;
  };
  
  status: 'draft' | 'approved' | 'active' | 'completed';
  
  created_at: string;
  updated_at: string;
  created_by: string;
  approved_by?: string;
}

// Tax management
export interface TaxConfiguration {
  id: string;
  tax_name: string; // e.g., "PPN", "VAT"
  tax_rate: number; // Percentage
  
  // Applicability
  applies_to_income: boolean;
  applies_to_expenses: boolean;
  
  // Categories
  applicable_categories: TransactionCategory[];
  exempt_categories: TransactionCategory[];
  
  // Calculation
  calculation_method: 'inclusive' | 'exclusive';
  rounding_method: 'round' | 'floor' | 'ceiling';
  
  // Compliance
  tax_id_required: boolean;
  report_frequency: 'monthly' | 'quarterly' | 'yearly';
  
  // Status
  is_active: boolean;
  effective_from: string;
  effective_until?: string;
  
  created_at: string;
  updated_at: string;
}

// Financial filters and search
export interface FinancialFilters {
  transaction_type?: TransactionType | TransactionType[];
  category?: TransactionCategory | TransactionCategory[];
  payment_method?: PaymentMethod | PaymentMethod[];
  payment_status?: PaymentStatus | PaymentStatus[];
  
  amount_range?: {
    min: number;
    max: number;
  };
  
  date_range?: {
    start: string;
    end: string;
  };
  
  customer_id?: string;
  order_id?: string;
  tags?: string[];
  
  search_query?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'amount' | 'payment_date' | 'description';
  sort_order?: 'asc' | 'desc';
}

// Default values and constants
export const DEFAULT_FINANCIAL_VALUES = {
  currency: 'IDR',
  tax_rate: 11, // PPN Indonesia
  payment_method: 'cash' as PaymentMethod,
  payment_status: 'completed' as PaymentStatus,
  markup_percentage: 100,
  payment_terms: 'Due on receipt',
};

export const TRANSACTION_CATEGORY_LABELS = {
  // Income
  order_payment: 'Order Payment',
  deposit: 'Customer Deposit',
  refund_received: 'Refund Received',
  other_income: 'Other Income',
  
  // Expenses
  materials: 'Materials',
  labor: 'Labor Costs',
  overhead: 'Overhead',
  equipment: 'Equipment',
  marketing: 'Marketing',
  utilities: 'Utilities',
  rent: 'Rent',
  transport: 'Transportation',
  other_expense: 'Other Expenses',
} as const;

export const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  credit_card: 'Credit Card',
  mobile_payment: 'Mobile Payment',
  check: 'Check',
  other: 'Other',
} as const;

export const PAYMENT_STATUS_LABELS = {
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
} as const;

// Validation rules
export interface FinancialValidationRules {
  amount: { min: number; required: boolean };
  description: { minLength: number; maxLength: number; required: boolean };
  tax_rate: { min: number; max: number };
}

export const FINANCIAL_VALIDATION_RULES: FinancialValidationRules = {
  amount: { min: 0, required: true },
  description: { minLength: 3, maxLength: 200, required: true },
  tax_rate: { min: 0, max: 100 },
};