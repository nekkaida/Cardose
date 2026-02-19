export type OrderStatus =
  | 'pending'
  | 'designing'
  | 'approved'
  | 'production'
  | 'quality_control'
  | 'completed'
  | 'cancelled';

export type OrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export type BoxType = 'standard' | 'premium' | 'luxury' | 'custom';

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name?: string;
  status: OrderStatus;
  priority: OrderPriority;
  box_type: BoxType;
  total_amount: number;
  notes?: string;
  deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface OrdersListResponse {
  success: boolean;
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrderStatsResponse {
  success: boolean;
  stats: {
    total: number;
    pending: number;
    designing: number;
    production: number;
    completed: number;
    cancelled: number;
  };
}
