/**
 * Create Material Screen
 *
 * Form for creating new inventory materials with:
 * - Material name and category
 * - Stock levels (current, minimum)
 * - Unit of measurement
 * - Supplier information
 * - Pricing
 */

import React, { useState } from 'react';
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
import { useAppDispatch } from '../../store/hooks';
import { createMaterial } from '../../store/slices/inventorySlice';
import { showSuccess, showError } from '../../store/slices/uiSlice';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config';

interface CreateMaterialScreenProps {
  navigation: any;
}

export default function CreateMaterialScreen({ navigation }: CreateMaterialScreenProps) {
  const dispatch = useAppDispatch();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'paper',
    current_stock: '',
    minimum_stock: '',
    unit: 'kg',
    supplier: '',
    unit_price: '',
    description: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const categories = [
    { value: 'paper', label: 'Kertas' },
    { value: 'ribbon', label: 'Pita' },
    { value: 'box', label: 'Kotak' },
    { value: 'decoration', label: 'Dekorasi' },
    { value: 'other', label: 'Lainnya' },
  ];

  const units = [
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'g', label: 'Gram (g)' },
    { value: 'm', label: 'Meter (m)' },
    { value: 'cm', label: 'Centimeter (cm)' },
    { value: 'pcs', label: 'Pieces (pcs)' },
    { value: 'roll', label: 'Roll' },
    { value: 'sheet', label: 'Sheet' },
    { value: 'box', label: 'Box' },
  ];

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nama material wajib diisi';
    }

    if (!formData.current_stock || parseFloat(formData.current_stock) < 0) {
      newErrors.current_stock = 'Masukkan stok yang valid';
    }

    if (!formData.minimum_stock || parseFloat(formData.minimum_stock) < 0) {
      newErrors.minimum_stock = 'Masukkan minimum stok yang valid';
    }

    if (formData.unit_price && parseFloat(formData.unit_price) < 0) {
      newErrors.unit_price = 'Harga tidak boleh negatif';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      dispatch(showError('Mohon lengkapi semua field yang wajib diisi'));
      return;
    }

    setIsLoading(true);

    try {
      const materialData = {
        name: formData.name.trim(),
        category: formData.category,
        current_stock: parseFloat(formData.current_stock),
        minimum_stock: parseFloat(formData.minimum_stock),
        unit: formData.unit,
        supplier: formData.supplier.trim() || undefined,
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : undefined,
        description: formData.description.trim() || undefined,
      };

      await dispatch(createMaterial(materialData)).unwrap();
      dispatch(showSuccess('Material berhasil ditambahkan'));
      navigation.goBack();
    } catch (error: any) {
      dispatch(showError(error || 'Gagal menambahkan material'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Dasar</Text>

          <Text style={styles.label}>
            Nama Material <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Contoh: Kertas Art Paper 150gsm"
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <Text style={styles.label}>
            Kategori <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              style={styles.picker}
            >
              {categories.map((cat) => (
                <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Deskripsi</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Deskripsi material (optional)"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Stock Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Stok</Text>

          <Text style={styles.label}>
            Stok Saat Ini <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.current_stock && styles.inputError]}
            value={formData.current_stock}
            onChangeText={(text) => setFormData({ ...formData, current_stock: text })}
            placeholder="0"
            keyboardType="decimal-pad"
          />
          {errors.current_stock && (
            <Text style={styles.errorText}>{errors.current_stock}</Text>
          )}

          <Text style={styles.label}>
            Minimum Stok <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.minimum_stock && styles.inputError]}
            value={formData.minimum_stock}
            onChangeText={(text) => setFormData({ ...formData, minimum_stock: text })}
            placeholder="0"
            keyboardType="decimal-pad"
          />
          {errors.minimum_stock && (
            <Text style={styles.errorText}>{errors.minimum_stock}</Text>
          )}
          <Text style={styles.hint}>
            Anda akan mendapat notifikasi saat stok mencapai level minimum
          </Text>

          <Text style={styles.label}>
            Satuan <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.unit}
              onValueChange={(value) => setFormData({ ...formData, unit: value })}
              style={styles.picker}
            >
              {units.map((unit) => (
                <Picker.Item key={unit.value} label={unit.label} value={unit.value} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Supplier & Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supplier & Harga</Text>

          <Text style={styles.label}>Supplier</Text>
          <TextInput
            style={styles.input}
            value={formData.supplier}
            onChangeText={(text) => setFormData({ ...formData, supplier: text })}
            placeholder="Nama supplier (optional)"
          />

          <Text style={styles.label}>Harga Satuan</Text>
          <TextInput
            style={[styles.input, errors.unit_price && styles.inputError]}
            value={formData.unit_price}
            onChangeText={(text) => setFormData({ ...formData, unit_price: text })}
            placeholder="0"
            keyboardType="numeric"
          />
          {errors.unit_price && <Text style={styles.errorText}>{errors.unit_price}</Text>}
          <Text style={styles.hint}>Harga per {formData.unit}</Text>
        </View>

        {/* Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>

          <View style={styles.previewCard}>
            <Text style={styles.previewName}>{formData.name || 'Nama Material'}</Text>
            <Text style={styles.previewCategory}>
              {categories.find((c) => c.value === formData.category)?.label || 'Kategori'}
            </Text>

            <View style={styles.previewRow}>
              <View style={styles.previewItem}>
                <Text style={styles.previewValue}>
                  {formData.current_stock || '0'} {formData.unit}
                </Text>
                <Text style={styles.previewLabel}>Stok Saat Ini</Text>
              </View>

              <View style={styles.previewItem}>
                <Text style={styles.previewValue}>
                  {formData.minimum_stock || '0'} {formData.unit}
                </Text>
                <Text style={styles.previewLabel}>Minimum</Text>
              </View>
            </View>

            {formData.supplier && (
              <Text style={styles.previewSupplier}>Supplier: {formData.supplier}</Text>
            )}
          </View>
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
            <Text style={styles.submitButtonText}>Tambah Material</Text>
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
    height: 80,
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
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  previewCard: {
    backgroundColor: COLORS.gray[50],
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  previewCategory: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  previewRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  previewItem: {
    flex: 1,
  },
  previewValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  previewLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  previewSupplier: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
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
