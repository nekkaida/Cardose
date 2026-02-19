export type TransactionType = 'income' | 'expense';
export type InvoiceStatus = 'unpaid' | 'paid' | 'overdue' | 'cancelled';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  description?: string;
  order_id?: string;
  payment_method?: string;
  payment_date: string;
  ppn_amount?: number;
  base_amount?: number;
  invoice_number?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id?: string;
  customer_id: string;
  customer_name?: string;
  order_number?: string;
  subtotal: number;
  discount: number;
  ppn_rate: number;
  ppn_amount: number;
  total_amount: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date?: string;
  paid_date?: string;
  payment_method?: string;
  notes?: string;
  items?: unknown[];
  created_at: string;
}

export interface FinancialSummaryResponse {
  success: boolean;
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    totalTax: number;
    netProfit: number;
    profitMargin: string;
    pendingInvoices: number;
    paidInvoices: number;
    pendingOrders: number;
    completedOrders: number;
    totalOrders: number;
    averageOrderValue: number;
    ppnRate: number;
    monthlyGrowth: number;
  };
}
