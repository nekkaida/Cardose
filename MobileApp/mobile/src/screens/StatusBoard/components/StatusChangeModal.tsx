import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { Order, OrderStatus, StatusOption, VALID_TRANSITIONS } from '../types';
import { theme } from '../../../theme/theme';

interface StatusChangeModalProps {
  visible: boolean;
  order: Order | null;
  statuses: StatusOption[];
  isUpdating: boolean;
  onStatusChange: (newStatus: OrderStatus) => void;
  onClose: () => void;
}

export default function StatusChangeModal({
  visible,
  order,
  statuses,
  isUpdating,
  onStatusChange,
  onClose,
}: StatusChangeModalProps) {
  const validNextStatuses = order
    ? VALID_TRANSITIONS[order.status] ?? []
    : [];
  const isTerminal = order != null && validNextStatuses.length === 0;

  // Partition: valid transitions first, then invalid (dimmed)
  // For terminal statuses, show no transitions at all.
  const validStatuses = isTerminal
    ? []
    : statuses.filter(
        s => s.value !== order?.status && validNextStatuses.includes(s.value),
      );
  const invalidStatuses = isTerminal
    ? []
    : statuses.filter(
        s => s.value !== order?.status && !validNextStatuses.includes(s.value),
      );
  const currentStatus = statuses.find(s => s.value === order?.status);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Tutup modal">
        <Pressable style={styles.content}>
        <View style={styles.handle} />

        <Text style={styles.title} accessibilityRole="header">
          Ubah Status
        </Text>
        {order && (
          <Text style={styles.subtitle}>
            {order.order_number} — {order.customer_name || '-'}
          </Text>
        )}

        {/* Current status indicator */}
        {currentStatus && (
          <View
            style={[styles.currentStatusRow, { borderLeftColor: currentStatus.color }]}
            accessibilityLabel={`Status saat ini: ${currentStatus.label}`}
          >
            <View style={[styles.optionDot, { backgroundColor: currentStatus.color }]} />
            <Text style={styles.currentStatusText}>{currentStatus.label}</Text>
            <Text style={styles.currentLabel}>Saat ini</Text>
          </View>
        )}

        <ScrollView style={styles.optionsList} bounces={false}>
          {/* Valid transitions */}
          {validStatuses.length > 0 && (
            <Text style={styles.sectionLabel}>Langkah Selanjutnya</Text>
          )}
          {validStatuses.map(status => {
            const isDestructive = status.value === 'cancelled';
            return (
              <TouchableOpacity
                key={status.value}
                style={[styles.option, { borderLeftColor: status.color }]}
                onPress={() => onStatusChange(status.value)}
                disabled={isUpdating}
                accessibilityRole="button"
                accessibilityState={{ disabled: isUpdating }}
                accessibilityLabel={`${status.label}${isDestructive ? ', tindakan ini tidak dapat diurungkan' : ''}`}
              >
                <View style={[styles.optionDot, { backgroundColor: status.color }]} />
                <Text style={styles.optionText}>{status.label}</Text>
                {isDestructive && (
                  <Icon source="alert-outline" size={16} color={theme.colors.warning} />
                )}
              </TouchableOpacity>
            );
          })}

          {/* Invalid transitions (dimmed, collapsible) */}
          {invalidStatuses.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Lainnya</Text>
              {invalidStatuses.map(status => {
                const isDestructive = status.value === 'cancelled';
                return (
                  <TouchableOpacity
                    key={status.value}
                    style={[styles.option, styles.optionDimmed, { borderLeftColor: status.color + '60' }]}
                    onPress={() => onStatusChange(status.value)}
                    disabled={isUpdating}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isUpdating }}
                    accessibilityLabel={`${status.label}, bukan langkah normal${isDestructive ? ', tindakan ini tidak dapat diurungkan' : ''}`}
                  >
                    <View style={[styles.optionDot, { backgroundColor: status.color + '60' }]} />
                    <Text style={[styles.optionText, styles.optionTextDimmed]}>
                      {status.label}
                    </Text>
                    {isDestructive && (
                      <Icon source="alert-outline" size={16} color={theme.colors.warning} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}
          {/* No transitions available (terminal status) */}
          {validStatuses.length === 0 && invalidStatuses.length === 0 && (
            <View style={styles.noTransitions}>
              <Icon source="check-circle" size={24} color={theme.colors.textSecondary} />
              <Text style={styles.noTransitionsText}>
                Pesanan ini sudah final dan tidak dapat diubah statusnya.
              </Text>
            </View>
          )}
        </ScrollView>

        {isUpdating && (
          <ActivityIndicator
            style={styles.spinner}
            color={theme.colors.primary}
          />
        )}

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Batal"
        >
          <Text style={styles.cancelText}>Batal</Text>
        </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.divider,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  currentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.backgroundVariant,
    borderLeftWidth: 4,
    gap: 10,
    marginBottom: 12,
  },
  currentStatusText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 6,
    marginLeft: 4,
  },
  optionsList: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceVariant,
    borderLeftWidth: 4,
    gap: 10,
    marginBottom: 6,
  },
  optionDimmed: {
    opacity: 0.5,
  },
  optionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
  },
  optionTextDimmed: {
    color: theme.colors.textSecondary,
  },
  currentLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  spinner: {
    marginTop: 12,
  },
  cancelButton: {
    marginTop: 16,
    padding: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  noTransitions: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  noTransitionsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
