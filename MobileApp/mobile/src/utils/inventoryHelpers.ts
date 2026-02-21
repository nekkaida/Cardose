/**
 * Inventory & Business Helper Functions
 *
 * Utilities for stock management, pricing, and order/invoice generation.
 */

import { BUSINESS_CONFIG } from '../config';

/**
 * Calculate total price with discount and tax
 */
export const calculateTotalPrice = (
  unitPrice: number,
  quantity: number,
  discountPercentage: number = 0,
  taxRate: number = BUSINESS_CONFIG.PPN_RATE
): {
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
} => {
  const subtotal = unitPrice * quantity;
  const discount = subtotal * (discountPercentage / 100);
  const afterDiscount = subtotal - discount;
  const taxAmount = afterDiscount * (taxRate / 100);
  const total = afterDiscount + taxAmount;

  return {
    subtotal,
    discount,
    taxAmount,
    total,
  };
};

/**
 * Calculate stock level status
 */
export const getStockLevelStatus = (
  currentStock: number,
  minimumStock: number
): 'out_of_stock' | 'low' | 'in_stock' | 'overstocked' => {
  if (currentStock === 0) return 'out_of_stock';
  if (currentStock < minimumStock) return 'low';
  if (currentStock > minimumStock * 3) return 'overstocked';
  return 'in_stock';
};

/**
 * Calculate stock level percentage
 */
export const getStockLevelPercentage = (
  currentStock: number,
  minimumStock: number
): number => {
  if (minimumStock === 0) return 100;
  return Math.min((currentStock / minimumStock) * 100, 100);
};

/**
 * Generate order number
 */
export const generateOrderNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, '0');
  return `${BUSINESS_CONFIG.ORDER_PREFIX}-${year}-${random}`;
};

/**
 * Generate invoice number
 */
export const generateInvoiceNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, '0');
  return `${BUSINESS_CONFIG.INVOICE_PREFIX}-${year}-${random}`;
};
