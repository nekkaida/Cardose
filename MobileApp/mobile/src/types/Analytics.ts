export type PeriodType = 'week' | 'month' | 'quarter' | 'year';

export type MetricTrend = 'increasing' | 'decreasing' | 'stable';

export type ReportType = 
  | 'sales'
  | 'customer'
  | 'inventory'
  | 'financial'
  | 'production'
  | 'communication'
  | 'comprehensive';

export interface BusinessAnalytics {
  period: {
    start: string;
    end: string;
    type: PeriodType;
  };
  
  // Order Analytics
  orders: {
    total: number;
    completed: number;
    pending: number;
    in_progress: number;
    cancelled: number;
    
    // Growth metrics
    growth_percentage: number;
    completion_rate: number;
    cancellation_rate: number;
    
    // Value metrics
    total_value: number;
    average_order_value: number;
    largest_order_value: number;
    
    // Timing metrics
    average_completion_time: number; // in days
    fastest_completion_time: number;
    slowest_completion_time: number;
    
    // Status breakdown
    by_status: Record<string, number>;
    
    // Box type breakdown
    by_box_type: Record<string, {
      count: number;
      revenue: number;
      average_value: number;
    }>;
    
    // Trends
    daily_orders: Array<{
      date: string;
      count: number;
      value: number;
    }>;
  };
  
  // Customer Analytics
  customers: {
    total: number;
    new_customers: number;
    active: number;
    inactive: number;
    
    // Growth metrics
    growth_percentage: number;
    retention_rate: number;
    churn_rate: number;
    
    // Segmentation
    by_business_type: Record<string, number>;
    by_loyalty: Record<string, number>;
    by_location: Record<string, number>;
    
    // Value metrics
    lifetime_value_average: number;
    highest_value_customer: {
      customer_id: string;
      customer_name: string;
      total_value: number;
      order_count: number;
    };
    
    // Engagement
    most_active_customers: Array<{
      customer_id: string;
      customer_name: string;
      order_count: number;
      total_value: number;
      last_order_date: string;
    }>;
    
    // Acquisition
    acquisition_channels: Record<string, number>;
    referral_rate: number;
  };
  
  // Financial Analytics
  financial: {
    revenue: {
      total: number;
      growth_percentage: number;
      monthly_target?: number;
      target_achievement_percentage?: number;
    };
    
    expenses: {
      total: number;
      by_category: Record<string, number>;
      growth_percentage: number;
    };
    
    profit: {
      gross: number;
      net: number;
      margin: number;
      margin_change: number;
    };
    
    cash_flow: {
      opening_balance: number;
      closing_balance: number;
      net_change: number;
      operating_cash_flow: number;
    };
    
    // Trends
    revenue_trend: Array<{
      period: string;
      revenue: number;
      expenses: number;
      profit: number;
    }>;
    
    // Profitability analysis
    most_profitable_products: Array<{
      product_type: string;
      revenue: number;
      profit_margin: number;
      order_count: number;
    }>;
    
    payment_methods: Record<string, {
      count: number;
      total_value: number;
      percentage: number;
    }>;
  };
  
  // Production Analytics
  production: {
    orders_in_production: number;
    completed_orders: number;
    
    // Performance metrics
    on_time_delivery_rate: number;
    average_completion_time: number;
    quality_score_average: number;
    
    // Efficiency metrics
    planned_vs_actual_hours: {
      planned: number;
      actual: number;
      efficiency_percentage: number;
    };
    
    // Stage performance
    stage_performance: Record<string, {
      average_duration: number;
      completion_rate: number;
      bottleneck_score: number;
    }>;
    
    // Issues and delays
    total_issues: number;
    resolved_issues: number;
    average_resolution_time: number;
    
    common_issues: Array<{
      category: string;
      count: number;
      impact_score: number;
    }>;
    
    // Team performance
    team_utilization: number;
    productivity_score: number;
  };
  
  // Inventory Analytics
  inventory: {
    total_items: number;
    total_value: number;
    low_stock_items: number;
    out_of_stock_items: number;
    
    // Movement metrics
    inventory_turnover: number;
    days_of_inventory: number;
    
    // Category breakdown
    by_category: Record<string, {
      item_count: number;
      total_value: number;
      turnover_rate: number;
    }>;
    
    // Cost analysis
    total_purchase_value: number;
    total_usage_value: number;
    waste_percentage: number;
    
    // Fast and slow moving items
    fast_moving_items: Array<{
      item_id: string;
      item_name: string;
      turnover_rate: number;
      usage_frequency: number;
    }>;
    
    slow_moving_items: Array<{
      item_id: string;
      item_name: string;
      days_since_last_used: number;
      current_stock: number;
    }>;
  };
  
  // Communication Analytics
  communication: {
    total_communications: number;
    
    // Channel breakdown
    by_channel: Record<string, {
      count: number;
      response_rate: number;
      satisfaction_score?: number;
    }>;
    
    // Response metrics
    average_response_time: number;
    response_rate: number;
    customer_satisfaction: number;
    
    // Volume trends
    daily_volume: Array<{
      date: string;
      incoming: number;
      outgoing: number;
      response_time: number;
    }>;
    
    // Top communication topics
    common_topics: Array<{
      topic: string;
      count: number;
      average_resolution_time: number;
    }>;
    
    // Customer engagement
    most_communicative_customers: Array<{
      customer_id: string;
      customer_name: string;
      message_count: number;
      last_contact: string;
    }>;
  };
}

export interface PerformanceMetric {
  id: string;
  name: string;
  description: string;
  
  // Current value
  current_value: number;
  previous_value: number;
  target_value?: number;
  
  // Display format
  format: 'number' | 'currency' | 'percentage' | 'duration';
  unit?: string;
  
  // Trend analysis
  trend: MetricTrend;
  change_percentage: number;
  change_value: number;
  
  // Status
  status: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
  threshold_excellent?: number;
  threshold_good?: number;
  threshold_average?: number;
  
  // Time series data
  historical_data: Array<{
    period: string;
    value: number;
  }>;
  
  // Metadata
  category: 'financial' | 'operational' | 'customer' | 'production';
  priority: 'high' | 'medium' | 'low';
  last_updated: string;
}

export interface BusinessReport {
  id: string;
  title: string;
  type: ReportType;
  description: string;
  
  // Period and filters
  period: {
    start: string;
    end: string;
    type: PeriodType;
  };
  
  filters?: Record<string, any>;
  
  // Report sections
  sections: ReportSection[];
  
  // Summary
  executive_summary: string;
  key_insights: string[];
  recommendations: string[];
  
  // Data sources
  data_sources: string[];
  total_records: number;
  
  // Generation info
  generated_at: string;
  generated_by: string;
  export_formats: ('pdf' | 'excel' | 'csv')[];
  
  // Sharing
  is_public: boolean;
  shared_with: string[];
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'chart' | 'table' | 'metric' | 'text' | 'image';
  
  // Content
  content: any; // Chart data, table data, etc.
  description?: string;
  
  // Layout
  order: number;
  full_width: boolean;
  
  // Export options
  include_in_summary: boolean;
  page_break_before: boolean;
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  
  // Data
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
    backgroundColor?: string;
  }>;
  
  labels: string[];
  
  // Configuration
  options?: {
    title?: string;
    subtitle?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    showLegend?: boolean;
    showDataLabels?: boolean;
  };
}

export interface TableData {
  headers: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'currency' | 'date' | 'percentage';
    width?: number;
  }>;
  
  rows: Array<Record<string, any>>;
  
  // Formatting
  stripe_rows: boolean;
  show_totals: boolean;
  sortable: boolean;
  
  // Summary
  summary_row?: Record<string, any>;
  total_rows: number;
}

// Notification and alert system
export interface BusinessAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  category: 'inventory' | 'financial' | 'production' | 'customer' | 'system';
  
  // Alert details
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Triggering condition
  metric_id?: string;
  threshold_value?: number;
  current_value?: number;
  
  // Context
  related_entity_type?: 'order' | 'customer' | 'inventory_item' | 'transaction';
  related_entity_id?: string;
  
  // Actions
  recommended_actions: string[];
  action_url?: string;
  
  // Status
  status: 'active' | 'acknowledged' | 'resolved' | 'ignored';
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  
  // Recurrence
  is_recurring: boolean;
  last_triggered: string;
  trigger_count: number;
  
  created_at: string;
  updated_at: string;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  
  // Layout
  widgets: DashboardWidget[];
  layout_columns: number;
  
  // Permissions
  is_public: boolean;
  created_by: string;
  shared_with: string[];
  
  // Settings
  auto_refresh: boolean;
  refresh_interval: number; // in seconds
  
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'text';
  
  // Layout
  position: {
    row: number;
    column: number;
    width: number;
    height: number;
  };
  
  // Content
  title: string;
  data_source: string;
  configuration: Record<string, any>;
  
  // Display
  show_title: boolean;
  show_border: boolean;
  background_color?: string;
  
  // Behavior
  clickable: boolean;
  drill_down_url?: string;
  
  last_updated: string;
}

// Export and sharing
export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  include_charts: boolean;
  include_raw_data: boolean;
  date_range?: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
  recipient_emails?: string[];
  password_protected: boolean;
}

export interface ScheduledReport {
  id: string;
  report_type: ReportType;
  title: string;
  
  // Schedule
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  schedule_time: string; // HH:MM format
  schedule_day?: number; // For weekly/monthly
  
  // Recipients
  recipients: Array<{
    email: string;
    name: string;
    role: string;
  }>;
  
  // Configuration
  export_format: 'pdf' | 'excel';
  include_attachments: boolean;
  
  // Filters
  filters: Record<string, any>;
  
  // Status
  is_active: boolean;
  last_sent?: string;
  next_send: string;
  send_count: number;
  
  created_at: string;
  updated_at: string;
}

// Filters and search
export interface AnalyticsFilters {
  period_type?: PeriodType;
  start_date?: string;
  end_date?: string;
  
  // Entity filters
  customer_ids?: string[];
  order_statuses?: string[];
  box_types?: string[];
  business_types?: string[];
  
  // Value filters
  min_order_value?: number;
  max_order_value?: number;
  
  // Location filters
  cities?: string[];
  provinces?: string[];
  
  // Custom filters
  custom_filters?: Record<string, any>;
}

// Default values and constants
export const DEFAULT_ANALYTICS_VALUES = {
  period: 'month' as PeriodType,
  chart_colors: ['#2C5530', '#4A7C59', '#C4A962', '#8BC34A', '#4CAF50'],
  refresh_interval: 300, // 5 minutes
};

export const METRIC_CATEGORIES = {
  financial: 'Financial',
  operational: 'Operational', 
  customer: 'Customer',
  production: 'Production',
  inventory: 'Inventory',
  communication: 'Communication'
} as const;

export const REPORT_TYPE_LABELS = {
  sales: 'Sales Report',
  customer: 'Customer Report',
  inventory: 'Inventory Report', 
  financial: 'Financial Report',
  production: 'Production Report',
  communication: 'Communication Report',
  comprehensive: 'Comprehensive Report'
} as const;

export const PERIOD_TYPE_LABELS = {
  week: 'Last 7 Days',
  month: 'Last 30 Days',
  quarter: 'Last 90 Days',
  year: 'Last 365 Days'
} as const;

// KPI Definitions
export const BUSINESS_KPIS = {
  // Financial KPIs
  revenue_growth: {
    name: 'Revenue Growth',
    description: 'Month-over-month revenue growth percentage',
    format: 'percentage',
    target: 10, // 10% monthly growth
    category: 'financial'
  },
  
  profit_margin: {
    name: 'Profit Margin',
    description: 'Net profit as percentage of revenue',
    format: 'percentage',
    target: 25, // 25% profit margin
    category: 'financial'
  },
  
  // Operational KPIs
  order_completion_rate: {
    name: 'Order Completion Rate',
    description: 'Percentage of orders completed on time',
    format: 'percentage',
    target: 95, // 95% on-time completion
    category: 'operational'
  },
  
  average_order_value: {
    name: 'Average Order Value',
    description: 'Average value per completed order',
    format: 'currency',
    target: 500000, // IDR 500k average
    category: 'financial'
  },
  
  // Customer KPIs
  customer_retention_rate: {
    name: 'Customer Retention Rate',
    description: 'Percentage of customers who place repeat orders',
    format: 'percentage',
    target: 60, // 60% retention rate
    category: 'customer'
  },
  
  customer_satisfaction: {
    name: 'Customer Satisfaction',
    description: 'Average customer satisfaction score',
    format: 'number',
    target: 4.5, // 4.5/5 satisfaction
    category: 'customer'
  }
} as const;