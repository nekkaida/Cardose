import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { theme } from '../../../theme/theme';

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.iconWrap}>
        <Icon
          source="alert-circle-outline"
          size={40}
          color={theme.colors.errorBorder}
        />
      </View>
      <Text style={styles.title}>Gagal Memuat</Text>
      <Text style={styles.message}>
        {message || 'Tidak dapat memuat data. Periksa koneksi internet Anda.'}
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Coba lagi memuat data"
      >
        <Icon source="refresh" size={16} color={theme.colors.surface} />
        <Text style={styles.retryText}>Coba Lagi</Text>
      </TouchableOpacity>
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
    backgroundColor: theme.colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
});
