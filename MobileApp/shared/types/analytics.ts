export interface DashboardRevenue {
  total_revenue: number;
  paid_revenue: number;
  pending_revenue: number;
  average_order_value: number;
  invoice_count: number;
}

export interface DashboardOrders {
  total_orders: number;
  completed_orders: number;
  active_orders: number;
  cancelled_orders: number;
  average_value: number;
  completion_rate: number | string;
}

export interface DashboardCustomers {
  total_customers: number;
  vip_customers: number;
  regular_customers: number;
  new_customers: number;
}

export interface DashboardInventory {
  total_materials: number;
  out_of_stock: number;
  low_stock: number;
  total_value: number;
}

export interface DashboardProduction {
  designing: number;
  in_production: number;
  quality_control: number;
  urgent_orders: number;
}

export interface DashboardData {
  period: string;
  revenue: DashboardRevenue;
  orders: DashboardOrders;
  customers: DashboardCustomers;
  inventory: DashboardInventory;
  production: DashboardProduction;
}

export interface RevenueTrendItem {
  month: string;
  invoice_count: number;
  revenue: number;
  tax_collected: number;
  average_value: number;
}

export interface RevenueAnalytics {
  trend: RevenueTrendItem[];
}

export interface TopCustomer {
  id: string;
  name: string;
  business_type: string;
  loyalty_status: string;
  order_count: number;
  total_revenue: number;
  average_order_value: number;
  last_order_date: string;
}

export interface BusinessTypeSegment {
  business_type: string;
  count: number;
}

export interface CustomerAnalytics {
  top_customers: TopCustomer[];
  acquisition_trend: Array<{ month: string; new_customers: number }>;
  by_business_type: BusinessTypeSegment[];
}
