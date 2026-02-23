/**
 * StatusBoard types / constants integrity tests
 *
 * Ensures that:
 * - ORDER_STATUSES, ACTIVE_STATUSES, PRIORITIES, VALID_TRANSITIONS are consistent
 * - The transition map covers all statuses
 * - No transition references a non-existent status
 * - ACTIVE_STATUSES is a subset of ORDER_STATUSES
 * - Terminal statuses (completed) have no forward transitions
 */

import {
  ORDER_STATUSES,
  ACTIVE_STATUSES,
  PRIORITIES,
  VALID_TRANSITIONS,
} from '../../../screens/StatusBoard/types';
import type { OrderStatus } from '../../../screens/StatusBoard/types';

const ALL_STATUS_VALUES = ORDER_STATUSES.map(s => s.value);

describe('ORDER_STATUSES', () => {
  it('has at least 5 statuses', () => {
    expect(ORDER_STATUSES.length).toBeGreaterThanOrEqual(5);
  });

  it('each status has value, label, and color', () => {
    for (const s of ORDER_STATUSES) {
      expect(typeof s.value).toBe('string');
      expect(s.value.length).toBeGreaterThan(0);
      expect(typeof s.label).toBe('string');
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('has no duplicate values', () => {
    const unique = new Set(ALL_STATUS_VALUES);
    expect(unique.size).toBe(ORDER_STATUSES.length);
  });

  it('includes required workflow statuses', () => {
    const required: OrderStatus[] = [
      'pending',
      'designing',
      'approved',
      'production',
      'quality_control',
      'completed',
      'cancelled',
    ];
    for (const r of required) {
      expect(ALL_STATUS_VALUES).toContain(r);
    }
  });
});

describe('ACTIVE_STATUSES', () => {
  it('is a subset of ORDER_STATUSES values', () => {
    for (const s of ACTIVE_STATUSES) {
      expect(ALL_STATUS_VALUES).toContain(s);
    }
  });

  it('does not include completed or cancelled', () => {
    expect(ACTIVE_STATUSES).not.toContain('completed');
    expect(ACTIVE_STATUSES).not.toContain('cancelled');
  });

  it('has at least 3 active statuses', () => {
    expect(ACTIVE_STATUSES.length).toBeGreaterThanOrEqual(3);
  });
});

describe('PRIORITIES', () => {
  it('has 4 priority levels', () => {
    expect(PRIORITIES).toHaveLength(4);
  });

  it('includes low, normal, high, urgent', () => {
    const values = PRIORITIES.map(p => p.value);
    expect(values).toContain('low');
    expect(values).toContain('normal');
    expect(values).toContain('high');
    expect(values).toContain('urgent');
  });

  it('each priority has label and hex color', () => {
    for (const p of PRIORITIES) {
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('VALID_TRANSITIONS', () => {
  it('has an entry for every status in ORDER_STATUSES', () => {
    for (const status of ALL_STATUS_VALUES) {
      expect(VALID_TRANSITIONS).toHaveProperty(status);
      expect(Array.isArray(VALID_TRANSITIONS[status])).toBe(true);
    }
  });

  it('every target status in transitions is a valid OrderStatus', () => {
    for (const [source, targets] of Object.entries(VALID_TRANSITIONS)) {
      for (const target of targets) {
        expect(ALL_STATUS_VALUES).toContain(target);
      }
      // Source should also be a valid status
      expect(ALL_STATUS_VALUES).toContain(source);
    }
  });

  it('no status transitions to itself', () => {
    for (const [source, targets] of Object.entries(VALID_TRANSITIONS)) {
      expect(targets).not.toContain(source);
    }
  });

  it('completed has no forward transitions (terminal)', () => {
    expect(VALID_TRANSITIONS.completed).toHaveLength(0);
  });

  it('cancelled can reopen to pending', () => {
    expect(VALID_TRANSITIONS.cancelled).toContain('pending');
  });

  it('pending can move to designing', () => {
    expect(VALID_TRANSITIONS.pending).toContain('designing');
  });

  it('every non-terminal status can be cancelled', () => {
    const nonTerminal: OrderStatus[] = [
      'pending',
      'designing',
      'approved',
      'production',
      'quality_control',
    ];
    for (const s of nonTerminal) {
      expect(VALID_TRANSITIONS[s]).toContain('cancelled');
    }
  });

  it('follows the expected workflow order', () => {
    // The happy path: pending → designing → approved → production → quality_control → completed
    expect(VALID_TRANSITIONS.pending).toContain('designing');
    expect(VALID_TRANSITIONS.designing).toContain('approved');
    expect(VALID_TRANSITIONS.approved).toContain('production');
    expect(VALID_TRANSITIONS.production).toContain('quality_control');
    expect(VALID_TRANSITIONS.quality_control).toContain('completed');
  });
});
