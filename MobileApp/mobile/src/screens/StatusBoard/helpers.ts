import { StatusOption } from './types';
import { theme } from '../../theme/theme';

export const getStatusColor = (statuses: StatusOption[], status: string): string => {
  return statuses.find(s => s.value === status)?.color || theme.colors.disabled;
};

export const getStatusLabel = (statuses: StatusOption[], status: string): string => {
  return statuses.find(s => s.value === status)?.label || status;
};

export const isOverdue = (dueDate: string): boolean => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};
