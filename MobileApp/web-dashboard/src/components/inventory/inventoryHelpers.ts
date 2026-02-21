import type { InventoryItem } from '@shared/types/inventory';

export interface InventoryStats {
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
}

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

export const CATEGORIES = [
  'cardboard',
  'fabric',
  'ribbon',
  'accessories',
  'packaging',
  'tools',
] as const;

export const CATEGORY_I18N: Record<string, string> = {
  cardboard: 'inventory.catCardboard',
  fabric: 'inventory.catFabric',
  ribbon: 'inventory.catRibbon',
  accessories: 'inventory.catAccessories',
  packaging: 'inventory.catPackaging',
  tools: 'inventory.catTools',
};

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
