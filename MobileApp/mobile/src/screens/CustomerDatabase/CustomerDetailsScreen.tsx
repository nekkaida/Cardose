/**
 * Customer Details Screen
 *
 * Displays detailed customer information including:
 * - Basic info (name, contact, address)
 * - Customer metrics (total orders, revenue)
 * - Recent orders
 * - Contact actions (call, WhatsApp, email)
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchCustomerById,
  deleteCustomer,
  selectCurrentCustomer,
  selectCustomersLoading,
} from '../../store/slices/customersSlice';
import { showSuccess, showError } from '../../store/slices/uiSlice';
import { COLORS, SPACING, BORDER_RADIUS, BUSINESS_CONFIG } from '../../config';

interface CustomerDetailsScreenProps {
  route: {
    params: {
      customerId: string;
    };
  };
  navigation: any;
}

export default function CustomerDetailsScreen({
  route,
  navigation,
}: CustomerDetailsScreenProps) {
  const { customerId } = route.params;
  const dispatch = useAppDispatch();

  const customer = useAppSelector(selectCurrentCustomer);
  const isLoading = useAppSelector(selectCustomersLoading);

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  const loadCustomer = async () => {
    try {
      await dispatch(fetchCustomerById(customerId)).unwrap();
    } catch (error: any) {
      dispatch(showError(error || 'Failed to load customer'));
      navigation.goBack();
    }
  };

  const handleCall = () => {
    if (customer?.phone) {
      Linking.openURL(`tel:${customer.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (customer?.phone) {
      // Format phone for WhatsApp (remove leading 0, add country code)
      const phone = customer.phone.startsWith('0')
        ? BUSINESS_CONFIG.WHATSAPP_COUNTRY_CODE + customer.phone.substring(1)
        : customer.phone;
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  };

  const handleEmail = () => {
    if (customer?.email) {
      Linking.openURL(`mailto:${customer.email}`);
    }
  };

  const handleEdit = () => {
    navigation.navigate('EditCustomer', { customerId: customer?.id });
  };

  const handleDelete = () => {
    Alert.alert(
      'Hapus Pelanggan',
      'Apakah Anda yakin ingin menghapus pelanggan ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteCustomer(customerId)).unwrap();
              dispatch(showSuccess('Pelanggan berhasil dihapus'));
              navigation.goBack();
            } catch (error: any) {
              dispatch(showError(error || 'Failed to delete customer'));
            }
          },
        },
      ]
    );
  };

  const handleViewOrders = () => {
    navigation.navigate('Orders', {
      screen: 'OrdersList',
      params: { customerId: customer?.id }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: BUSINESS_CONFIG.CURRENCY,
    }).format(amount);
  };

  if (isLoading || !customer) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat detail pelanggan...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.customerName}>{customer.name}</Text>
          {customer.type && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>
                {customer.type === 'company' ? 'Perusahaan' : 'Individu'}
              </Text>
            </View>
          )}
        </View>

        {/* Contact Actions */}
        <View style={styles.contactActions}>
          {customer.phone && (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
                <Text style={styles.actionIcon}>📞</Text>
                <Text style={styles.actionText}>Telepon</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp}>
                <Text style={styles.actionIcon}>💬</Text>
                <Text style={styles.actionText}>WhatsApp</Text>
              </TouchableOpacity>
            </>
          )}

          {customer.email && (
            <TouchableOpacity style={styles.actionButton} onPress={handleEmail}>
              <Text style={styles.actionIcon}>📧</Text>
              <Text style={styles.actionText}>Email</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Metrics */}
        {customer.metrics && (
          <View style={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{customer.metrics.total_orders || 0}</Text>
              <Text style={styles.metricLabel}>Total Pesanan</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {formatCurrency(customer.metrics.total_value || 0)}
              </Text>
              <Text style={styles.metricLabel}>Total Nilai</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {formatCurrency(customer.metrics.average_order_value || 0)}
              </Text>
              <Text style={styles.metricLabel}>Rata-rata</Text>
            </View>
          </View>
        )}

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Kontak</Text>

          {customer.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telepon:</Text>
              <Text style={styles.infoValue}>{customer.phone}</Text>
            </View>
          )}

          {customer.email && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{customer.email}</Text>
            </View>
          )}

          {customer.address && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Alamat:</Text>
              <Text style={styles.infoValue}>
                {typeof customer.address === 'string'
                  ? customer.address
                  : [
                      customer.address.street,
                      customer.address.city,
                      customer.address.province,
                      customer.address.postal_code
                    ].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </View>

        {/* Company Information */}
        {customer.type === 'company' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informasi Perusahaan</Text>

            {customer.company_name && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nama Perusahaan:</Text>
                <Text style={styles.infoValue}>{customer.company_name}</Text>
              </View>
            )}

            {customer.tax_id && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>NPWP:</Text>
                <Text style={styles.infoValue}>{customer.tax_id}</Text>
              </View>
            )}

            {customer.contact_person && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Contact Person:</Text>
                <Text style={styles.infoValue}>{customer.contact_person}</Text>
              </View>
            )}
          </View>
        )}

        {/* Additional Info */}
        {customer.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Catatan</Text>
            <Text style={styles.notes}>{customer.notes}</Text>
          </View>
        )}

        {/* Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pesanan</Text>
            <TouchableOpacity onPress={handleViewOrders}>
              <Text style={styles.viewAllText}>Lihat Semua →</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.viewOrdersButton} onPress={handleViewOrders}>
            <Text style={styles.viewOrdersButtonText}>
              Lihat Semua Pesanan dari {customer.name}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Timestamps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Sistem</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dibuat:</Text>
            <Text style={styles.infoValue}>
              {new Date(customer.created_at).toLocaleDateString('id-ID')}
            </Text>
          </View>

          {customer.updated_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Terakhir Diupdate:</Text>
              <Text style={styles.infoValue}>
                {new Date(customer.updated_at).toLocaleDateString('id-ID')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Hapus</Text>
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
  header: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  customerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  typeBadge: {
    backgroundColor: COLORS.gray[200],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  typeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  contactActions: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: SPACING.xs,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  metricsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    justifyContent: 'space-around',
    marginTop: SPACING.md,
  },
  metricCard: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  section: {
    backgroundColor: COLORS.white,
    marginTop: SPACING.md,
    padding: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
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
  notes: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  viewOrdersButton: {
    backgroundColor: COLORS.gray[100],
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  viewOrdersButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    gap: SPACING.sm,
  },
  editButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
  },
});
