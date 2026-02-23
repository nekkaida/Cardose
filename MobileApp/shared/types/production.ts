export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type ProductionStage =
  | 'pending'
  | 'designing'
  | 'approved'
  | 'production'
  | 'quality_control';

export interface ProductionTask {
  id: string;
  order_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: string;
  assigned_to?: string;
  assigned_name?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

/** An order as returned by the production board endpoint. */
export interface ProductionOrder {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  priority: string;
  due_date: string;
  total_amount: number;
  updated_at?: string;
  notes?: string | null;
  special_requests?: string | null;
  stage_entered_at?: string | null;
}

export interface StageDistribution {
  pending: number;
  designing: number;
  approved: number;
  production: number;
  quality_control: number;
  completed?: number;
}

export interface ProductionStats {
  active_orders: number;
  completed_today: number;
  pending_approval: number;
  quality_issues: number;
  overdue_orders: number;
  stage_distribution: StageDistribution;
}

export interface ProductionBoardResponse {
  success: boolean;
  board: Record<string, ProductionOrder[]>;
  totalActive: number;
}

export interface ProductionStatsResponse {
  success: boolean;
  stats: ProductionStats;
}
