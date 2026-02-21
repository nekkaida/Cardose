import { theme } from '../../../theme/theme';

export interface ChecklistItem {
  id: string;
  name: string;
  checked: boolean;
  notes?: string;
}

export interface QualityCheck {
  id: string;
  order_id: string;
  checklist_items: ChecklistItem[];
  overall_status: string;
  notes?: string;
  checked_by_name?: string;
  checked_at: string;
}

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: '1', name: 'Material quality inspection', checked: false },
  { id: '2', name: 'Dimensions accuracy check', checked: false },
  { id: '3', name: 'Color matching verification', checked: false },
  { id: '4', name: 'Structural integrity test', checked: false },
  { id: '5', name: 'Finishing quality review', checked: false },
  { id: '6', name: 'Assembly completeness check', checked: false },
  { id: '7', name: 'Branding/labeling accuracy', checked: false },
  { id: '8', name: 'Packaging condition inspection', checked: false },
  { id: '9', name: 'Final cleanliness check', checked: false },
  { id: '10', name: 'Documentation completeness', checked: false },
];

export const STATUS_OPTIONS = [
  { value: 'passed', label: 'Passed' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'failed', label: 'Failed' },
] as const;

export const calculateCompletionPercentage = (items: ChecklistItem[]): number => {
  if (items.length === 0) return 0;
  const checkedCount = items.filter((item) => item.checked).length;
  return Math.round((checkedCount / items.length) * 100);
};

export const determineStatus = (items: ChecklistItem[]): string => {
  const completionPercentage = calculateCompletionPercentage(items);

  if (completionPercentage === 100) {
    return 'passed';
  } else if (completionPercentage >= 80) {
    return 'needs_review';
  } else {
    return 'failed';
  }
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

export const getStatusColor = (status: string): string => {
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

export const isCustomItem = (itemId: string): boolean => {
  return !DEFAULT_CHECKLIST.find((d) => d.id === itemId);
};
