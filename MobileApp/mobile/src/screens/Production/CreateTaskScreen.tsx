/**
 * Create Task Screen
 *
 * Form for creating new production tasks with:
 * - Task title and description
 * - Order association
 * - Priority and due date
 * - Assignment
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
import { createTask } from '../../store/slices/productionSlice';
import { fetchOrders, selectOrders } from '../../store/slices/ordersSlice';
import { showSuccess, showError } from '../../store/slices/uiSlice';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config';

interface CreateTaskScreenProps {
  navigation: any;
}

export default function CreateTaskScreen({ navigation }: CreateTaskScreenProps) {
  const dispatch = useAppDispatch();
  const orders = useAppSelector(selectOrders);

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order_id: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    estimated_hours: '',
    due_date: '',
    notes: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      await dispatch(fetchOrders()).unwrap();
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Judul tugas wajib diisi';
    }

    if (formData.estimated_hours && parseFloat(formData.estimated_hours) <= 0) {
      newErrors.estimated_hours = 'Estimasi jam harus lebih dari 0';
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
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        order_id: formData.order_id || undefined,
        priority: formData.priority,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
        due_date: formData.due_date || undefined,
        notes: formData.notes.trim() || undefined,
        status: 'pending' as const,
      };

      await dispatch(createTask(taskData)).unwrap();
      dispatch(showSuccess('Tugas berhasil dibuat'));
      navigation.goBack();
    } catch (error: any) {
      dispatch(showError(error || 'Gagal membuat tugas'));
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
            Judul Tugas <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            placeholder="Contoh: Potong bahan untuk pesanan #ORD-001"
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

          <Text style={styles.label}>Deskripsi</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Deskripsi detail tugas (optional)"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Order Association */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terkait Pesanan</Text>

          <Text style={styles.label}>Pesanan (Optional)</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.order_id}
              onValueChange={(value) => setFormData({ ...formData, order_id: value })}
              style={styles.picker}
            >
              <Picker.Item label="Tidak terkait pesanan" value="" />
              {orders.map((order) => (
                <Picker.Item
                  key={order.id}
                  label={`${order.order_number} - ${order.customer_name}`}
                  value={order.id}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Priority & Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prioritas & Timeline</Text>

          <Text style={styles.label}>Prioritas</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
              style={styles.picker}
            >
              <Picker.Item label="Rendah" value="low" />
              <Picker.Item label="Sedang" value="medium" />
              <Picker.Item label="⚠️ Tinggi" value="high" />
            </Picker>
          </View>

          <Text style={styles.label}>Estimasi Waktu (jam)</Text>
          <TextInput
            style={[styles.input, errors.estimated_hours && styles.inputError]}
            value={formData.estimated_hours}
            onChangeText={(text) => setFormData({ ...formData, estimated_hours: text })}
            placeholder="0"
            keyboardType="decimal-pad"
          />
          {errors.estimated_hours && (
            <Text style={styles.errorText}>{errors.estimated_hours}</Text>
          )}

          <Text style={styles.label}>Tenggat Waktu</Text>
          <TextInput
            style={styles.input}
            value={formData.due_date}
            onChangeText={(text) => setFormData({ ...formData, due_date: text })}
            placeholder="YYYY-MM-DD"
          />
          <Text style={styles.hint}>Format: YYYY-MM-DD (contoh: 2025-01-15)</Text>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Catatan Tambahan</Text>

          <Text style={styles.label}>Catatan</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Catatan tambahan (optional)"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>

          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>{formData.title || 'Judul Tugas'}</Text>

            <View style={styles.previewRow}>
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>
                  {formData.priority === 'high'
                    ? '⚠️ Tinggi'
                    : formData.priority === 'medium'
                    ? 'Sedang'
                    : 'Rendah'}
                </Text>
              </View>

              {formData.estimated_hours && (
                <Text style={styles.previewInfo}>⏱️ {formData.estimated_hours} jam</Text>
              )}
            </View>

            {formData.description && (
              <Text style={styles.previewDescription} numberOfLines={2}>
                {formData.description}
              </Text>
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
            <Text style={styles.submitButtonText}>Buat Tugas</Text>
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
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  previewBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  previewBadgeText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  previewInfo: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  previewDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
