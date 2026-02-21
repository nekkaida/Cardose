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
  type: 'purchase' | 'usage' | 'sale' | 'adjustment' | 'waste';
  quantity: number;
  notes?: string;
  created_at: string;
}

export interface InventoryListResponse {
  success: boolean;
  items: InventoryItem[];
  inventory?: InventoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats?: {
    total: number;
    cardboard: number;
    fabric: number;
    ribbon: number;
    accessories: number;
    packaging: number;
    tools: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  };
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

export type MovementType = InventoryMovement['type'];

export interface InventoryMovementPayload {
  item_id: string;
  type: MovementType;
  quantity: number;
  unit_cost?: number;
  reason?: string;
  order_id?: string;
  notes?: string;
}

export interface InventoryMovementResponse {
  success: boolean;
  message: string;
  movementId: string;
  newStock: number;
}
