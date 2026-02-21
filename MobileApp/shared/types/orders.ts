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
  customer_name?: string | null;
  status: OrderStatus;
  priority: OrderPriority;
  box_type?: BoxType | null;
  total_amount: number;
  notes?: string | null;
  due_date?: string | null;
  special_requests?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface OrderStage {
  id: string;
  order_id: string;
  stage: OrderStatus;
  notes: string;
  created_at: string;
}

export interface OrderWithStages extends Order {
  stages: OrderStage[];
}

export interface OrderStats {
  total: number;
  pending: number;
  designing: number;
  approved: number;
  production: number;
  quality_control: number;
  completed: number;
  cancelled: number;
  totalValue: number;
  overdue: number;
}

export interface OrdersListResponse {
  success: boolean;
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: OrderStats;
}

export interface OrderStatsResponse {
  success: boolean;
  stats: OrderStats & {
    byStatus: Record<OrderStatus, number>;
    byPriority: Record<OrderPriority, number>;
  };
}

export interface OrderCreatePayload {
  customer_id: string;
  priority?: OrderPriority;
  total_amount?: number;
  due_date?: string;
  box_type?: BoxType;
  special_requests?: string;
  notes?: string;
}

export interface OrderUpdatePayload {
  status?: OrderStatus;
  priority?: OrderPriority;
  total_amount?: number;
  due_date?: string;
  box_type?: BoxType;
  special_requests?: string;
  notes?: string;
}
