export type BusinessType = 'corporate' | 'wedding' | 'trading' | 'individual' | 'event';
export type LoyaltyStatus = 'new' | 'regular' | 'vip';

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  business_type: BusinessType;
  loyalty_status: LoyaltyStatus;
  total_orders: number;
  total_spent: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerCreatePayload {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  business_type?: BusinessType;
  loyalty_status?: LoyaltyStatus;
  notes?: string;
}

export interface CustomerUpdatePayload extends Partial<CustomerCreatePayload> {}

export interface CustomerStatsResponse {
  corporate: number;
  wedding: number;
  trading: number;
  individual: number;
  event: number;
  totalValue: number;
  loyalty_new: number;
  loyalty_regular: number;
  loyalty_vip: number;
}

export interface CustomerDetailResponse {
  success: boolean;
  customer: Customer & {
    recentOrders: CustomerOrder[];
  };
}

export interface CustomerOrder {
  id: string;
  order_number: string;
  status: string;
  priority: string;
  box_type?: string;
  total_amount: number;
  notes?: string;
  due_date?: string;
  created_at: string;
  updated_at?: string;
}

export interface CustomersListResponse {
  success: boolean;
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats?: CustomerStatsResponse;
}
