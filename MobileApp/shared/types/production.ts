export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

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

export interface ProductionBoardResponse {
  success: boolean;
  board: {
    pending: ProductionTask[];
    in_progress: ProductionTask[];
    completed: ProductionTask[];
  };
}

export interface ProductionStatsResponse {
  success: boolean;
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    completedToday: number;
  };
}
