/**
 * Record Payment Screen
 *
 * Features:
 * - Record payments for invoices
 * - Multiple payment methods
 * - Partial payment support
 * - Payment validation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  recordPayment,
  selectInvoiceById,
} from '../../store/slices/financialSlice';
import { showSuccess, showError } from '../../store/slices/uiSlice';
import { COLORS } from '../../config';
import { formatCurrency, formatDate } from '../../utils';

type FinancialStackParamList = {
  RecordPayment: { invoiceId: string };
};

type NavigationProp = StackNavigationProp<FinancialStackParamList>;
type RecordPaymentRouteProp = RouteProp<
  FinancialStackParamList,
  'RecordPayment'
>;

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Tunai' },
  { value: 'bank_transfer', label: 'Transfer Bank' },
  { value: 'credit_card', label: 'Kartu Kredit' },
  { value: 'mobile_payment', label: 'E-Wallet' },
];

export default function RecordPaymentScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RecordPaymentRouteProp>();
  const dispatch = useAppDispatch();

  const { invoiceId } = route.params;

  const invoice = useAppSelector((state) =>
    selectInvoiceById(state, invoiceId)
  );

  // Form state
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  if (!invoice) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Invoice tidak ditemukan</Text>
      </View>
    );
  }

  const remainingBalance =
    invoice.total_amount - (invoice.paid_amount || 0);

  // Quick amount buttons
  const handleQuickAmount = (percentage: number) => {
    const quickAmount = (remainingBalance * percentage) / 100;
    setAmount(String(quickAmount));
  };

  // Validate form
  const validateForm = () => {
    const paymentAmount = parseFloat(amount);

    if (!amount || isNaN(paymentAmount) || paymentAmount <= 0) {
      Alert.alert('Error', 'Masukkan jumlah pembayaran yang valid');
      return false;
    }

    if (paymentAmount > remainingBalance) {
      Alert.alert(
        'Error',
        'Jumlah pembayaran melebihi saldo yang belum dibayar'
      );
      return false;
    }

    if (!paymentDate) {
      Alert.alert('Error', 'Tentukan tanggal pembayaran');
      return false;
    }

    if (!paymentMethod) {
      Alert.alert('Error', 'Pilih metode pembayaran');
      return false;
    }

    return true;
  };

  // Submit payment
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const paymentData = {
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference_number: referenceNumber || undefined,
        notes: notes || undefined,
      };

      await dispatch(
        recordPayment({ invoiceId, data: paymentData })
      ).unwrap();

      dispatch(showSuccess('Pembayaran berhasil dicatat'));
      navigation.goBack();
    } catch (error: any) {
      dispatch(showError(error.message || 'Gagal mencatat pembayaran'));
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.invoiceInfo}>
        <Text style={styles.invoiceNumber}>
          Invoice: {invoice.invoice_number}
        </Text>
        <Text style={styles.customerName}>{invoice.customer_name}</Text>

        <View style={styles.amountSummary}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total Invoice:</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(invoice.total_amount)}
            </Text>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Sudah Dibayar:</Text>
            <Text style={[styles.amountValue, styles.paidAmount]}>
              {formatCurrency(invoice.paid_amount || 0)}
            </Text>
          </View>

          <View style={[styles.amountRow, styles.remainingRow]}>
            <Text style={styles.remainingLabel}>Sisa:</Text>
            <Text style={styles.remainingValue}>
              {formatCurrency(remainingBalance)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detail Pembayaran</Text>

        <Text style={styles.label}>Jumlah Pembayaran *</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0"
        />

        <View style={styles.quickButtons}>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickAmount(25)}
          >
            <Text style={styles.quickButtonText}>25%</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickAmount(50)}
          >
            <Text style={styles.quickButtonText}>50%</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickAmount(75)}
          >
            <Text style={styles.quickButtonText}>75%</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickButton, styles.fullButton]}
            onPress={() => handleQuickAmount(100)}
          >
            <Text style={[styles.quickButtonText, styles.fullButtonText]}>
              Lunas
            </Text>
          </TouchableOpacity>
        </View>

        {amount && (
          <View style={styles.amountPreview}>
            <Text style={styles.previewLabel}>Jumlah yang akan dibayar:</Text>
            <Text style={styles.previewAmount}>
              {formatCurrency(parseFloat(amount || '0'))}
            </Text>
            {parseFloat(amount || '0') < remainingBalance && (
              <Text style={styles.previewNote}>
                Sisa setelah pembayaran:{' '}
                {formatCurrency(remainingBalance - parseFloat(amount || '0'))}
              </Text>
            )}
          </View>
        )}

        <Text style={styles.label}>Metode Pembayaran *</Text>
        <View style={styles.methodButtons}>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.value}
              style={[
                styles.methodButton,
                paymentMethod === method.value && styles.methodButtonActive,
              ]}
              onPress={() => setPaymentMethod(method.value)}
            >
              <Text
                style={[
                  styles.methodButtonText,
                  paymentMethod === method.value &&
                    styles.methodButtonTextActive,
                ]}
              >
                {method.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Tanggal Pembayaran *</Text>
        <TextInput
          style={styles.input}
          value={paymentDate}
          onChangeText={setPaymentDate}
          placeholder="YYYY-MM-DD"
        />

        <Text style={styles.label}>Nomor Referensi (Opsional)</Text>
        <TextInput
          style={styles.input}
          value={referenceNumber}
          onChangeText={setReferenceNumber}
          placeholder="Contoh: TRF20250117001"
        />

        <Text style={styles.label}>Catatan (Opsional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Catatan pembayaran"
          multiline
          numberOfLines={4}
        />
      </View>

      {invoice.payment_history && invoice.payment_history.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Riwayat Pembayaran</Text>

          {invoice.payment_history.map((payment: any, index: number) => (
            <View key={index} style={styles.paymentHistoryItem}>
              <View style={styles.paymentHistoryHeader}>
                <Text style={styles.paymentHistoryAmount}>
                  {formatCurrency(payment.amount)}
                </Text>
                <Text style={styles.paymentHistoryDate}>
                  {formatDate(payment.payment_date)}
                </Text>
              </View>
              <Text style={styles.paymentHistoryMethod}>
                {PAYMENT_METHODS.find((m) => m.value === payment.payment_method)
                  ?.label || payment.payment_method}
              </Text>
              {payment.reference_number && (
                <Text style={styles.paymentHistoryRef}>
                  Ref: {payment.reference_number}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Catat Pembayaran</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 32,
  },
  invoiceInfo: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
  },
  invoiceNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  amountSummary: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  paidAmount: {
    color: '#4CAF50',
  },
  remainingRow: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    marginTop: 6,
    paddingTop: 12,
  },
  remainingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  remainingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  fullButton: {
    backgroundColor: COLORS.primary,
  },
  fullButtonText: {
    color: 'white',
  },
  amountPreview: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  previewLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  previewAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  previewNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  methodButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  methodButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  methodButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  methodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  methodButtonTextActive: {
    color: 'white',
  },
  paymentHistoryItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  paymentHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  paymentHistoryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  paymentHistoryDate: {
    fontSize: 14,
    color: '#666',
  },
  paymentHistoryMethod: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  paymentHistoryRef: {
    fontSize: 12,
    color: '#999',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
