export type OrderStatus = 
  | 'pending'
  | 'designing' 
  | 'approved'
  | 'production'
  | 'quality_control'
  | 'completed'
  | 'cancelled';

export type BoxType = 'executive' | 'luxury' | 'custom';

export type BusinessType = 'individual' | 'corporate' | 'wedding' | 'event';

export interface OrderDimensions {
  width: number;
  height: number;
  depth: number;
  unit: 'cm' | 'mm' | 'inch';
}

export interface OrderPricing {
  material_cost: number;
  labor_cost: number;
  markup_percentage: number;
  total_price: number;
  currency: string;
  tax_rate?: number;
  discount_amount?: number;
}

export interface OrderSpecifications {
  box_type: BoxType;
  dimensions: OrderDimensions;
  materials: string[];
  colors: string[];
  special_requests?: string;
  design_files?: string[];
  reference_images?: string[];
  finishing_type?: string;
  quantity: number;
}

export interface OrderWorkflow {
  status: OrderStatus;
  estimated_completion: string;
  actual_completion?: string;
  priority_level: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to?: string;
  status_notes?: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_whatsapp?: string;
  
  // Specifications
  specifications: OrderSpecifications;
  
  // Pricing
  pricing: OrderPricing;
  
  // Workflow
  workflow: OrderWorkflow;
  
  // Additional fields for backward compatibility
  status: OrderStatus;
  box_type: BoxType;
  total_price: number;
  special_requests?: string;
  estimated_completion: string;
  actual_completion?: string;
  
  // Communication
  whatsapp_thread?: string;
  last_contact?: string;
  communication_notes?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Offline/sync support
  is_synced?: boolean;
  last_synced?: string;
}

export interface CreateOrderData {
  customer_id: string;
  specifications: OrderSpecifications;
  pricing: Omit<OrderPricing, 'total_price'>; // total_price will be calculated
  workflow: Partial<OrderWorkflow>;
  special_requests?: string;
  communication_notes?: string;
}

export interface UpdateOrderData {
  specifications?: Partial<OrderSpecifications>;
  pricing?: Partial<OrderPricing>;
  workflow?: Partial<OrderWorkflow>;
  customer_id?: string;
  special_requests?: string;
  communication_notes?: string;
}

export interface OrderStatusChange {
  id: string;
  order_id: string;
  from_status: OrderStatus;
  to_status: OrderStatus;
  changed_at: string;
  changed_by: string;
  notes?: string;
  reason?: string;
}

export interface OrderPhoto {
  id: string;
  order_id: string;
  type: 'design' | 'reference' | 'progress' | 'final' | 'packaging';
  url: string;
  caption?: string;
  uploaded_at: string;
  uploaded_by: string;
}

export interface OrderTask {
  id: string;
  order_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assigned_to?: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderComment {
  id: string;
  order_id: string;
  user_id: string;
  user_name: string;
  comment: string;
  type: 'note' | 'status_change' | 'customer_communication' | 'internal';
  created_at: string;
  edited_at?: string;
}

export interface OrderTimeline {
  id: string;
  order_id: string;
  event_type: 'created' | 'status_changed' | 'modified' | 'comment_added' | 'photo_uploaded' | 'task_completed';
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
  created_by: string;
}

// Order validation schemas
export interface OrderValidationRules {
  minDimensions: OrderDimensions;
  maxDimensions: OrderDimensions;
  requiredMaterials: string[];
  allowedColors: string[];
  maxSpecialRequestsLength: number;
  minLeadTimeDays: number;
  maxOrderValue: number;
}

// Order analytics types
export interface OrderAnalytics {
  period: {
    start: string;
    end: string;
  };
  totals: {
    orders: number;
    revenue: number;
    completed_orders: number;
    cancelled_orders: number;
  };
  averages: {
    order_value: number;
    completion_time_days: number;
    customer_satisfaction: number;
  };
  breakdown: {
    by_status: Record<OrderStatus, number>;
    by_box_type: Record<BoxType, number>;
    by_customer_type: Record<BusinessType, number>;
    by_month: Array<{
      month: string;
      orders: number;
      revenue: number;
    }>;
  };
  trends: {
    order_growth: number; // percentage
    revenue_growth: number; // percentage
    average_order_value_change: number; // percentage
  };
}

// Order search and filtering
export interface OrderFilters {
  status?: OrderStatus | OrderStatus[];
  box_type?: BoxType | BoxType[];
  customer_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
  price_range?: {
    min: number;
    max: number;
  };
  priority_level?: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to?: string;
  search_query?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'updated_at' | 'order_number' | 'total_price' | 'estimated_completion';
  sort_order?: 'asc' | 'desc';
}

export interface OrderSearchResult {
  orders: Order[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Export default order values
export const DEFAULT_ORDER_VALUES = {
  status: 'pending' as OrderStatus,
  box_type: 'custom' as BoxType,
  currency: 'IDR',
  markup_percentage: 100,
  priority_level: 'normal' as const,
  dimensions_unit: 'cm' as const,
  quantity: 1,
};

export const ORDER_STATUS_FLOW = [
  'pending',
  'designing', 
  'approved',
  'production',
  'quality_control',
  'completed'
] as const;

export const ORDER_STATUS_LABELS = {
  pending: 'Pending Review',
  designing: 'Design Phase',
  approved: 'Design Approved',
  production: 'In Production',
  quality_control: 'Quality Control',
  completed: 'Completed',
  cancelled: 'Cancelled'
} as const;