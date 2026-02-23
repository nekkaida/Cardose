import { useState, useCallback, useMemo } from 'react';
import type { ChecklistItem, QCStatus } from '../types';
import {
  DEFAULT_CHECKLIST,
  generateItemId,
  calculateCompletionPercentage,
  determineStatus,
  isCustomItem,
} from '../components/qualityControlHelpers';

export interface UseQualityChecklistReturn {
  items: ChecklistItem[];
  completionPercentage: number;
  suggestedStatus: QCStatus;
  toggle: (itemId: string) => void;
  updateNotes: (itemId: string, notes: string) => void;
  updateName: (itemId: string, name: string) => void;
  addCustom: () => void;
  removeCustom: (itemId: string) => void;
  reset: () => void;
}

export function useQualityChecklist(): UseQualityChecklistReturn {
  const [items, setItems] = useState<ChecklistItem[]>(
    () => DEFAULT_CHECKLIST.map((item) => ({ ...item }))
  );

  const toggle = useCallback((itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    );
  }, []);

  const updateNotes = useCallback((itemId: string, notes: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, notes } : item
      )
    );
  }, []);

  const updateName = useCallback((itemId: string, name: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, name } : item
      )
    );
  }, []);

  const addCustom = useCallback(() => {
    const newItem: ChecklistItem = {
      id: generateItemId(),
      name: '',
      checked: false,
    };
    setItems((prev) => [...prev, newItem]);
  }, []);

  const removeCustom = useCallback((itemId: string) => {
    if (!isCustomItem(itemId)) return;
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const reset = useCallback(() => {
    setItems(DEFAULT_CHECKLIST.map((item) => ({ ...item })));
  }, []);

  const completionPercentage = useMemo(
    () => calculateCompletionPercentage(items),
    [items]
  );

  const suggestedStatus = useMemo(
    () => determineStatus(items),
    [items]
  );

  return {
    items,
    completionPercentage,
    suggestedStatus,
    toggle,
    updateNotes,
    updateName,
    addCustom,
    removeCustom,
    reset,
  };
}
