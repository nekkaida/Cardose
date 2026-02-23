import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { theme } from '../../../theme/theme';

interface EmptyStateProps {
  hasFilters?: boolean;
}

export default function EmptyState({ hasFilters }: EmptyStateProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={
        hasFilters
          ? 'Tidak ada hasil ditemukan. Coba ubah filter.'
          : 'Belum ada pesanan. Buat pesanan melalui web dashboard.'
      }
    >
      <View style={styles.iconWrap}>
        <Icon
          source={hasFilters ? 'magnify-close' : 'clipboard-text-outline'}
          size={32}
          color={theme.colors.textSecondary}
        />
      </View>
      <Text style={styles.title}>
        {hasFilters ? 'Tidak Ada Hasil' : 'Belum Ada Pesanan'}
      </Text>
      <Text style={styles.subtitle}>
        {hasFilters
          ? 'Coba ubah filter atau kata pencarian Anda'
          : 'Buat pesanan baru melalui web dashboard'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.backgroundVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
