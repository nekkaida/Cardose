/**
 * Order Details Screen
 *
 * Displays detailed information about a specific order including:
 * - Order header with status and dates
 * - Customer information
 * - Materials and specifications
 * - Production timeline
 * - Actions (edit, update status, delete)
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchOrderById, deleteOrder, selectCurrentOrder, selectOrdersLoading } from '../../store/slices/ordersSlice';
import { showSuccess, showError } from '../../store/slices/uiSlice';
import { COLORS, SPACING, BORDER_RADIUS, BUSINESS_CONFIG, STATUS_OPTIONS } from '../../config';

interface OrderDetailsScreenProps {
  route: {
    params: {
      orderId: string;
    };
  };
  navigation: any;
}

export default function OrderDetailsScreen({ route, navigation }: OrderDetailsScreenProps) {
  const { orderId } = route.params;
  const dispatch = useAppDispatch();

  const order = useAppSelector(selectCurrentOrder);
  const isLoading = useAppSelector(selectOrdersLoading);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      await dispatch(fetchOrderById(orderId)).unwrap();
    } catch (error: any) {
      dispatch(showError(error || 'Failed to load order'));
      navigation.goBack();
    }
  };

  const handleUpdateStatus = () => {
    navigation.navigate('UpdateOrderStatus', { orderId: order?.id });
  };

  const handleEdit = () => {
    navigation.navigate('EditOrder', { orderId: order?.id });
  };

  const handleDelete = () => {
    Alert.alert(
      'Hapus Pesanan',
      'Apakah Anda yakin ingin menghapus pesanan ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteOrder(orderId)).unwrap();
              dispatch(showSuccess('Pesanan berhasil dihapus'));
              navigation.goBack();
            } catch (error: any) {
              dispatch(showError(error || 'Failed to delete order'));
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    const statusOption = STATUS_OPTIONS.ORDER.find(s => s.value === status);
    return statusOption?.color || COLORS.gray[500];
  };

  const getStatusLabel = (status: string) => {
    const statusOption = STATUS_OPTIONS.ORDER.find(s => s.value === status);
    return statusOption?.label || status;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: BUSINESS_CONFIG.CURRENCY,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading || !order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat detail pesanan...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.orderNumber}>{order.order_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Pelanggan</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nama:</Text>
            <Text style={styles.infoValue}>{order.customer_name || '-'}</Text>
          </View>
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => navigation.navigate('CustomerDetails', { customerId: order.customer_id })}
          >
            <Text style={styles.infoLabel}>Lihat Detail:</Text>
            <Text style={[styles.infoValue, styles.linkText]}>Buka Profil Pelanggan →</Text>
          </TouchableOpacity>
        </View>

        {/* Order Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detail Pesanan</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Jenis Box:</Text>
            <Text style={styles.infoValue}>{order.box_type || '-'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Jumlah:</Text>
            <Text style={styles.infoValue}>{order.quantity} unit</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dimensi:</Text>
            <Text style={styles.infoValue}>
              {order.dimensions?.length} x {order.dimensions?.width} x {order.dimensions?.height} cm
            </Text>
          </View>

          {order.special_requirements && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Spesifikasi Khusus:</Text>
              <Text style={styles.infoValue}>{order.special_requirements}</Text>
            </View>
          )}

          {order.notes && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Catatan:</Text>
              <Text style={styles.infoValue}>{order.notes}</Text>
            </View>
          )}
        </View>

        {/* Materials */}
        {order.materials && order.materials.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Material</Text>
            {order.materials.map((material: any, index: number) => (
              <View key={index} style={styles.materialItem}>
                <Text style={styles.materialName}>{material.name}</Text>
                <Text style={styles.materialQuantity}>{material.quantity} {material.unit}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Harga</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Harga Satuan:</Text>
            <Text style={styles.infoValue}>{formatCurrency(order.unit_price || 0)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Subtotal:</Text>
            <Text style={styles.infoValue}>
              {formatCurrency((order.unit_price || 0) * order.quantity)}
            </Text>
          </View>

          {order.discount_amount && order.discount_amount > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Diskon:</Text>
              <Text style={[styles.infoValue, styles.discountText]}>
                -{formatCurrency(order.discount_amount)}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.total_price)}</Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tanggal Pesanan:</Text>
            <Text style={styles.infoValue}>{formatDate(order.order_date)}</Text>
          </View>

          {order.delivery_date && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tanggal Pengiriman:</Text>
              <Text style={styles.infoValue}>{formatDate(order.delivery_date)}</Text>
            </View>
          )}

          {order.completed_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Selesai:</Text>
              <Text style={styles.infoValue}>{formatDate(order.completed_at)}</Text>
            </View>
          )}
        </View>

        {/* Status History */}
        {order.status_history && order.status_history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Riwayat Status</Text>
            {order.status_history.map((history: any, index: number) => (
              <View key={index} style={styles.historyItem}>
                <View style={[styles.historyDot, { backgroundColor: getStatusColor(history.status) }]} />
                <View style={styles.historyContent}>
                  <Text style={styles.historyStatus}>{getStatusLabel(history.status)}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(history.changed_at).toLocaleString('id-ID')}
                  </Text>
                  {history.notes && <Text style={styles.historyNotes}>{history.notes}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.updateStatusButton} onPress={handleUpdateStatus}>
          <Text style={styles.updateStatusButtonText}>Ubah Status</Text>
        </TouchableOpacity>

        <View style={styles.secondaryButtons}>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Hapus</Text>
          </TouchableOpacity>
        </View>
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
  header: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  orderNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
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
    paddingVertical: SPACING.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  linkText: {
    color: COLORS.primary,
  },
  materialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  materialName: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  materialQuantity: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray[200],
    marginVertical: SPACING.sm,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  discountText: {
    color: COLORS.error,
  },
  historyItem: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.md,
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
  },
  historyStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  historyNotes: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  actionButtons: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  updateStatusButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  updateStatusButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  editButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
