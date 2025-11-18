/**
 * Update Order Status Screen
 *
 * Simple screen for updating order status with:
 * - Current status display
 * - Status selection dropdown
 * - Notes field for status change
 * - Submit button
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  updateOrderStatus,
  fetchOrderById,
  selectCurrentOrder,
  selectOrdersLoading,
} from '../../store/slices/ordersSlice';
import { showSuccess, showError } from '../../store/slices/uiSlice';
import { COLORS, SPACING, BORDER_RADIUS, STATUS_OPTIONS } from '../../config';

interface UpdateOrderStatusScreenProps {
  route: {
    params: {
      orderId: string;
    };
  };
  navigation: any;
}

export default function UpdateOrderStatusScreen({
  route,
  navigation,
}: UpdateOrderStatusScreenProps) {
  const { orderId } = route.params;
  const dispatch = useAppDispatch();

  const order = useAppSelector(selectCurrentOrder);
  const isLoading = useAppSelector(selectOrdersLoading);

  const [selectedStatus, setSelectedStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  useEffect(() => {
    if (order) {
      setSelectedStatus(order.status);
    }
  }, [order]);

  const loadOrder = async () => {
    try {
      await dispatch(fetchOrderById(orderId)).unwrap();
    } catch (error: any) {
      dispatch(showError(error || 'Failed to load order'));
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (!selectedStatus) {
      dispatch(showError('Pilih status baru'));
      return;
    }

    if (selectedStatus === order?.status) {
      dispatch(showError('Status tidak berubah'));
      return;
    }

    setIsSubmitting(true);

    try {
      await dispatch(
        updateOrderStatus({
          orderId,
          status: selectedStatus as any,
          notes: notes || undefined,
        })
      ).unwrap();

      dispatch(showSuccess('Status pesanan berhasil diperbarui'));
      navigation.goBack();
    } catch (error: any) {
      dispatch(showError(error || 'Gagal memperbarui status'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusOption = STATUS_OPTIONS.ORDER.find((s) => s.value === status);
    return statusOption?.color || COLORS.gray[500];
  };

  const getStatusLabel = (status: string) => {
    const statusOption = STATUS_OPTIONS.ORDER.find((s) => s.value === status);
    return statusOption?.label || status;
  };

  if (isLoading || !order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Order Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Pesanan</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nomor Pesanan:</Text>
            <Text style={styles.infoValue}>{order.order_number}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pelanggan:</Text>
            <Text style={styles.infoValue}>{order.customer_name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status Saat Ini:</Text>
            <View
              style={[
                styles.currentStatusBadge,
                { backgroundColor: getStatusColor(order.status) },
              ]}
            >
              <Text style={styles.currentStatusText}>{getStatusLabel(order.status)}</Text>
            </View>
          </View>
        </View>

        {/* Status Update */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perbarui Status</Text>

          <Text style={styles.label}>
            Status Baru <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value)}
              style={styles.picker}
            >
              {STATUS_OPTIONS.ORDER.map((status) => (
                <Picker.Item
                  key={status.value}
                  label={status.label}
                  value={status.value}
                  color={status.color}
                />
              ))}
            </Picker>
          </View>

          {selectedStatus && selectedStatus !== order.status && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Preview Status Baru:</Text>
              <View
                style={[
                  styles.previewBadge,
                  { backgroundColor: getStatusColor(selectedStatus) },
                ]}
              >
                <Text style={styles.previewText}>{getStatusLabel(selectedStatus)}</Text>
              </View>
            </View>
          )}

          <Text style={styles.label}>Catatan (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Tambahkan catatan untuk perubahan status ini..."
            multiline
            numberOfLines={4}
          />

          <Text style={styles.hint}>
            Catatan akan ditambahkan ke riwayat status pesanan
          </Text>
        </View>

        {/* Status Flow Guide */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alur Status</Text>
          <View style={styles.flowContainer}>
            {STATUS_OPTIONS.ORDER.filter((s) => s.value !== 'cancelled').map(
              (status, index) => (
                <View key={status.value} style={styles.flowItem}>
                  <View
                    style={[
                      styles.flowDot,
                      { backgroundColor: status.color },
                      order.status === status.value && styles.flowDotActive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.flowText,
                      order.status === status.value && styles.flowTextActive,
                    ]}
                  >
                    {status.label}
                  </Text>
                  {index < STATUS_OPTIONS.ORDER.length - 2 && (
                    <View style={styles.flowArrow}>
                      <Text style={styles.flowArrowText}>↓</Text>
                    </View>
                  )}
                </View>
              )
            )}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelButtonText}>Batal</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || selectedStatus === order.status}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>Perbarui Status</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.white,
    marginTop: SPACING.md,
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  currentStatusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  currentStatusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  required: {
    color: COLORS.error,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
  },
  picker: {
    height: 50,
  },
  previewContainer: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  previewBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  previewText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  flowContainer: {
    alignItems: 'center',
  },
  flowItem: {
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  flowDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: SPACING.xs,
  },
  flowDotActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  flowText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  flowTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  flowArrow: {
    marginVertical: SPACING.xs,
  },
  flowArrowText: {
    fontSize: 20,
    color: COLORS.gray[400],
  },
  actionButtons: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    gap: SPACING.sm,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
