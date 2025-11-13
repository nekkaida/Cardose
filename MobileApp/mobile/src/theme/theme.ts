import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2C5530', // Premium Gift Box brand green
    secondary: '#C4A962', // Gold accent
    accent: '#4A7C59', // Lighter green
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#1a1a1a',
    disabled: '#c0c0c0',
    placeholder: '#999999',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    onSurface: '#1a1a1a',
    notification: '#ff6b6b',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
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