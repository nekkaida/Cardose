/**
 * Create Order Screen
 *
 * Form for creating new orders with:
 * - Customer selection
 * - Box type and specifications
 * - Quantity and dimensions
 * - Material selection
 * - Pricing calculation
 * - Special requirements
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
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createOrder } from '../../store/slices/ordersSlice';
import { fetchCustomers, selectCustomers } from '../../store/slices/customersSlice';
import { showSuccess, showError } from '../../store/slices/uiSlice';
import { COLORS, SPACING, BORDER_RADIUS, BUSINESS_CONFIG } from '../../config';

interface CreateOrderScreenProps {
  navigation: any;
}

export default function CreateOrderScreen({ navigation }: CreateOrderScreenProps) {
  const dispatch = useAppDispatch();
  const customers = useAppSelector(selectCustomers);

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    box_type: '',
    quantity: '',
    dimensions: {
      length: '',
      width: '',
      height: '',
    },
    unit_price: '',
    discount_amount: '',
    special_requirements: '',
    notes: '',
    delivery_date: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      await dispatch(fetchCustomers()).unwrap();
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.customer_id) {
      newErrors.customer_id = 'Pilih pelanggan';
    }
    if (!formData.box_type) {
      newErrors.box_type = 'Masukkan jenis box';
    }
    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      newErrors.quantity = 'Masukkan jumlah yang valid';
    }
    if (!formData.dimensions.length || parseFloat(formData.dimensions.length) <= 0) {
      newErrors.length = 'Masukkan panjang yang valid';
    }
    if (!formData.dimensions.width || parseFloat(formData.dimensions.width) <= 0) {
      newErrors.width = 'Masukkan lebar yang valid';
    }
    if (!formData.dimensions.height || parseFloat(formData.dimensions.height) <= 0) {
      newErrors.height = 'Masukkan tinggi yang valid';
    }
    if (!formData.unit_price || parseFloat(formData.unit_price) <= 0) {
      newErrors.unit_price = 'Masukkan harga satuan yang valid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateTotal = () => {
    const quantity = parseInt(formData.quantity) || 0;
    const unitPrice = parseFloat(formData.unit_price) || 0;
    const discount = parseFloat(formData.discount_amount) || 0;
    const subtotal = quantity * unitPrice;
    return Math.max(0, subtotal - discount);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      dispatch(showError('Mohon lengkapi semua field yang wajib diisi'));
      return;
    }

    setIsLoading(true);

    try {
      const orderData = {
        customer_id: formData.customer_id,
        box_type: formData.box_type,
        quantity: parseInt(formData.quantity),
        dimensions: {
          length: parseFloat(formData.dimensions.length),
          width: parseFloat(formData.dimensions.width),
          height: parseFloat(formData.dimensions.height),
        },
        unit_price: parseFloat(formData.unit_price),
        discount_amount: parseFloat(formData.discount_amount) || 0,
        total_price: calculateTotal(),
        special_requirements: formData.special_requirements || undefined,
        notes: formData.notes || undefined,
        delivery_date: formData.delivery_date || undefined,
        status: 'pending' as const,
      };

      await dispatch(createOrder(orderData)).unwrap();
      dispatch(showSuccess('Pesanan berhasil dibuat'));
      navigation.goBack();
    } catch (error: any) {
      dispatch(showError(error || 'Gagal membuat pesanan'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: BUSINESS_CONFIG.CURRENCY,
    }).format(amount);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Customer Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Pelanggan</Text>

          <Text style={styles.label}>
            Pelanggan <Text style={styles.required}>*</Text>
          </Text>
          <View style={[styles.pickerContainer, errors.customer_id && styles.inputError]}>
            <Picker
              selectedValue={formData.customer_id}
              onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
              style={styles.picker}
            >
              <Picker.Item label="Pilih Pelanggan" value="" />
              {customers.map((customer) => (
                <Picker.Item
                  key={customer.id}
                  label={customer.name}
                  value={customer.id}
                />
              ))}
            </Picker>
          </View>
          {errors.customer_id && <Text style={styles.errorText}>{errors.customer_id}</Text>}

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('CreateCustomer')}
          >
            <Text style={styles.linkText}>+ Tambah Pelanggan Baru</Text>
          </TouchableOpacity>
        </View>

        {/* Order Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detail Pesanan</Text>

          <Text style={styles.label}>
            Jenis Box <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.box_type && styles.inputError]}
            value={formData.box_type}
            onChangeText={(text) => setFormData({ ...formData, box_type: text })}
            placeholder="Contoh: Gift Box Premium"
          />
          {errors.box_type && <Text style={styles.errorText}>{errors.box_type}</Text>}

          <Text style={styles.label}>
            Jumlah <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.quantity && styles.inputError]}
            value={formData.quantity}
            onChangeText={(text) => setFormData({ ...formData, quantity: text })}
            placeholder="Masukkan jumlah"
            keyboardType="numeric"
          />
          {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
        </View>

        {/* Dimensions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dimensi (cm)</Text>

          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>
                Panjang <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.length && styles.inputError]}
                value={formData.dimensions.length}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    dimensions: { ...formData.dimensions, length: text },
                  })
                }
                placeholder="0"
                keyboardType="decimal-pad"
              />
              {errors.length && <Text style={styles.errorText}>{errors.length}</Text>}
            </View>

            <View style={styles.column}>
              <Text style={styles.label}>
                Lebar <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.width && styles.inputError]}
                value={formData.dimensions.width}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    dimensions: { ...formData.dimensions, width: text },
                  })
                }
                placeholder="0"
                keyboardType="decimal-pad"
              />
              {errors.width && <Text style={styles.errorText}>{errors.width}</Text>}
            </View>

            <View style={styles.column}>
              <Text style={styles.label}>
                Tinggi <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.height && styles.inputError]}
                value={formData.dimensions.height}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    dimensions: { ...formData.dimensions, height: text },
                  })
                }
                placeholder="0"
                keyboardType="decimal-pad"
              />
              {errors.height && <Text style={styles.errorText}>{errors.height}</Text>}
            </View>
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Harga</Text>

          <Text style={styles.label}>
            Harga Satuan <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.unit_price && styles.inputError]}
            value={formData.unit_price}
            onChangeText={(text) => setFormData({ ...formData, unit_price: text })}
            placeholder="0"
            keyboardType="numeric"
          />
          {errors.unit_price && <Text style={styles.errorText}>{errors.unit_price}</Text>}

          <Text style={styles.label}>Diskon (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.discount_amount}
            onChangeText={(text) => setFormData({ ...formData, discount_amount: text })}
            placeholder="0"
            keyboardType="numeric"
          />

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{formatCurrency(calculateTotal())}</Text>
          </View>
        </View>

        {/* Additional Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Tambahan</Text>

          <Text style={styles.label}>Tanggal Pengiriman (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.delivery_date}
            onChangeText={(text) => setFormData({ ...formData, delivery_date: text })}
            placeholder="YYYY-MM-DD"
          />

          <Text style={styles.label}>Spesifikasi Khusus (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.special_requirements}
            onChangeText={(text) => setFormData({ ...formData, special_requirements: text })}
            placeholder="Masukkan spesifikasi khusus..."
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Catatan (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Masukkan catatan..."
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Batal</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>Buat Pesanan</Text>
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
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  linkButton: {
    marginTop: SPACING.sm,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  column: {
    flex: 1,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 2,
    borderTopColor: COLORS.gray[300],
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
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
