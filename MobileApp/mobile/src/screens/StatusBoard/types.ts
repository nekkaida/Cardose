export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  box_type: string;
  status: string;
  priority: string;
  due_date: string;
  total_amount: number;
}

export interface StatusOption {
  value: string;
  label: string;
  color: string;
}

export const DEFAULT_STATUSES: StatusOption[] = [
  { value: 'pending', label: 'Pending', color: '#FFA500' },
  { value: 'designing', label: 'Designing', color: '#4169E1' },
  { value: 'approved', label: 'Approved', color: '#9370DB' },
  { value: 'production', label: 'In Production', color: '#FF8C00' },
  { value: 'quality_control', label: 'Quality Control', color: '#FFD700' },
  { value: 'completed', label: 'Completed', color: '#228B22' },
  { value: 'cancelled', label: 'Cancelled', color: '#DC143C' },
];
