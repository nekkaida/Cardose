export type ProductionStage = 
  | 'design_review'
  | 'material_preparation'
  | 'cutting'
  | 'assembly'
  | 'finishing'
  | 'quality_control'
  | 'packaging'
  | 'ready_for_delivery';

export type TaskStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'cancelled';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export type QualityStatus = 'pending' | 'passed' | 'failed' | 'needs_rework';

export interface ProductionTask {
  id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  
  // Task Details
  stage: ProductionStage;
  title: string;
  description: string;
  instructions?: string;
  
  // Scheduling
  priority: TaskPriority;
  estimated_duration: number; // in minutes
  actual_duration?: number;
  due_date: string;
  
  // Assignment
  assigned_to?: string;
  assigned_by?: string;
  assigned_at?: string;
  
  // Progress
  status: TaskStatus;
  progress_percentage: number;
  
  // Dependencies
  depends_on: string[]; // Task IDs that must be completed first
  blocks: string[]; // Task IDs that depend on this task
  
  // Quality Control
  quality_checks: QualityCheck[];
  requires_approval: boolean;
  approved_by?: string;
  approved_at?: string;
  
  // Resources
  required_materials: ProductionMaterial[];
  required_tools: string[];
  workspace: string;
  
  // Documentation
  photos: ProductionPhoto[];
  notes: string;
  completion_notes?: string;
  
  // Timing
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  
  // Offline/sync support
  is_synced?: boolean;
}

export interface ProductionMaterial {
  inventory_item_id: string;
  item_name: string;
  quantity_needed: number;
  quantity_allocated: number;
  unit: string;
  is_available: boolean;
}

export interface QualityCheck {
  id: string;
  check_point: string;
  description: string;
  status: QualityStatus;
  checked_by?: string;
  checked_at?: string;
  notes?: string;
  photos?: string[];
  rework_required?: boolean;
  rework_notes?: string;
}

export interface ProductionPhoto {
  id: string;
  type: 'progress' | 'issue' | 'quality' | 'completion' | 'reference';
  url: string;
  caption?: string;
  stage: ProductionStage;
  uploaded_at: string;
  uploaded_by: string;
}

export interface ProductionWorkflow {
  id: string;
  order_id: string;
  workflow_template: string;
  
  // Overall Status
  current_stage: ProductionStage;
  overall_progress: number; // 0-100%
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  
  // Timing
  planned_start_date: string;
  actual_start_date?: string;
  planned_completion_date: string;
  estimated_completion_date?: string;
  actual_completion_date?: string;
  
  // Resources
  total_estimated_hours: number;
  actual_hours_spent: number;
  assigned_team_members: string[];
  
  // Stages Progress
  stages: ProductionStageProgress[];
  
  // Issues and Delays
  issues: ProductionIssue[];
  delays: ProductionDelay[];
  
  // Quality Summary
  quality_score?: number;
  quality_notes?: string;
  
  // Timeline
  created_at: string;
  updated_at: string;
}

export interface ProductionStageProgress {
  stage: ProductionStage;
  status: TaskStatus;
  progress_percentage: number;
  estimated_hours: number;
  actual_hours: number;
  started_at?: string;
  completed_at?: string;
  assigned_to?: string;
  notes?: string;
}

export interface ProductionIssue {
  id: string;
  order_id: string;
  task_id?: string;
  stage: ProductionStage;
  
  // Issue Details
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'material' | 'quality' | 'equipment' | 'design' | 'other';
  
  // Resolution
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolution?: string;
  resolved_by?: string;
  resolved_at?: string;
  
  // Impact
  causes_delay: boolean;
  estimated_delay_hours?: number;
  affects_quality: boolean;
  requires_rework: boolean;
  
  // Documentation
  photos: string[];
  
  // Timeline
  reported_by: string;
  reported_at: string;
  updated_at: string;
}

export interface ProductionDelay {
  id: string;
  order_id: string;
  task_id?: string;
  
  // Delay Details
  reason: string;
  category: 'material_shortage' | 'equipment_failure' | 'quality_issue' | 'design_change' | 'resource_unavailable' | 'other';
  duration_hours: number;
  
  // Impact
  affects_delivery: boolean;
  new_estimated_completion?: string;
  customer_notified: boolean;
  customer_approved_delay: boolean;
  
  // Timeline
  delay_start: string;
  delay_end?: string;
  reported_by: string;
  created_at: string;
}

export interface ProductionTeamMember {
  id: string;
  name: string;
  role: 'designer' | 'cutter' | 'assembler' | 'finisher' | 'quality_controller' | 'manager';
  skills: string[];
  hourly_rate: number;
  availability: TeamAvailability[];
  current_tasks: string[]; // Task IDs
  performance_rating: number; // 1-5
  is_active: boolean;
}

export interface TeamAvailability {
  date: string;
  available_hours: number;
  allocated_hours: number;
  remaining_hours: number;
  notes?: string;
}

export interface ProductionSchedule {
  id: string;
  date: string;
  
  // Daily Overview
  total_capacity_hours: number;
  allocated_hours: number;
  remaining_capacity: number;
  
  // Tasks
  scheduled_tasks: ScheduledTask[];
  
  // Team
  available_team_members: string[];
  team_capacity: Record<string, number>; // member_id -> available_hours
  
  // Resources
  workspace_allocation: WorkspaceAllocation[];
  equipment_allocation: EquipmentAllocation[];
  
  created_at: string;
  updated_at: string;
}

export interface ScheduledTask {
  task_id: string;
  assigned_to: string;
  start_time: string;
  end_time: string;
  workspace: string;
  equipment_needed: string[];
  materials_prepared: boolean;
}

export interface WorkspaceAllocation {
  workspace_id: string;
  workspace_name: string;
  allocated_to_task: string;
  allocated_from: string;
  allocated_until: string;
}

export interface EquipmentAllocation {
  equipment_id: string;
  equipment_name: string;
  allocated_to_task: string;
  allocated_from: string;
  allocated_until: string;
}

// Analytics and reporting
export interface ProductionAnalytics {
  period: {
    start: string;
    end: string;
  };
  
  // Performance Metrics
  completed_orders: number;
  average_completion_time: number; // in days
  on_time_delivery_rate: number; // percentage
  quality_score_average: number;
  
  // Efficiency
  planned_vs_actual_hours: {
    planned: number;
    actual: number;
    efficiency_percentage: number;
  };
  
  // Stage Performance
  stage_performance: Record<ProductionStage, {
    average_duration: number;
    completion_rate: number;
    quality_issues: number;
  }>;
  
  // Team Performance
  team_performance: Array<{
    member_id: string;
    member_name: string;
    tasks_completed: number;
    average_quality_score: number;
    efficiency_rating: number;
    total_hours: number;
  }>;
  
  // Issues and Delays
  common_issues: Array<{
    category: string;
    count: number;
    average_resolution_time: number;
  }>;
  
  // Bottlenecks
  bottlenecks: Array<{
    stage: ProductionStage;
    average_queue_time: number;
    capacity_utilization: number;
  }>;
}

// Templates and configurations
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  box_type: string;
  complexity_level: 'simple' | 'moderate' | 'complex' | 'premium';
  
  // Template Stages
  stages: WorkflowStageTemplate[];
  
  // Estimated Times
  total_estimated_hours: number;
  estimated_days: number;
  
  // Quality Requirements
  quality_checkpoints: QualityCheckTemplate[];
  
  // Resource Requirements
  required_skills: string[];
  required_equipment: string[];
  workspace_requirements: string[];
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStageTemplate {
  stage: ProductionStage;
  order: number;
  title: string;
  description: string;
  estimated_hours: number;
  required_skills: string[];
  required_materials: string[];
  quality_checks: string[];
  is_parallel: boolean; // Can be done simultaneously with other stages
  dependencies: ProductionStage[];
}

export interface QualityCheckTemplate {
  id: string;
  stage: ProductionStage;
  check_point: string;
  description: string;
  is_mandatory: boolean;
  pass_criteria: string;
  failure_actions: string[];
}

// Filters and search
export interface ProductionFilters {
  order_id?: string;
  stage?: ProductionStage | ProductionStage[];
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  assigned_to?: string;
  due_date_range?: {
    start: string;
    end: string;
  };
  requires_approval?: boolean;
  has_issues?: boolean;
  quality_status?: QualityStatus;
  search_query?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'due_date' | 'priority' | 'created_at' | 'progress';
  sort_order?: 'asc' | 'desc';
}

// Default values and constants
export const DEFAULT_PRODUCTION_VALUES = {
  priority: 'normal' as TaskPriority,
  progress_percentage: 0,
  requires_approval: false,
  estimated_duration: 120, // 2 hours default
};

export const PRODUCTION_STAGE_LABELS = {
  design_review: 'Design Review',
  material_preparation: 'Material Preparation',
  cutting: 'Cutting',
  assembly: 'Assembly',
  finishing: 'Finishing',
  quality_control: 'Quality Control',
  packaging: 'Packaging',
  ready_for_delivery: 'Ready for Delivery'
} as const;

export const TASK_STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  blocked: 'Blocked',
  cancelled: 'Cancelled'
} as const;

export const PRIORITY_LABELS = {
  low: 'Low Priority',
  normal: 'Normal Priority',
  high: 'High Priority',
  urgent: 'Urgent'
} as const;

export const STAGE_WORKFLOW_ORDER = [
  'design_review',
  'material_preparation',
  'cutting',
  'assembly',
  'finishing',
  'quality_control',
  'packaging',
  'ready_for_delivery'
] as const;

// Validation rules
export interface ProductionValidationRules {
  title: { minLength: number; maxLength: number; required: boolean };
  estimated_duration: { min: number; max: number; required: boolean };
  due_date: { required: boolean };
}

export const PRODUCTION_VALIDATION_RULES: ProductionValidationRules = {
  title: { minLength: 3, maxLength: 100, required: true },
  estimated_duration: { min: 15, max: 480, required: true }, // 15 minutes to 8 hours
  due_date: { required: true },
};