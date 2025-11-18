/**
 * Material Details Screen
 *
 * Displays detailed material information including:
 * - Material info (name, category, stock levels)
 * - Stock adjustment history
 * - Supplier information
 * - Actions (edit, adjust stock, delete)
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
  TextInput,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchMaterialById,
  deleteMaterial,
  adjustStock,
  selectCurrentMaterial,
  selectInventoryLoading,
} from '../../store/slices/inventorySlice';
import { showSuccess, showError } from '../../store/slices/uiSlice';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config';

interface MaterialDetailsScreenProps {
  route: {
    params: {
      materialId: string;
    };
  };
  navigation: any;
}

export default function MaterialDetailsScreen({
  route,
  navigation,
}: MaterialDetailsScreenProps) {
  const { materialId } = route.params;
  const dispatch = useAppDispatch();

  const material = useAppSelector(selectCurrentMaterial);
  const isLoading = useAppSelector(selectInventoryLoading);

  const [showAdjustStock, setShowAdjustStock] = React.useState(false);
  const [adjustmentQuantity, setAdjustmentQuantity] = React.useState('');
  const [adjustmentReason, setAdjustmentReason] = React.useState('');

  useEffect(() => {
    loadMaterial();
  }, [materialId]);

  const loadMaterial = async () => {
    try {
      await dispatch(fetchMaterialById(materialId)).unwrap();
    } catch (error: any) {
      dispatch(showError(error || 'Failed to load material'));
      navigation.goBack();
    }
  };

  const handleAdjustStock = async () => {
    const quantity = parseFloat(adjustmentQuantity);
    if (isNaN(quantity) || quantity === 0) {
      dispatch(showError('Masukkan jumlah yang valid'));
      return;
    }

    if (!adjustmentReason.trim()) {
      dispatch(showError('Masukkan alasan penyesuaian'));
      return;
    }

    try {
      await dispatch(
        adjustStock({
          materialId,
          quantity,
          reason: adjustmentReason,
        })
      ).unwrap();

      dispatch(showSuccess('Stok berhasil disesuaikan'));
      setShowAdjustStock(false);
      setAdjustmentQuantity('');
      setAdjustmentReason('');
    } catch (error: any) {
      dispatch(showError(error || 'Gagal menyesuaikan stok'));
    }
  };

  const handleEdit = () => {
    navigation.navigate('EditMaterial', { materialId: material?.id });
  };

  const handleDelete = () => {
    Alert.alert(
      'Hapus Material',
      'Apakah Anda yakin ingin menghapus material ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteMaterial(materialId)).unwrap();
              dispatch(showSuccess('Material berhasil dihapus'));
              navigation.goBack();
            } catch (error: any) {
              dispatch(showError(error || 'Failed to delete material'));
            }
          },
        },
      ]
    );
  };

  const getStockStatus = () => {
    if (!material) return { label: '-', color: COLORS.gray[500] };

    if (material.current_stock <= 0) {
      return { label: 'Habis', color: COLORS.error };
    } else if (material.current_stock <= material.minimum_stock) {
      return { label: 'Stok Rendah', color: COLORS.warning };
    } else {
      return { label: 'Tersedia', color: COLORS.success };
    }
  };

  if (isLoading || !material) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat detail material...</Text>
      </View>
    );
  }

  const stockStatus = getStockStatus();
  const stockPercentage = (material.current_stock / material.minimum_stock) * 100;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.materialName}>{material.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: stockStatus.color }]}>
            <Text style={styles.statusText}>{stockStatus.label}</Text>
          </View>
        </View>

        {/* Stock Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stok</Text>

          <View style={styles.stockGrid}>
            <View style={styles.stockCard}>
              <Text style={styles.stockValue}>{material.current_stock}</Text>
              <Text style={styles.stockLabel}>Stok Saat Ini</Text>
            </View>

            <View style={styles.stockCard}>
              <Text style={styles.stockValue}>{material.minimum_stock}</Text>
              <Text style={styles.stockLabel}>Minimum</Text>
            </View>

            <View style={styles.stockCard}>
              <Text style={styles.stockValue}>{material.unit}</Text>
              <Text style={styles.stockLabel}>Satuan</Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(100, stockPercentage)}%`,
                  backgroundColor: stockStatus.color,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {stockPercentage.toFixed(0)}% dari minimum stok
          </Text>
        </View>

        {/* Material Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Material</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kategori:</Text>
            <Text style={styles.infoValue}>
              {material.category.charAt(0).toUpperCase() + material.category.slice(1)}
            </Text>
          </View>

          {material.supplier && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Supplier:</Text>
              <Text style={styles.infoValue}>{material.supplier}</Text>
            </View>
          )}

          {material.unit_price && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Harga Satuan:</Text>
              <Text style={styles.infoValue}>
                Rp {material.unit_price.toLocaleString('id-ID')}
              </Text>
            </View>
          )}

          {material.description && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Deskripsi:</Text>
              <Text style={styles.infoValue}>{material.description}</Text>
            </View>
          )}
        </View>

        {/* Adjust Stock Section */}
        {showAdjustStock ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sesuaikan Stok</Text>

            <Text style={styles.label}>Jumlah (gunakan - untuk pengurangan)</Text>
            <TextInput
              style={styles.input}
              value={adjustmentQuantity}
              onChangeText={setAdjustmentQuantity}
              placeholder="Contoh: +10 atau -5"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Alasan</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={adjustmentReason}
              onChangeText={setAdjustmentReason}
              placeholder="Masukkan alasan penyesuaian stok"
              multiline
              numberOfLines={3}
            />

            <View style={styles.adjustButtons}>
              <TouchableOpacity
                style={styles.cancelAdjustButton}
                onPress={() => {
                  setShowAdjustStock(false);
                  setAdjustmentQuantity('');
                  setAdjustmentReason('');
                }}
              >
                <Text style={styles.cancelAdjustButtonText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmAdjustButton}
                onPress={handleAdjustStock}
              >
                <Text style={styles.confirmAdjustButtonText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.adjustStockButton}
              onPress={() => setShowAdjustStock(true)}
            >
              <Text style={styles.adjustStockButtonText}>Sesuaikan Stok</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Timestamps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Sistem</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dibuat:</Text>
            <Text style={styles.infoValue}>
              {new Date(material.created_at).toLocaleDateString('id-ID')}
            </Text>
          </View>

          {material.updated_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Terakhir Diupdate:</Text>
              <Text style={styles.infoValue}>
                {new Date(material.updated_at).toLocaleDateString('id-ID')}
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
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  materialName: {
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
  stockGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  stockCard: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  stockValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  stockLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressBar: {
    height: '100%',
    borderRadius: BORDER_RADIUS.sm,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
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
  adjustStockButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  adjustStockButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
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
    height: 80,
    textAlignVertical: 'top',
  },
  adjustButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  cancelAdjustButton: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  cancelAdjustButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmAdjustButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  confirmAdjustButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
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
