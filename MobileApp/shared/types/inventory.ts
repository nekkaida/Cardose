export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  category: string;
  supplier?: string;
  unit: string;
  unit_cost: number;
  current_stock: number;
  reorder_level: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  item_name?: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  notes?: string;
  created_at: string;
}

export interface InventoryListResponse {
  success: boolean;
  items: InventoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InventoryStatsResponse {
  success: boolean;
  stats: {
    totalItems: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  };
}
