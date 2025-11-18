/**
 * Create Customer Screen
 *
 * Form for creating new customers with:
 * - Customer type selection (individual/company)
 * - Basic information (name, contact)
 * - Company details (if applicable)
 * - Address and notes
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
import { createCustomer } from '../../store/slices/customersSlice';
import { showSuccess, showError } from '../../store/slices/uiSlice';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config';
import { CreateCustomerData } from '../../types/Customer';

interface CreateCustomerScreenProps {
  navigation: any;
}

export default function CreateCustomerScreen({ navigation }: CreateCustomerScreenProps) {
  const dispatch = useAppDispatch();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'individual' as 'individual' | 'company',
    name: '',
    email: '',
    phone: '',
    address: '',
    company_name: '',
    tax_id: '',
    contact_person: '',
    notes: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nama wajib diisi';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Nomor telepon wajib diisi';
    } else if (!/^[0-9+\-\s()]+$/.test(formData.phone)) {
      newErrors.phone = 'Format nomor telepon tidak valid';
    }

    if (formData.type === 'company') {
      if (!formData.company_name.trim()) {
        newErrors.company_name = 'Nama perusahaan wajib diisi untuk tipe perusahaan';
      }
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
      const customerData: CreateCustomerData = {
        type: formData.type,
        business_type: formData.type === 'individual' ? 'individual' : 'corporate',
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim(),
        address: formData.address.trim() || undefined,
        company_name: formData.type === 'company' ? formData.company_name.trim() : undefined,
        tax_id: formData.type === 'company' ? formData.tax_id.trim() || undefined : undefined,
        contact_person:
          formData.type === 'company' ? formData.contact_person.trim() || undefined : undefined,
        notes: formData.notes.trim() || undefined,
      };

      await dispatch(createCustomer(customerData)).unwrap();
      dispatch(showSuccess('Pelanggan berhasil dibuat'));
      navigation.goBack();
    } catch (error: any) {
      dispatch(showError(error || 'Gagal membuat pelanggan'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Customer Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipe Pelanggan</Text>

          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
              style={styles.picker}
            >
              <Picker.Item label="Individu" value="individual" />
              <Picker.Item label="Perusahaan" value="company" />
            </Picker>
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Dasar</Text>

          <Text style={styles.label}>
            Nama {formData.type === 'company' ? 'Contact Person' : 'Pelanggan'}{' '}
            <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Masukkan nama"
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <Text style={styles.label}>
            Email
          </Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <Text style={styles.label}>
            Nomor Telepon <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholder="08123456789"
            keyboardType="phone-pad"
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          <Text style={styles.label}>Alamat</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="Masukkan alamat lengkap"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Company Information (only for company type) */}
        {formData.type === 'company' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informasi Perusahaan</Text>

            <Text style={styles.label}>
              Nama Perusahaan <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.company_name && styles.inputError]}
              value={formData.company_name}
              onChangeText={(text) => setFormData({ ...formData, company_name: text })}
              placeholder="Masukkan nama perusahaan"
            />
            {errors.company_name && <Text style={styles.errorText}>{errors.company_name}</Text>}

            <Text style={styles.label}>NPWP</Text>
            <TextInput
              style={styles.input}
              value={formData.tax_id}
              onChangeText={(text) => setFormData({ ...formData, tax_id: text })}
              placeholder="Masukkan nomor NPWP"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Contact Person</Text>
            <TextInput
              style={styles.input}
              value={formData.contact_person}
              onChangeText={(text) => setFormData({ ...formData, contact_person: text })}
              placeholder="Masukkan nama contact person"
            />
          </View>
        )}

        {/* Additional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Tambahan</Text>

          <Text style={styles.label}>Catatan</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Tambahkan catatan tentang pelanggan (optional)"
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
            <Text style={styles.submitButtonText}>Buat Pelanggan</Text>
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
