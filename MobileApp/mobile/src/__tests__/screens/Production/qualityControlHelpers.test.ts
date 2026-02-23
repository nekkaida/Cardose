import {
  calculateCompletionPercentage,
  determineStatus,
  formatDate,
  getStatusColor,
  getStatusLabel,
  isCustomItem,
  generateItemId,
  DEFAULT_CHECKLIST,
  STATUS_OPTIONS,
} from '../../../screens/Production/components/qualityControlHelpers';
import type { ChecklistItem, QCStatus } from '../../../screens/Production/types';

// ---------------------------------------------------------------------------
// DEFAULT_CHECKLIST
// ---------------------------------------------------------------------------
describe('DEFAULT_CHECKLIST', () => {
  it('has 10 items', () => {
    expect(DEFAULT_CHECKLIST).toHaveLength(10);
  });

  it('all items start unchecked', () => {
    DEFAULT_CHECKLIST.forEach((item) => {
      expect(item.checked).toBe(false);
    });
  });

  it('all items have a non-empty name', () => {
    DEFAULT_CHECKLIST.forEach((item) => {
      expect(item.name.length).toBeGreaterThan(0);
    });
  });

  it('all items have unique IDs', () => {
    const ids = DEFAULT_CHECKLIST.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('IDs are prefixed with "default_"', () => {
    DEFAULT_CHECKLIST.forEach((item) => {
      expect(item.id).toMatch(/^default_/);
    });
  });
});

// ---------------------------------------------------------------------------
// STATUS_OPTIONS
// ---------------------------------------------------------------------------
describe('STATUS_OPTIONS', () => {
  it('has exactly 3 options', () => {
    expect(STATUS_OPTIONS).toHaveLength(3);
  });

  it('contains passed, needs_review, and failed', () => {
    const values = STATUS_OPTIONS.map((o) => o.value);
    expect(values).toEqual(['passed', 'needs_review', 'failed']);
  });
});

// ---------------------------------------------------------------------------
// calculateCompletionPercentage
// ---------------------------------------------------------------------------
describe('calculateCompletionPercentage', () => {
  it('returns 0 for an empty array', () => {
    expect(calculateCompletionPercentage([])).toBe(0);
  });

  it('returns 0 when nothing is checked', () => {
    const items: ChecklistItem[] = [
      { id: '1', name: 'A', checked: false },
      { id: '2', name: 'B', checked: false },
    ];
    expect(calculateCompletionPercentage(items)).toBe(0);
  });

  it('returns 100 when everything is checked', () => {
    const items: ChecklistItem[] = [
      { id: '1', name: 'A', checked: true },
      { id: '2', name: 'B', checked: true },
    ];
    expect(calculateCompletionPercentage(items)).toBe(100);
  });

  it('returns 50 when half are checked', () => {
    const items: ChecklistItem[] = [
      { id: '1', name: 'A', checked: true },
      { id: '2', name: 'B', checked: false },
    ];
    expect(calculateCompletionPercentage(items)).toBe(50);
  });

  it('rounds to the nearest integer', () => {
    // 1/3 = 33.333...
    const items: ChecklistItem[] = [
      { id: '1', name: 'A', checked: true },
      { id: '2', name: 'B', checked: false },
      { id: '3', name: 'C', checked: false },
    ];
    expect(calculateCompletionPercentage(items)).toBe(33);
  });

  it('handles a single checked item', () => {
    const items: ChecklistItem[] = [
      { id: '1', name: 'A', checked: true },
    ];
    expect(calculateCompletionPercentage(items)).toBe(100);
  });

  it('handles a single unchecked item', () => {
    const items: ChecklistItem[] = [
      { id: '1', name: 'A', checked: false },
    ];
    expect(calculateCompletionPercentage(items)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// determineStatus
// ---------------------------------------------------------------------------
describe('determineStatus', () => {
  const makeItems = (total: number, checked: number): ChecklistItem[] =>
    Array.from({ length: total }, (_, i) => ({
      id: `item_${i}`,
      name: `Item ${i}`,
      checked: i < checked,
    }));

  it('returns "failed" at 0%', () => {
    expect(determineStatus(makeItems(10, 0))).toBe('failed');
  });

  it('returns "failed" at 70%', () => {
    expect(determineStatus(makeItems(10, 7))).toBe('failed');
  });

  it('returns "failed" at 79%', () => {
    // 79/100
    expect(determineStatus(makeItems(100, 79))).toBe('failed');
  });

  it('returns "needs_review" at exactly 80%', () => {
    expect(determineStatus(makeItems(10, 8))).toBe('needs_review');
  });

  it('returns "needs_review" at 90%', () => {
    expect(determineStatus(makeItems(10, 9))).toBe('needs_review');
  });

  it('returns "passed" at 100%', () => {
    expect(determineStatus(makeItems(10, 10))).toBe('passed');
  });

  it('returns "passed" for a single fully-checked item', () => {
    expect(determineStatus(makeItems(1, 1))).toBe('passed');
  });

  it('returns "failed" for empty list', () => {
    expect(determineStatus([])).toBe('failed');
  });

  it('always returns a valid QCStatus', () => {
    const validStatuses: QCStatus[] = ['passed', 'needs_review', 'failed'];
    for (let checked = 0; checked <= 10; checked++) {
      expect(validStatuses).toContain(determineStatus(makeItems(10, checked)));
    }
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe('formatDate', () => {
  it('formats a date string with Indonesian locale', () => {
    const result = formatDate('2025-01-15T10:30:00Z');
    // Should contain year and some date components
    expect(result).toContain('2025');
  });

  it('returns a non-empty string for valid dates', () => {
    expect(formatDate('2024-06-01T00:00:00Z')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// getStatusColor
// ---------------------------------------------------------------------------
describe('getStatusColor', () => {
  it('returns success color for "passed"', () => {
    const color = getStatusColor('passed');
    expect(color).toBe('#4caf50');
  });

  it('returns warning color for "needs_review"', () => {
    const color = getStatusColor('needs_review');
    expect(color).toBe('#ff9800');
  });

  it('returns error color for "failed"', () => {
    const color = getStatusColor('failed');
    expect(color).toBe('#f44336');
  });

  it('returns a fallback color for unknown status', () => {
    const color = getStatusColor('unknown');
    expect(typeof color).toBe('string');
    expect(color.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getStatusLabel
// ---------------------------------------------------------------------------
describe('getStatusLabel', () => {
  it('returns "Passed" for passed', () => {
    expect(getStatusLabel('passed')).toBe('Passed');
  });

  it('returns "Needs Review" for needs_review', () => {
    expect(getStatusLabel('needs_review')).toBe('Needs Review');
  });

  it('returns "Failed" for failed', () => {
    expect(getStatusLabel('failed')).toBe('Failed');
  });
});

// ---------------------------------------------------------------------------
// isCustomItem
// ---------------------------------------------------------------------------
describe('isCustomItem', () => {
  it('returns false for default item IDs', () => {
    DEFAULT_CHECKLIST.forEach((item) => {
      expect(isCustomItem(item.id)).toBe(false);
    });
  });

  it('returns true for non-default IDs', () => {
    expect(isCustomItem('custom_123_1')).toBe(true);
    expect(isCustomItem('random')).toBe(true);
    expect(isCustomItem('99')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateItemId
// ---------------------------------------------------------------------------
describe('generateItemId', () => {
  it('returns a string', () => {
    expect(typeof generateItemId()).toBe('string');
  });

  it('starts with "custom_"', () => {
    expect(generateItemId()).toMatch(/^custom_/);
  });

  it('generates unique IDs on consecutive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateItemId()));
    expect(ids.size).toBe(100);
  });

  it('is recognized as a custom item', () => {
    expect(isCustomItem(generateItemId())).toBe(true);
  });
});
