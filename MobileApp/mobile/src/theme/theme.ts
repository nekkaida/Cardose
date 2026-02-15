import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2C5530', // Premium Gift Box brand green
    secondary: '#C4A962', // Gold accent
    accent: '#4A7C59', // Lighter green
    background: '#f5f5f5',
    backgroundVariant: '#F3F4F6',
    surface: '#ffffff',
    surfaceVariant: '#F9FAFB',
    text: '#1a1a1a',
    textSecondary: '#666666',
    disabled: '#c0c0c0',
    placeholder: '#999999',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    onSurface: '#1a1a1a',
    notification: '#ff6b6b',
    border: '#eeeeee',
    borderDark: '#dddddd',
    divider: '#E5E7EB',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    errorLight: '#FEF2F2',
    errorBorder: '#EF4444',
  },
  roundness: 8,
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'System',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500' as const,
    },
    bold: {
      fontFamily: 'System',
      fontWeight: '700' as const,
    },
  },
};