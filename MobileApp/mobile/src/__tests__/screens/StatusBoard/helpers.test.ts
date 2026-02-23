/**
 * StatusBoard helpers Unit Tests
 *
 * Tests all pure utility functions used by the StatusBoard screen:
 * - isOverdue: timezone-aware overdue detection
 * - formatDate: Indonesian locale date formatting
 * - formatCurrency: IDR currency formatting
 * - getPriorityConfig: priority lookup with fallback
 * - filterOrders: search filtering by order_number and customer_name
 * - getStatusColor / getStatusLabel: status config lookups
 */

import {
  isOverdue,
  formatDate,
  formatCurrency,
  getPriorityConfig,
  filterOrders,
  getStatusColor,
  getStatusLabel,
} from '../../../screens/StatusBoard/helpers';
import {
  ORDER_STATUSES,
  PRIORITIES,
} from '../../../screens/StatusBoard/types';
import type { Order } from '../../../screens/StatusBoard/types';

// ─── isOverdue ───────────────────────────────────────────────────

describe('isOverdue', () => {
  it('returns false for null/undefined', () => {
    expect(isOverdue(null)).toBe(false);
    expect(isOverdue(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isOverdue('')).toBe(false);
  });

  it('returns true for a date clearly in the past', () => {
    expect(isOverdue('2020-01-01')).toBe(true);
  });

  it('returns false for a date far in the future', () => {
    expect(isOverdue('2099-12-31')).toBe(false);
  });

  it('returns false for today (order due today is NOT overdue)', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(isOverdue(today)).toBe(false);
  });

  it('returns true for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const str = yesterday.toISOString().split('T')[0];
    expect(isOverdue(str)).toBe(true);
  });

  it('returns false for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const str = tomorrow.toISOString().split('T')[0];
    expect(isOverdue(str)).toBe(false);
  });

  it('returns false for an invalid date string', () => {
    expect(isOverdue('not-a-date')).toBe(false);
  });
});

// ─── formatDate ──────────────────────────────────────────────────

describe('formatDate', () => {
  it('returns "-" for null/undefined', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
  });

  it('formats a valid ISO date into Indonesian locale', () => {
    const result = formatDate('2024-03-15');
    // Should contain "15", "Mar", and "2024" in some Indonesian format
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('returns the raw string for an invalid date', () => {
    expect(formatDate('garbage')).toBe('garbage');
  });
});

// ─── formatCurrency ──────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('includes IDR indicator', () => {
    const result = formatCurrency(150000);
    // Intl may use "Rp" or "IDR" depending on environment
    expect(result).toMatch(/Rp|IDR/);
  });

  it('formats large numbers with separators', () => {
    const result = formatCurrency(1500000);
    // Should contain "1.500.000" or "1,500,000" depending on locale impl
    expect(result.replace(/[^\d]/g, '')).toBe('1500000');
  });

  it('has no decimal places', () => {
    const result = formatCurrency(123456);
    // Should not contain decimal point followed by digits
    expect(result).not.toMatch(/[.,]\d{1,2}$/);
  });
});

// ─── getPriorityConfig ───────────────────────────────────────────

describe('getPriorityConfig', () => {
  it('returns correct config for each known priority', () => {
    expect(getPriorityConfig('low').value).toBe('low');
    expect(getPriorityConfig('normal').value).toBe('normal');
    expect(getPriorityConfig('high').value).toBe('high');
    expect(getPriorityConfig('urgent').value).toBe('urgent');
  });

  it('returns "normal" as default for unknown priority', () => {
    // @ts-expect-error testing unknown priority
    const config = getPriorityConfig('nonexistent');
    expect(config.value).toBe('normal');
  });

  it('each priority has a label and color', () => {
    for (const p of PRIORITIES) {
      const config = getPriorityConfig(p.value);
      expect(config.label).toBeTruthy();
      expect(config.color).toMatch(/^#/);
    }
  });
});

// ─── filterOrders ────────────────────────────────────────────────

describe('filterOrders', () => {
  const mockOrders: Order[] = [
    {
      id: '1',
      order_number: 'ORD-001',
      customer_name: 'Budi Santoso',
      status: 'pending',
      priority: 'normal',
      total_amount: 100000,
    },
    {
      id: '2',
      order_number: 'ORD-002',
      customer_name: 'Siti Rahayu',
      status: 'production',
      priority: 'high',
      total_amount: 250000,
    },
    {
      id: '3',
      order_number: 'ORD-003',
      customer_name: null,
      status: 'designing',
      priority: 'low',
      total_amount: 50000,
    },
  ];

  it('returns all orders when query is empty', () => {
    expect(filterOrders(mockOrders, '')).toHaveLength(3);
    expect(filterOrders(mockOrders, '  ')).toHaveLength(3);
  });

  it('filters by order number (case-insensitive)', () => {
    expect(filterOrders(mockOrders, 'ord-001')).toHaveLength(1);
    expect(filterOrders(mockOrders, 'ORD-001')).toHaveLength(1);
  });

  it('filters by customer name (case-insensitive)', () => {
    expect(filterOrders(mockOrders, 'budi')).toHaveLength(1);
    expect(filterOrders(mockOrders, 'SITI')).toHaveLength(1);
  });

  it('matches partial strings', () => {
    expect(filterOrders(mockOrders, 'ORD')).toHaveLength(3);
    expect(filterOrders(mockOrders, 'San')).toHaveLength(1);
  });

  it('returns empty array when nothing matches', () => {
    expect(filterOrders(mockOrders, 'ZZZZZ')).toHaveLength(0);
  });

  it('handles orders with null customer_name', () => {
    expect(filterOrders(mockOrders, 'ORD-003')).toHaveLength(1);
    // Searching by name should not crash on null
    expect(filterOrders(mockOrders, 'nobody')).toHaveLength(0);
  });

  it('trims whitespace from query', () => {
    expect(filterOrders(mockOrders, '  budi  ')).toHaveLength(1);
  });
});

// ─── getStatusColor / getStatusLabel ─────────────────────────────

describe('getStatusColor', () => {
  it('returns the correct color for each known status', () => {
    for (const s of ORDER_STATUSES) {
      expect(getStatusColor(ORDER_STATUSES, s.value)).toBe(s.color);
    }
  });

  it('returns a fallback color for unknown statuses', () => {
    const color = getStatusColor(ORDER_STATUSES, 'nonexistent');
    expect(color).toBeTruthy();
    expect(typeof color).toBe('string');
  });
});

describe('getStatusLabel', () => {
  it('returns the correct label for each known status', () => {
    for (const s of ORDER_STATUSES) {
      expect(getStatusLabel(ORDER_STATUSES, s.value)).toBe(s.label);
    }
  });

  it('returns the raw value for unknown statuses', () => {
    expect(getStatusLabel(ORDER_STATUSES, 'mystery')).toBe('mystery');
  });
});
