export interface SalesReportData {
  period: { start: string; end: string };
  sales: Array<{ date: string; invoice_count: number; revenue: number; tax_collected: number }>;
  summary: { totalInvoices: number; totalRevenue: number; totalTax: number; averageInvoice: number };
  topCustomers: Array<{ name: string; revenue: number; invoice_count: number }>;
}

export interface InventoryReportData {
  summary: { totalItems: number; outOfStock: number; lowStock: number; totalValue: number };
  byCategory: Array<{ category: string; item_count: number; total_stock: number; total_value: number }>;
  lowStockItems: Array<{ name: string; sku: string; category: string; current_stock: number; reorder_level: number; unit: string }>;
  recentMovements: Array<{ item_name: string; type: string; quantity: number; created_at: string }>;
}

export interface ProductionReportData {
  period: { start: string; end: string };
  ordersByStatus: Array<{ status: string; count: number; value: number }>;
  completionRate: number | string;
  taskStats: Array<{ status: string; count: number }>;
  qualityStats: Array<{ overall_status: string; count: number }>;
}

export interface CustomerReportData {
  summary: { totalCustomers: number; vipCustomers: number; totalRevenue: number; averageSpent: number; newThisMonth: number };
  byBusinessType: Array<{ business_type: string; count: number; total_spent: number; avg_orders: number }>;
  byLoyaltyStatus: Array<{ loyalty_status: string; count: number; total_spent: number }>;
  topCustomers: Array<{ name: string; business_type: string; loyalty_status: string; total_orders: number; total_spent: number }>;
}

export interface FinancialReportData {
  period: { start: string; end: string };
  summary: { totalIncome: number; totalExpense: number; netIncome: number; incomeCount: number; expenseCount: number };
  byCategory: Array<{ category: string; type: string; total: number; count: number }>;
  invoiceStats: Array<{ status: string; count: number; value: number }>;
}

export type ReportType = 'sales' | 'inventory' | 'production' | 'customers' | 'financial';
export type ReportData = SalesReportData | InventoryReportData | ProductionReportData | CustomerReportData | FinancialReportData;
