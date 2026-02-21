/**
 * String Helper Functions
 *
 * Utilities for string manipulation, initials, and avatar colors.
 */

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';

  const words = name.trim().split(' ');
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

/**
 * Generate random color for avatar
 */
export const getAvatarColor = (name: string): string => {
  const colors = [
    '#F44336',
    '#E91E63',
    '#9C27B0',
    '#673AB7',
    '#3F51B5',
    '#2196F3',
    '#03A9F4',
    '#00BCD4',
    '#009688',
    '#4CAF50',
    '#8BC34A',
    '#CDDC39',
    '#FFC107',
    '#FF9800',
    '#FF5722',
  ];

  const hash = name
    .split('')
    .reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  return colors[Math.abs(hash) % colors.length];
};
