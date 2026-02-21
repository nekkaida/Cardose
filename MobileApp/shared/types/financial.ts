export type TransactionType = 'income' | 'expense';
export type TransactionCategory = 'sales' | 'materials' | 'labor' | 'overhead' | 'other';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card' | 'mobile_payment';
export type InvoiceStatus = 'unpaid' | 'paid' | 'overdue' | 'cancelled';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description?: string;
  order_id?: string;
  payment_method?: PaymentMethod;
  payment_date: string;
  ppn_amount?: number;
  base_amount?: number;
  invoice_number?: string;
  created_at: string;
}

export interface CreateTransactionPayload {
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description?: string;
  payment_method?: PaymentMethod;
}

export interface TransactionsListResponse {
  success: boolean;
  transactions: Transaction[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
  categoryBreakdown?: Array<{
    category: string;
    type: TransactionType;
    total?: number;
    amount?: number;
  }>;
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

export interface CreateInvoicePayload {
  customer_id: string;
  order_id?: string;
  subtotal: number;
  discount: number;
  ppn_amount: number;
  total_amount: number;
  due_date?: string;
  notes?: string;
  items?: unknown[];
}

export interface InvoiceStatusStats {
  unpaid: number;
  paid: number;
  overdue: number;
  cancelled: number;
}

export interface InvoicesListResponse {
  success: boolean;
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats?: InvoiceStatusStats;
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
