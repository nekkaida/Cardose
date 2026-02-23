import type { InventoryItem, InventoryListStats } from '@shared/types/inventory';

// ── Single source of truth for categories ────────────────────────

export const CATEGORIES = [
  'cardboard',
  'fabric',
  'ribbon',
  'accessories',
  'packaging',
  'tools',
] as const;

export type InventoryCategory = (typeof CATEGORIES)[number];

export const CATEGORY_I18N: Record<InventoryCategory, string> = {
  cardboard: 'inventory.catCardboard',
  fabric: 'inventory.catFabric',
  ribbon: 'inventory.catRibbon',
  accessories: 'inventory.catAccessories',
  packaging: 'inventory.catPackaging',
  tools: 'inventory.catTools',
};

// ── Single source of truth for movement types ────────────────────

export const MOVEMENT_TYPES = ['purchase', 'usage', 'sale', 'adjustment', 'waste'] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_I18N: Record<MovementType, string> = {
  purchase: 'inventory.movePurchase',
  usage: 'inventory.moveUsage',
  sale: 'inventory.moveSale',
  adjustment: 'inventory.moveAdjustment',
  waste: 'inventory.moveWaste',
};

// ── Stats type ───────────────────────────────────────────────────

export type InventoryStats = InventoryListStats;

export const EMPTY_STATS: InventoryStats = {
  total: 0,
  cardboard: 0,
  fabric: 0,
  ribbon: 0,
  accessories: 0,
  packaging: 0,
  tools: 0,
  lowStock: 0,
  outOfStock: 0,
  totalValue: 0,
};

// ── Input constraints (shared between frontend + backend) ────────

export const INPUT_LIMITS = {
  NAME_MAX: 200,
  SUPPLIER_MAX: 200,
  UNIT_MAX: 50,
  NOTES_MAX: 1000,
} as const;

// ── Stock status helpers ─────────────────────────────────────────

export const isLowStock = (item: InventoryItem): boolean =>
  item.current_stock > 0 && item.current_stock <= item.reorder_level;

export const isOutOfStock = (item: InventoryItem): boolean => item.current_stock <= 0;

/** Returns the text color class for stock quantity display. */
export const getStockColor = (item: InventoryItem): string => {
  if (isOutOfStock(item)) return 'text-red-600';
  if (isLowStock(item)) return 'text-orange-600';
  return 'text-gray-900';
};

/** Returns the row background class for stock-level highlighting. */
export const getRowStockClass = (item: InventoryItem): string => {
  if (isOutOfStock(item)) return 'bg-red-50/50';
  if (isLowStock(item)) return 'bg-yellow-50/50';
  return '';
};

export const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'cardboard':
      return 'bg-amber-50 text-amber-700';
    case 'fabric':
      return 'bg-purple-50 text-purple-700';
    case 'ribbon':
      return 'bg-pink-50 text-pink-700';
    case 'accessories':
      return 'bg-blue-50 text-blue-700';
    case 'packaging':
      return 'bg-teal-50 text-teal-700';
    case 'tools':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-50 text-gray-700';
  }
};

// ── Stock movement calculation ───────────────────────────────────

export const getNewStock = (currentStock: number, type: string, quantity: number): number => {
  if (type === 'purchase') return currentStock + quantity;
  if (type === 'usage' || type === 'sale' || type === 'waste') return currentStock - quantity;
  if (type === 'adjustment') return quantity;
  return currentStock;
};

// ── Page size options ────────────────────────────────────────────

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;
