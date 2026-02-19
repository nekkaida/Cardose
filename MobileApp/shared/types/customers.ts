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

export interface CustomersListResponse {
  success: boolean;
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
