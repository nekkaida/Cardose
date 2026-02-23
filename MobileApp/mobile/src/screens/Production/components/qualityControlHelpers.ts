import { theme } from '../../../theme/theme';
import type { ChecklistItem, QCStatus } from '../types';

// Re-export types so existing imports from './components' still work
export type { ChecklistItem, QualityCheck, QCStatus } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 'default_1', name: 'Material quality inspection', checked: false },
  { id: 'default_2', name: 'Dimensions accuracy check', checked: false },
  { id: 'default_3', name: 'Color matching verification', checked: false },
  { id: 'default_4', name: 'Structural integrity test', checked: false },
  { id: 'default_5', name: 'Finishing quality review', checked: false },
  { id: 'default_6', name: 'Assembly completeness check', checked: false },
  { id: 'default_7', name: 'Branding/labeling accuracy', checked: false },
  { id: 'default_8', name: 'Packaging condition inspection', checked: false },
  { id: 'default_9', name: 'Final cleanliness check', checked: false },
  { id: 'default_10', name: 'Documentation completeness', checked: false },
];

const DEFAULT_ITEM_IDS = new Set(DEFAULT_CHECKLIST.map((item) => item.id));

export const STATUS_OPTIONS: ReadonlyArray<{ value: QCStatus; label: string }> = [
  { value: 'passed', label: 'Passed' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'failed', label: 'Failed' },
];

// ---------------------------------------------------------------------------
// ID generation (collision-resistant without external deps)
// ---------------------------------------------------------------------------

let _idCounter = 0;

export const generateItemId = (): string => {
  _idCounter += 1;
  return `custom_${Date.now()}_${_idCounter}`;
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export const calculateCompletionPercentage = (items: ChecklistItem[]): number => {
  if (items.length === 0) return 0;
  const checkedCount = items.filter((item) => item.checked).length;
  return Math.round((checkedCount / items.length) * 100);
};

export const determineStatus = (items: ChecklistItem[]): QCStatus => {
  const pct = calculateCompletionPercentage(items);
  if (pct === 100) return 'passed';
  if (pct >= 80) return 'needs_review';
  return 'failed';
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getStatusColor = (status: QCStatus | string): string => {
  switch (status) {
    case 'passed':
      return theme.colors.success;
    case 'needs_review':
      return theme.colors.warning;
    case 'failed':
      return theme.colors.error;
    default:
      return theme.colors.textSecondary;
  }
};

export const getStatusLabel = (status: QCStatus): string => {
  const option = STATUS_OPTIONS.find((o) => o.value === status);
  return option?.label ?? status;
};

export const isCustomItem = (itemId: string): boolean => {
  return !DEFAULT_ITEM_IDS.has(itemId);
};
