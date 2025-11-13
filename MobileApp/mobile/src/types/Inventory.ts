export type InventoryCategory = 
  | 'cardboard' 
  | 'fabric' 
  | 'ribbon' 
  | 'accessories' 
  | 'packaging' 
  | 'tools';

export type StockLevel = 
  | 'out_of_stock' 
  | 'critical' 
  | 'low' 
  | 'adequate' 
  | 'high';

export type MovementType = 
  | 'purchase'     // Stock added from purchase
  | 'usage'        // Stock used in production
  | 'sale'         // Stock sold directly
  | 'adjustment'   // Manual stock adjustment
  | 'waste'        // Stock lost due to damage/expiry
  | 'return';      // Stock returned from customer

export interface InventoryItem {
  id: string;
  
  // Basic Information
  name: string;
  description?: string;
  category: InventoryCategory;
  sku?: string; // Stock Keeping Unit
  
  // Stock Information
  current_stock: number;
  reorder_level: number;
  max_stock_level?: number;
  unit: string; // pcs, meters, kg, etc.
  stock_level: StockLevel; // Calculated field
  
  // Cost Information
  unit_cost: number;
  total_value: number; // Calculated: current_stock * unit_cost
  currency: string;
  
  // Supplier Information
  supplier?: string;
  supplier_contact?: string;
  supplier_email?: string;
  lead_time_days?: number;
  minimum_order_quantity?: number;
  
  // Physical Properties
  weight_per_unit?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit: 'cm' | 'mm' | 'inch';
  };
  color?: string;
  material_grade?: string;
  
  // Tracking Information
  location?: string; // Storage location
  batch_number?: string;
  expiry_date?: string;
  last_restocked?: string;
  last_used?: string;
  
  // Usage Analytics
  monthly_usage?: number;
  average_usage_per_order?: number;
  usage_trend?: 'increasing' | 'stable' | 'decreasing';
  
  // Business Rules
  is_active: boolean;
  is_consumable: boolean; // True for materials that get used up
  requires_quality_check: boolean;
  
  // Notes and Tags
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

export interface CreateInventoryItemData {
  name: string;
  description?: string;
  category: InventoryCategory;
  sku?: string;
  current_stock: number;
  reorder_level: number;
  max_stock_level?: number;
  unit: string;
  unit_cost: number;
  supplier?: string;
  supplier_contact?: string;
  lead_time_days?: number;
  minimum_order_quantity?: number;
  weight_per_unit?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit: 'cm' | 'mm' | 'inch';
  };
  color?: string;
  material_grade?: string;
  location?: string;
  batch_number?: string;
  expiry_date?: string;
  is_consumable?: boolean;
  requires_quality_check?: boolean;
  notes?: string;
  tags?: string[];
}

export interface UpdateInventoryItemData {
  name?: string;
  description?: string;
  category?: InventoryCategory;
  sku?: string;
  reorder_level?: number;
  max_stock_level?: number;
  unit?: string;
  unit_cost?: number;
  supplier?: string;
  supplier_contact?: string;
  lead_time_days?: number;
  minimum_order_quantity?: number;
  weight_per_unit?: number;
  dimensions?: Partial<{
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'mm' | 'inch';
  }>;
  color?: string;
  material_grade?: string;
  location?: string;
  batch_number?: string;
  expiry_date?: string;
  is_active?: boolean;
  is_consumable?: boolean;
  requires_quality_check?: boolean;
  notes?: string;
  tags?: string[];
}

export interface StockMovement {
  id: string;
  inventory_item_id: string;
  type: MovementType;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  
  // Reference Information
  order_id?: string; // If related to an order
  purchase_order_id?: string; // If related to a purchase
  supplier_id?: string;
  
  // Movement Details
  reason: string;
  notes?: string;
  batch_number?: string;
  expiry_date?: string;
  
  // Quality Information
  quality_checked?: boolean;
  quality_status?: 'approved' | 'rejected' | 'pending';
  quality_notes?: string;
  
  // Metadata
  created_at: string;
  created_by: string;
  
  // Offline/sync support
  is_synced?: boolean;
}

export interface StockAdjustmentData {
  inventory_item_id: string;
  type: 'add' | 'remove';
  quantity: number;
  reason: string;
  notes?: string;
  unit_cost?: number;
  batch_number?: string;
  expiry_date?: string;
}

export interface ReorderAlert {
  id: string;
  inventory_item_id: string;
  item_name: string;
  current_stock: number;
  reorder_level: number;
  suggested_quantity: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'ordered' | 'resolved';
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  supplier_contact?: string;
  status: 'draft' | 'sent' | 'confirmed' | 'partial_received' | 'completed' | 'cancelled';
  
  items: Array<{
    inventory_item_id: string;
    item_name: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
    received_quantity?: number;
  }>;
  
  totals: {
    subtotal: number;
    tax_amount: number;
    shipping_cost: number;
    total_amount: number;
  };
  
  dates: {
    order_date: string;
    expected_delivery: string;
    actual_delivery?: string;
  };
  
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// Inventory analytics and reporting
export interface InventoryAnalytics {
  period: {
    start: string;
    end: string;
  };
  
  summary: {
    total_items: number;
    total_value: number;
    low_stock_items: number;
    out_of_stock_items: number;
    total_movements: number;
  };
  
  by_category: Record<InventoryCategory, {
    item_count: number;
    total_value: number;
    low_stock_count: number;
    usage_value: number;
  }>;
  
  movements: {
    purchases: {
      count: number;
      total_cost: number;
      average_cost: number;
    };
    usage: {
      count: number;
      total_value: number;
      average_value: number;
    };
    adjustments: {
      count: number;
      net_value: number;
    };
  };
  
  turnover: {
    fast_moving: InventoryItem[];
    slow_moving: InventoryItem[];
    average_turnover_days: number;
  };
  
  trends: {
    stock_value_change: number; // percentage
    usage_trend: 'increasing' | 'stable' | 'decreasing';
    reorder_frequency: number; // per month
  };
}

// Inventory filters for search and reporting
export interface InventoryFilters {
  category?: InventoryCategory | InventoryCategory[];
  stock_level?: StockLevel | StockLevel[];
  supplier?: string;
  location?: string;
  is_active?: boolean;
  needs_reorder?: boolean;
  tags?: string[];
  
  stock_range?: {
    min: number;
    max: number;
  };
  
  value_range?: {
    min: number;
    max: number;
  };
  
  last_used_range?: {
    start: string;
    end: string;
  };
  
  search_query?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'name' | 'current_stock' | 'total_value' | 'last_restocked' | 'usage_frequency';
  sort_order?: 'asc' | 'desc';
}

// Default values and constants
export const DEFAULT_INVENTORY_VALUES = {
  category: 'cardboard' as InventoryCategory,
  unit: 'pcs',
  currency: 'IDR',
  is_active: true,
  is_consumable: true,
  requires_quality_check: false,
  reorder_level: 10,
};

export const CATEGORY_LABELS = {
  cardboard: 'Cardboard & Paper',
  fabric: 'Fabric & Textile',
  ribbon: 'Ribbons & Decorations',
  accessories: 'Accessories & Hardware',
  packaging: 'Packaging Materials',
  tools: 'Tools & Equipment'
} as const;

export const STOCK_LEVEL_THRESHOLDS = {
  out_of_stock: 0,
  critical: 0.1,   // 10% of reorder level
  low: 0.5,        // 50% of reorder level
  adequate: 1.0,   // At reorder level
  high: 2.0        // 200% of reorder level
};

export const MOVEMENT_TYPE_LABELS = {
  purchase: 'Purchase',
  usage: 'Production Usage',
  sale: 'Direct Sale',
  adjustment: 'Stock Adjustment',
  waste: 'Waste/Damage',
  return: 'Customer Return'
} as const;

// Common units for different categories
export const COMMON_UNITS = {
  cardboard: ['sheets', 'pcs', 'kg', 'm²'],
  fabric: ['meters', 'yards', 'kg', 'pcs'],
  ribbon: ['meters', 'yards', 'rolls', 'pcs'],
  accessories: ['pcs', 'sets', 'pairs', 'kg'],
  packaging: ['pcs', 'boxes', 'rolls', 'kg'],
  tools: ['pcs', 'sets', 'units']
};

// Material properties for common inventory items
export const MATERIAL_GRADES = {
  cardboard: ['Standard', 'Premium', 'Luxury', 'Eco-friendly', 'Corrugated'],
  fabric: ['Cotton', 'Silk', 'Polyester', 'Linen', 'Velvet', 'Satin'],
  ribbon: ['Satin', 'Grosgrain', 'Organza', 'Velvet', 'Metallic'],
  accessories: ['Metal', 'Plastic', 'Wood', 'Crystal', 'Ceramic'],
};

// Validation rules
export interface InventoryValidationRules {
  name: { minLength: number; maxLength: number; required: boolean };
  current_stock: { min: number; required: boolean };
  reorder_level: { min: number; required: boolean };
  unit_cost: { min: number; required: boolean };
}

export const INVENTORY_VALIDATION_RULES: InventoryValidationRules = {
  name: { minLength: 2, maxLength: 100, required: true },
  current_stock: { min: 0, required: true },
  reorder_level: { min: 0, required: true },
  unit_cost: { min: 0, required: true },
};