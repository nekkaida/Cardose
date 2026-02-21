import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Order, StatusOption } from '../types';
import { theme } from '../../../theme/theme';

interface StatusChangeModalProps {
  visible: boolean;
  order: Order | null;
  statuses: StatusOption[];
  isUpdating: boolean;
  onStatusChange: (newStatus: string) => void;
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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Update Status</Text>
          {order && (
            <Text style={styles.modalSubtitle}>
              {order.order_number} — {order.customer_name}
            </Text>
          )}

          <View style={styles.statusOptions}>
            {statuses.map(status => (
              <TouchableOpacity
                key={status.value}
                style={[
                  styles.statusOption,
                  order?.status === status.value && styles.statusOptionCurrent,
                  { borderLeftColor: status.color },
                ]}
                onPress={() => onStatusChange(status.value)}
                disabled={isUpdating || order?.status === status.value}
              >
                <View style={[styles.statusOptionDot, { backgroundColor: status.color }]} />
                <Text style={[
                  styles.statusOptionText,
                  order?.status === status.value && styles.statusOptionTextCurrent,
                ]}>
                  {status.label}
                </Text>
                {order?.status === status.value && (
                  <Text style={styles.currentLabel}>Current</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {isUpdating && (
            <ActivityIndicator style={{ marginTop: 12 }} color={theme.colors.primary} />
          )}

          <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  statusOptions: {
    gap: 6,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceVariant,
    borderLeftWidth: 4,
    gap: 10,
  },
  statusOptionCurrent: {
    backgroundColor: '#EEF2FF',
  },
  statusOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
  },
  statusOptionTextCurrent: {
    fontWeight: '700',
  },
  currentLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  modalCancel: {
    marginTop: 16,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});
