/**
 * StatusBoard type definitions.
 *
 * Status values are aligned with the backend validation
 * (source of truth: backend/src/routes/orders.js VALID_STATUSES).
 */

// --- Order enums (mirror shared/types/orders.ts) ---

export type OrderStatus =
  | 'pending'
  | 'designing'
  | 'approved'
  | 'production'
  | 'quality_control'
  | 'completed'
  | 'cancelled';

export type OrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export type BoxType = 'standard' | 'premium' | 'luxury' | 'custom';

export interface Order {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name?: string | null;
  status: OrderStatus;
  priority: OrderPriority;
  box_type?: BoxType | null;
  total_amount: number;
  notes?: string | null;
  due_date?: string | null;
  special_requests?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

// --- Status configuration ---

export interface StatusOption {
  value: OrderStatus;
  label: string;
  color: string;
}

export const ORDER_STATUSES: StatusOption[] = [
  { value: 'pending', label: 'Menunggu', color: '#FFA500' },
  { value: 'designing', label: 'Desain', color: '#4169E1' },
  { value: 'approved', label: 'Disetujui', color: '#9370DB' },
  { value: 'production', label: 'Produksi', color: '#FF8C00' },
  { value: 'quality_control', label: 'Kontrol Mutu', color: '#FFD700' },
  { value: 'completed', label: 'Selesai', color: '#228B22' },
  { value: 'cancelled', label: 'Dibatalkan', color: '#DC143C' },
];

/** Statuses shown as kanban columns by default. */
export const ACTIVE_STATUSES: OrderStatus[] = [
  'pending',
  'designing',
  'approved',
  'production',
  'quality_control',
];

// --- Priority configuration ---

export interface PriorityOption {
  value: OrderPriority;
  label: string;
  color: string;
}

export const PRIORITIES: PriorityOption[] = [
  { value: 'low', label: 'Rendah', color: '#4CAF50' },
  { value: 'normal', label: 'Normal', color: '#2196F3' },
  { value: 'high', label: 'Tinggi', color: '#FF9800' },
  { value: 'urgent', label: 'Mendesak', color: '#F44336' },
];

// --- Status transition map ---

/**
 * Defines the recommended next statuses for each order status.
 * The backend does not enforce transitions, but the UI uses this
 * to guide the user toward the normal workflow.
 */
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['designing', 'cancelled'],
  designing: ['approved', 'pending', 'cancelled'],
  approved: ['production', 'designing', 'cancelled'],
  production: ['quality_control', 'cancelled'],
  quality_control: ['completed', 'production', 'cancelled'],
  completed: [],
  cancelled: ['pending'],
};
