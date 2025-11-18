/**
 * Create/Edit Invoice Screen
 *
 * Features:
 * - Create new invoices
 * - Edit existing invoices (when invoiceId is provided)
 * - Line items management
 * - Tax and discount calculations
 * - Payment terms
 */

import React, { useState, useEffect } from 'react';
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
  createInvoice,
  updateInvoice,
  selectInvoiceById,
} from '../../store/slices/financialSlice';
import { selectCustomers } from '../../store/slices/customersSlice';
import { selectOrders } from '../../store/slices/ordersSlice';
import { showSuccess, showError } from '../../store/slices/uiSlice';
import { COLORS } from '../../config';
import { formatCurrency } from '../../utils';
import { BUSINESS_CONFIG } from '../../config';

type FinancialStackParamList = {
  CreateInvoice: undefined;
  EditInvoice: { invoiceId: string };
};

type NavigationProp = StackNavigationProp<FinancialStackParamList>;
type CreateInvoiceRouteProp = RouteProp<FinancialStackParamList, 'EditInvoice'>;

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
}

export default function CreateInvoiceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CreateInvoiceRouteProp>();
  const dispatch = useAppDispatch();

  const invoiceId = route.params?.invoiceId;
  const isEditMode = !!invoiceId;

  const customers = useAppSelector(selectCustomers);
  const orders = useAppSelector(selectOrders);
  const existingInvoice = useAppSelector((state) =>
    selectInvoiceById(state, invoiceId || '')
  );

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('0');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { id: '1', description: '', quantity: '1', unit_price: '0' },
  ]);

  // Populate form when editing
  useEffect(() => {
    if (isEditMode && existingInvoice) {
      setCustomerId(existingInvoice.customer_id);
      setOrderId(existingInvoice.order_id || '');
      setDueDate(existingInvoice.due_date);
      setDiscountPercentage(
        String(existingInvoice.discount_percentage || 0)
      );
      setNotes(existingInvoice.notes || '');

      if (existingInvoice.items && existingInvoice.items.length > 0) {
        setLineItems(
          existingInvoice.items.map((item: any, index: number) => ({
            id: String(index + 1),
            description: item.description,
            quantity: String(item.quantity),
            unit_price: String(item.unit_price),
          }))
        );
      }
    }
  }, [isEditMode, existingInvoice]);

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;

    lineItems.forEach((item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      subtotal += quantity * unitPrice;
    });

    const discountAmount = subtotal * (parseFloat(discountPercentage) / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (BUSINESS_CONFIG.PPN_RATE / 100);
    const total = afterDiscount + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total,
    };
  };

  const totals = calculateTotals();

  // Add line item
  const handleAddLineItem = () => {
    const newId = String(lineItems.length + 1);
    setLineItems([
      ...lineItems,
      { id: newId, description: '', quantity: '1', unit_price: '0' },
    ]);
  };

  // Remove line item
  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length === 1) {
      Alert.alert('Error', 'Invoice harus memiliki minimal 1 item');
      return;
    }
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  // Update line item
  const handleUpdateLineItem = (
    id: string,
    field: keyof InvoiceLineItem,
    value: string
  ) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  // Validate form
  const validateForm = () => {
    if (!customerId) {
      Alert.alert('Error', 'Pilih pelanggan');
      return false;
    }

    if (!dueDate) {
      Alert.alert('Error', 'Tentukan tanggal jatuh tempo');
      return false;
    }

    // Validate line items
    for (const item of lineItems) {
      if (!item.description.trim()) {
        Alert.alert('Error', 'Semua item harus memiliki deskripsi');
        return false;
      }

      const quantity = parseFloat(item.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        Alert.alert('Error', 'Jumlah harus lebih dari 0');
        return false;
      }

      const unitPrice = parseFloat(item.unit_price);
      if (isNaN(unitPrice) || unitPrice < 0) {
        Alert.alert('Error', 'Harga harus valid');
        return false;
      }
    }

    return true;
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const invoiceData = {
        customer_id: customerId,
        order_id: orderId || undefined,
        items: lineItems.map((item) => ({
          description: item.description,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
        })),
        discount_percentage: parseFloat(discountPercentage),
        due_date: dueDate,
        notes: notes,
      };

      if (isEditMode) {
        await dispatch(
          updateInvoice({ invoiceId: invoiceId!, data: invoiceData })
        ).unwrap();
        dispatch(showSuccess('Invoice berhasil diperbarui'));
      } else {
        await dispatch(createInvoice(invoiceData)).unwrap();
        dispatch(showSuccess('Invoice berhasil dibuat'));
      }

      navigation.goBack();
    } catch (error: any) {
      dispatch(showError(error.message || 'Gagal menyimpan invoice'));
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informasi Pelanggan</Text>

        <Text style={styles.label}>Pelanggan *</Text>
        <View style={styles.pickerContainer}>
          <TextInput
            style={styles.input}
            value={customerId}
            onChangeText={setCustomerId}
            placeholder="ID Pelanggan"
          />
        </View>

        <Text style={styles.label}>Pesanan (Opsional)</Text>
        <TextInput
          style={styles.input}
          value={orderId}
          onChangeText={setOrderId}
          placeholder="ID Pesanan"
        />

        <Text style={styles.label}>Tanggal Jatuh Tempo *</Text>
        <TextInput
          style={styles.input}
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="YYYY-MM-DD"
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Item Invoice</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddLineItem}
          >
            <Text style={styles.addButtonText}>+ Tambah Item</Text>
          </TouchableOpacity>
        </View>

        {lineItems.map((item, index) => (
          <View key={item.id} style={styles.lineItem}>
            <View style={styles.lineItemHeader}>
              <Text style={styles.lineItemTitle}>Item {index + 1}</Text>
              {lineItems.length > 1 && (
                <TouchableOpacity
                  onPress={() => handleRemoveLineItem(item.id)}
                >
                  <Text style={styles.removeButton}>Hapus</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.label}>Deskripsi *</Text>
            <TextInput
              style={styles.input}
              value={item.description}
              onChangeText={(value) =>
                handleUpdateLineItem(item.id, 'description', value)
              }
              placeholder="Contoh: Box Premium 20x20x10cm"
              multiline
            />

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Jumlah *</Text>
                <TextInput
                  style={styles.input}
                  value={item.quantity}
                  onChangeText={(value) =>
                    handleUpdateLineItem(item.id, 'quantity', value)
                  }
                  keyboardType="numeric"
                  placeholder="1"
                />
              </View>

              <View style={styles.halfWidth}>
                <Text style={styles.label}>Harga Satuan *</Text>
                <TextInput
                  style={styles.input}
                  value={item.unit_price}
                  onChangeText={(value) =>
                    handleUpdateLineItem(item.id, 'unit_price', value)
                  }
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </View>

            <Text style={styles.lineItemTotal}>
              Total: {formatCurrency(
                parseFloat(item.quantity || '0') *
                  parseFloat(item.unit_price || '0')
              )}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diskon & Catatan</Text>

        <Text style={styles.label}>Diskon (%)</Text>
        <TextInput
          style={styles.input}
          value={discountPercentage}
          onChangeText={setDiscountPercentage}
          keyboardType="numeric"
          placeholder="0"
        />

        <Text style={styles.label}>Catatan</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Catatan tambahan untuk invoice"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>Ringkasan</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal:</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(totals.subtotal)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Diskon ({discountPercentage}%):
          </Text>
          <Text style={styles.summaryValue}>
            -{formatCurrency(totals.discountAmount)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            PPN ({BUSINESS_CONFIG.PPN_RATE}%):
          </Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(totals.taxAmount)}
          </Text>
        </View>

        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>
            {formatCurrency(totals.total)}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>
          {isEditMode ? 'Perbarui Invoice' : 'Buat Invoice'}
        </Text>
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
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  lineItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lineItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  removeButton: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '500',
  },
  lineItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 8,
    textAlign: 'right',
  },
  summarySection: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  totalRow: {
    borderBottomWidth: 0,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#ddd',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
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
