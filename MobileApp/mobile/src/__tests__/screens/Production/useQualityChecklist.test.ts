import { renderHook, act } from '@testing-library/react-native';
import { useQualityChecklist } from '../../../screens/Production/hooks/useQualityChecklist';
import {
  DEFAULT_CHECKLIST,
  isCustomItem,
} from '../../../screens/Production/components/qualityControlHelpers';

// ---------------------------------------------------------------------------
// useQualityChecklist
// ---------------------------------------------------------------------------
describe('useQualityChecklist', () => {
  // ── Initialization ──────────────────────────────────────────────────
  describe('initialization', () => {
    it('initializes with DEFAULT_CHECKLIST items (10 items)', () => {
      const { result } = renderHook(() => useQualityChecklist());
      expect(result.current.items).toHaveLength(DEFAULT_CHECKLIST.length);
      expect(result.current.items).toHaveLength(10);
    });

    it('all items start unchecked', () => {
      const { result } = renderHook(() => useQualityChecklist());
      result.current.items.forEach((item) => {
        expect(item.checked).toBe(false);
      });
    });

    it('items are copies of the defaults (not references)', () => {
      const { result } = renderHook(() => useQualityChecklist());
      result.current.items.forEach((item, i) => {
        expect(item).not.toBe(DEFAULT_CHECKLIST[i]);
        expect(item.id).toBe(DEFAULT_CHECKLIST[i].id);
        expect(item.name).toBe(DEFAULT_CHECKLIST[i].name);
      });
    });

    it('starts with 0% completion', () => {
      const { result } = renderHook(() => useQualityChecklist());
      expect(result.current.completionPercentage).toBe(0);
    });

    it('starts with suggested status "failed" (0% completion)', () => {
      const { result } = renderHook(() => useQualityChecklist());
      expect(result.current.suggestedStatus).toBe('failed');
    });
  });

  // ── toggle ──────────────────────────────────────────────────────────
  describe('toggle', () => {
    it('toggles a specific item to checked', () => {
      const { result } = renderHook(() => useQualityChecklist());
      const targetId = result.current.items[0].id;

      act(() => {
        result.current.toggle(targetId);
      });

      expect(result.current.items[0].checked).toBe(true);
    });

    it('does not affect other items when toggling one', () => {
      const { result } = renderHook(() => useQualityChecklist());
      const targetId = result.current.items[0].id;

      act(() => {
        result.current.toggle(targetId);
      });

      result.current.items.slice(1).forEach((item) => {
        expect(item.checked).toBe(false);
      });
    });

    it('toggling back unchecks the item', () => {
      const { result } = renderHook(() => useQualityChecklist());
      const targetId = result.current.items[2].id;

      act(() => {
        result.current.toggle(targetId);
      });
      expect(result.current.items[2].checked).toBe(true);

      act(() => {
        result.current.toggle(targetId);
      });
      expect(result.current.items[2].checked).toBe(false);
    });

    it('can toggle multiple different items', () => {
      const { result } = renderHook(() => useQualityChecklist());

      act(() => {
        result.current.toggle(result.current.items[0].id);
        result.current.toggle(result.current.items[1].id);
      });

      expect(result.current.items[0].checked).toBe(true);
      expect(result.current.items[1].checked).toBe(true);
      expect(result.current.items[2].checked).toBe(false);
    });
  });

  // ── updateNotes ─────────────────────────────────────────────────────
  describe('updateNotes', () => {
    it('sets notes on an item', () => {
      const { result } = renderHook(() => useQualityChecklist());
      const targetId = result.current.items[0].id;

      act(() => {
        result.current.updateNotes(targetId, 'Looks good');
      });

      expect(result.current.items[0].notes).toBe('Looks good');
    });

    it('does not affect other items', () => {
      const { result } = renderHook(() => useQualityChecklist());

      act(() => {
        result.current.updateNotes(result.current.items[0].id, 'Note A');
      });

      expect(result.current.items[1].notes).toBeUndefined();
    });

    it('can overwrite existing notes', () => {
      const { result } = renderHook(() => useQualityChecklist());
      const targetId = result.current.items[0].id;

      act(() => {
        result.current.updateNotes(targetId, 'First note');
      });
      act(() => {
        result.current.updateNotes(targetId, 'Updated note');
      });

      expect(result.current.items[0].notes).toBe('Updated note');
    });

    it('can set notes to empty string', () => {
      const { result } = renderHook(() => useQualityChecklist());
      const targetId = result.current.items[0].id;

      act(() => {
        result.current.updateNotes(targetId, 'Some note');
      });
      act(() => {
        result.current.updateNotes(targetId, '');
      });

      expect(result.current.items[0].notes).toBe('');
    });
  });

  // ── updateName ──────────────────────────────────────────────────────
  describe('updateName', () => {
    it('changes name of an item', () => {
      const { result } = renderHook(() => useQualityChecklist());
      const targetId = result.current.items[0].id;

      act(() => {
        result.current.updateName(targetId, 'Custom name');
      });

      expect(result.current.items[0].name).toBe('Custom name');
    });

    it('does not affect other items', () => {
      const { result } = renderHook(() => useQualityChecklist());
      const originalName = result.current.items[1].name;

      act(() => {
        result.current.updateName(result.current.items[0].id, 'Changed');
      });

      expect(result.current.items[1].name).toBe(originalName);
    });
  });

  // ── addCustom ───────────────────────────────────────────────────────
  describe('addCustom', () => {
    it('adds a custom item to the list', () => {
      const { result } = renderHook(() => useQualityChecklist());

      act(() => {
        result.current.addCustom();
      });

      expect(result.current.items).toHaveLength(11);
    });

    it('custom item starts unchecked with empty name', () => {
      const { result } = renderHook(() => useQualityChecklist());

      act(() => {
        result.current.addCustom();
      });

      const newItem = result.current.items[result.current.items.length - 1];
      expect(newItem.checked).toBe(false);
      expect(newItem.name).toBe('');
    });

    it('custom item has a generated ID recognized as custom', () => {
      const { result } = renderHook(() => useQualityChecklist());

      act(() => {
        result.current.addCustom();
      });

      const newItem = result.current.items[result.current.items.length - 1];
      expect(newItem.id).toMatch(/^custom_/);
      expect(isCustomItem(newItem.id)).toBe(true);
    });

    it('appends new item at the end of the list', () => {
      const { result } = renderHook(() => useQualityChecklist());

      act(() => {
        result.current.addCustom();
      });

      // The first 10 items should still be the defaults
      for (let i = 0; i < 10; i++) {
        expect(result.current.items[i].id).toBe(DEFAULT_CHECKLIST[i].id);
      }
    });

    it('can add multiple custom items', () => {
      const { result } = renderHook(() => useQualityChecklist());

      act(() => {
        result.current.addCustom();
        result.current.addCustom();
        result.current.addCustom();
      });

      expect(result.current.items).toHaveLength(13);
      // Each custom item should have a unique ID
      const customIds = result.current.items.slice(10).map((item) => item.id);
      expect(new Set(customIds).size).toBe(3);
    });
  });

  // ── removeCustom ────────────────────────────────────────────────────
  describe('removeCustom', () => {
    it('removes a custom item', () => {
      const { result } = renderHook(() => useQualityChecklist());

      act(() => {
        result.current.addCustom();
      });
      const customId = result.current.items[10].id;

      act(() => {
        result.current.removeCustom(customId);
      });

      expect(result.current.items).toHaveLength(10);
      expect(result.current.items.find((item) => item.id === customId)).toBeUndefined();
    });

    it('refuses to remove a default item (isCustomItem guard)', () => {
      const { result } = renderHook(() => useQualityChecklist());
      const defaultId = result.current.items[0].id;

      act(() => {
        result.current.removeCustom(defaultId);
      });

      expect(result.current.items).toHaveLength(10);
      expect(result.current.items[0].id).toBe(defaultId);
    });

    it('does not affect other custom items when removing one', () => {
      const { result } = renderHook(() => useQualityChecklist());

      act(() => {
        result.current.addCustom();
        result.current.addCustom();
      });
      const firstCustomId = result.current.items[10].id;
      const secondCustomId = result.current.items[11].id;

      act(() => {
        result.current.removeCustom(firstCustomId);
      });

      expect(result.current.items).toHaveLength(11);
      expect(result.current.items.find((item) => item.id === secondCustomId)).toBeDefined();
    });
  });

  // ── reset ───────────────────────────────────────────────────────────
  describe('reset', () => {
    it('resets all items to default unchecked state', () => {
      const { result } = renderHook(() => useQualityChecklist());

      // Make some changes
      act(() => {
        result.current.toggle(result.current.items[0].id);
        result.current.toggle(result.current.items[1].id);
        result.current.updateNotes(result.current.items[2].id, 'A note');
        result.current.addCustom();
      });

      expect(result.current.items).toHaveLength(11);

      act(() => {
        result.current.reset();
      });

      expect(result.current.items).toHaveLength(10);
      result.current.items.forEach((item, i) => {
        expect(item.checked).toBe(false);
        expect(item.id).toBe(DEFAULT_CHECKLIST[i].id);
        expect(item.name).toBe(DEFAULT_CHECKLIST[i].name);
      });
    });

    it('reset clears notes from items', () => {
      const { result } = renderHook(() => useQualityChecklist());

      act(() => {
        result.current.updateNotes(result.current.items[0].id, 'Some note');
      });

      act(() => {
        result.current.reset();
      });

      // Default items do not have notes
      expect(result.current.items[0].notes).toBeUndefined();
    });

    it('reset removes custom items', () => {
      const { result } = renderHook(() => useQualityChecklist());

      act(() => {
        result.current.addCustom();
        result.current.addCustom();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.items).toHaveLength(10);
      result.current.items.forEach((item) => {
        expect(isCustomItem(item.id)).toBe(false);
      });
    });
  });

  // ── completionPercentage ────────────────────────────────────────────
  describe('completionPercentage', () => {
    it('reflects checked count — 1/10 = 10%', () => {
      const { result } = renderHook(() => useQualityChecklist());

      act(() => {
        result.current.toggle(result.current.items[0].id);
      });

      expect(result.current.completionPercentage).toBe(10);
    });

    it('reflects checked count — 5/10 = 50%', () => {
      const { result } = renderHook(() => useQualityChecklist());

      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.toggle(result.current.items[i].id);
        }
      });

      expect(result.current.completionPercentage).toBe(50);
    });

    it('reflects 100% when all items are checked', () => {
      const { result } = renderHook(() => useQualityChecklist());

      act(() => {
        result.current.items.forEach((item) => {
          result.current.toggle(item.id);
        });
      });

      expect(result.current.completionPercentage).toBe(100);
    });

    it('accounts for custom items in the denominator', () => {
      const { result } = renderHook(() => useQualityChecklist());

      act(() => {
        result.current.addCustom();
      });

      // 0/11 = 0%
      expect(result.current.completionPercentage).toBe(0);

      act(() => {
        result.current.toggle(result.current.items[0].id);
      });

      // 1/11 = ~9%
      expect(result.current.completionPercentage).toBe(9);
    });

    it('returns 0 after reset', () => {
      const { result } = renderHook(() => useQualityChecklist());

      act(() => {
        result.current.toggle(result.current.items[0].id);
      });
      expect(result.current.completionPercentage).toBe(10);

      act(() => {
        result.current.reset();
      });
      expect(result.current.completionPercentage).toBe(0);
    });
  });

  // ── suggestedStatus ─────────────────────────────────────────────────
  describe('suggestedStatus', () => {
    it('returns "failed" when no items are checked (0%)', () => {
      const { result } = renderHook(() => useQualityChecklist());
      expect(result.current.suggestedStatus).toBe('failed');
    });

    it('returns "failed" when less than 80% are checked', () => {
      const { result } = renderHook(() => useQualityChecklist());

      // Check 7/10 = 70% -> failed
      act(() => {
        for (let i = 0; i < 7; i++) {
          result.current.toggle(result.current.items[i].id);
        }
      });

      expect(result.current.suggestedStatus).toBe('failed');
    });

    it('returns "needs_review" at exactly 80%', () => {
      const { result } = renderHook(() => useQualityChecklist());

      // Check 8/10 = 80% -> needs_review
      act(() => {
        for (let i = 0; i < 8; i++) {
          result.current.toggle(result.current.items[i].id);
        }
      });

      expect(result.current.suggestedStatus).toBe('needs_review');
    });

    it('returns "needs_review" at 90%', () => {
      const { result } = renderHook(() => useQualityChecklist());

      // Check 9/10 = 90% -> needs_review
      act(() => {
        for (let i = 0; i < 9; i++) {
          result.current.toggle(result.current.items[i].id);
        }
      });

      expect(result.current.suggestedStatus).toBe('needs_review');
    });

    it('returns "passed" when all items are checked (100%)', () => {
      const { result } = renderHook(() => useQualityChecklist());

      act(() => {
        result.current.items.forEach((item) => {
          result.current.toggle(item.id);
        });
      });

      expect(result.current.suggestedStatus).toBe('passed');
    });

    it('updates when items are toggled back off', () => {
      const { result } = renderHook(() => useQualityChecklist());

      // Check all -> passed
      act(() => {
        result.current.items.forEach((item) => {
          result.current.toggle(item.id);
        });
      });
      expect(result.current.suggestedStatus).toBe('passed');

      // Uncheck one -> 90% -> needs_review
      act(() => {
        result.current.toggle(result.current.items[0].id);
      });
      expect(result.current.suggestedStatus).toBe('needs_review');
    });
  });
});
