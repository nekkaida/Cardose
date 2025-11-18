/**
 * Invoice Details Screen
 *
 * Displays detailed invoice information including:
 * - Invoice header with status and amounts
 * - Customer information
 * - Line items
 * - Payment history
 * - Actions (send, record payment)
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
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchInvoiceById,
  sendInvoice,
  selectCurrentInvoice,
  selectFinancialLoading,
} from '../../store/slices/financialSlice';
import { showSuccess, showError } from '../../store/slices/uiSlice';
import { COLORS, SPACING, BORDER_RADIUS, STATUS_OPTIONS, BUSINESS_CONFIG } from '../../config';

interface InvoiceDetailsScreenProps {
  route: {
    params: {
      invoiceId: string;
    };
  };
  navigation: any;
}

export default function InvoiceDetailsScreen({ route, navigation }: InvoiceDetailsScreenProps) {
  const { invoiceId } = route.params;
  const dispatch = useAppDispatch();

  const invoice = useAppSelector(selectCurrentInvoice);
  const isLoading = useAppSelector(selectFinancialLoading);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      await dispatch(fetchInvoiceById(invoiceId)).unwrap();
    } catch (error: any) {
      dispatch(showError(error || 'Failed to load invoice'));
      navigation.goBack();
    }
  };

  const handleSendInvoice = () => {
    Alert.alert(
      'Kirim Invoice',
      'Kirim invoice ini ke pelanggan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Kirim',
          onPress: async () => {
            try {
              await dispatch(sendInvoice(invoiceId)).unwrap();
              dispatch(showSuccess('Invoice berhasil dikirim'));
            } catch (error: any) {
              dispatch(showError(error || 'Failed to send invoice'));
            }
          },
        },
      ]
    );
  };

  const handleRecordPayment = () => {
    navigation.navigate('RecordPayment', { invoiceId });
  };

  const handleEdit = () => {
    navigation.navigate('EditInvoice', { invoiceId });
  };

  const getStatusColor = (status: string) => {
    const statusOption = STATUS_OPTIONS.INVOICE.find(s => s.value === status);
    return statusOption?.color || COLORS.gray[500];
  };

  const getStatusLabel = (status: string) => {
    const statusOption = STATUS_OPTIONS.INVOICE.find(s => s.value === status);
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

  if (isLoading || !invoice) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat detail invoice...</Text>
      </View>
    );
  }

  const paidAmount = invoice.paid_amount || 0;
  const remainingAmount = invoice.total_amount - paidAmount;
  const isPaid = invoice.status === 'paid';
  const canSend = invoice.status === 'draft';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(invoice.status)}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        {canSend && (
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.sendButton} onPress={handleSendInvoice}>
              <Text style={styles.sendButtonText}>📤 Kirim Invoice</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isPaid && invoice.status !== 'draft' && (
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.paymentButton} onPress={handleRecordPayment}>
              <Text style={styles.paymentButtonText}>💰 Catat Pembayaran</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Pelanggan</Text>

          {invoice.customer_name && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nama:</Text>
              <Text style={styles.infoValue}>{invoice.customer_name}</Text>
            </View>
          )}

          {invoice.customer_email && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{invoice.customer_email}</Text>
            </View>
          )}

          {invoice.customer_address && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Alamat:</Text>
              <Text style={styles.infoValue}>{invoice.customer_address}</Text>
            </View>
          )}
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detail Invoice</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tanggal Invoice:</Text>
            <Text style={styles.infoValue}>
              {invoice.issue_date ? formatDate(invoice.issue_date) : '-'}
            </Text>
          </View>

          {invoice.due_date && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Jatuh Tempo:</Text>
              <Text style={styles.infoValue}>{formatDate(invoice.due_date)}</Text>
            </View>
          )}

          {invoice.order_number && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nomor Pesanan:</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('OrderDetails', { orderId: invoice.order_id })}
              >
                <Text style={[styles.infoValue, styles.linkText]}>
                  {invoice.order_number} →
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Line Items */}
        {invoice.items && invoice.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Item</Text>
            {invoice.items.map((item: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.description}</Text>
                  <Text style={styles.itemDetails}>
                    {item.quantity} x {formatCurrency(item.unit_price)}
                  </Text>
                </View>
                <Text style={styles.itemAmount}>{formatCurrency(item.total)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Amount Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ringkasan</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Subtotal:</Text>
            <Text style={styles.infoValue}>{formatCurrency(invoice.subtotal || 0)}</Text>
          </View>

          {invoice.tax_amount && invoice.tax_amount > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>PPN {BUSINESS_CONFIG.PPN_RATE * 100}%:</Text>
              <Text style={styles.infoValue}>{formatCurrency(invoice.tax_amount)}</Text>
            </View>
          )}

          {invoice.discount_amount && invoice.discount_amount > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Diskon:</Text>
              <Text style={[styles.infoValue, styles.discountText]}>
                -{formatCurrency(invoice.discount_amount)}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.total_amount)}</Text>
          </View>

          {paidAmount > 0 && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Dibayar:</Text>
                <Text style={[styles.infoValue, styles.paidText]}>
                  {formatCurrency(paidAmount)}
                </Text>
              </View>

              {remainingAmount > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Sisa:</Text>
                  <Text style={[styles.infoValue, styles.remainingText]}>
                    {formatCurrency(remainingAmount)}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Riwayat Pembayaran</Text>
            {invoice.payments.map((payment: any, index: number) => (
              <View key={index} style={styles.paymentItem}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentDate}>
                    {formatDate(payment.payment_date)}
                  </Text>
                  <Text style={styles.paymentMethod}>{payment.payment_method}</Text>
                </View>
                <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Catatan</Text>
            <Text style={styles.notes}>{invoice.notes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => dispatch(showSuccess('Fitur download PDF segera hadir'))}
        >
          <Text style={styles.downloadButtonText}>📄 Download PDF</Text>
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
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  invoiceNumber: {
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
  quickActions: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  sendButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  paymentButton: {
    backgroundColor: COLORS.success,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  paymentButtonText: {
    color: COLORS.white,
    fontSize: 16,
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
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
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
  paidText: {
    color: COLORS.success,
    fontWeight: '600',
  },
  remainingText: {
    color: COLORS.warning,
    fontWeight: '600',
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  paymentInfo: {
    flex: 1,
  },
  paymentDate: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  notes: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
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
    backgroundColor: COLORS.gray[100],
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  editButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  downloadButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
