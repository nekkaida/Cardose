import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../theme/theme';

export const BrandHeader: React.FC = () => (
  <View style={styles.header}>
    <Text style={styles.title}>🎁 Cardose</Text>
    <Text style={styles.subtitle}>Premium Gift Box Management</Text>
  </View>
);

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
});
