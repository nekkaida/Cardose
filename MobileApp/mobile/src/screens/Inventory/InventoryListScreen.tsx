/**
 * Inventory List Screen
 *
 * Displays list of inventory materials with:
 * - Search functionality
 * - Category filtering
 * - Low stock alerts
 * - Material cards with stock levels
 * - Navigation to details/create screens
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchMaterials,
  fetchLowStockItems,
  selectMaterials,
  selectLowStockItems,
  selectInventoryLoading,
  setFilters,
} from '../../store/slices/inventorySlice';
import { showError } from '../../store/slices/uiSlice';
import { COLORS, SPACING, BORDER_RADIUS } from '../../config';

export default function InventoryListScreen() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const materials = useAppSelector(selectMaterials);
  const lowStockItems = useAppSelector(selectLowStockItems);
  const isLoading = useAppSelector(selectInventoryLoading);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'paper', 'ribbon', 'box', 'decoration', 'other'];

  useEffect(() => {
    loadMaterials();
    loadLowStock();
  }, []);

  useEffect(() => {
    dispatch(setFilters({
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      search: searchQuery || undefined,
    }));
  }, [searchQuery, selectedCategory]);

  const loadMaterials = async () => {
    try {
      await dispatch(fetchMaterials()).unwrap();
    } catch (error: any) {
      dispatch(showError(error || 'Failed to load materials'));
    }
  };

  const loadLowStock = async () => {
    try {
      await dispatch(fetchLowStockItems()).unwrap();
    } catch (error) {
      console.error('Failed to load low stock items:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadMaterials(), loadLowStock()]);
    setRefreshing(false);
  };

  const filteredMaterials = materials.filter(material => {
    let matches = true;

    if (selectedCategory !== 'all') {
      matches = matches && material.category === selectedCategory;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matches = matches && (
        material.name.toLowerCase().includes(query) ||
        material.category.toLowerCase().includes(query) ||
        material.supplier?.toLowerCase().includes(query)
      );
    }

    return matches;
  });

  const getStockStatus = (material: any) => {
    if (material.current_stock <= 0) {
      return { label: 'Out of Stock', color: COLORS.error };
    } else if (material.current_stock <= material.minimum_stock) {
      return { label: 'Low Stock', color: COLORS.warning };
    } else {
      return { label: 'In Stock', color: COLORS.success };
    }
  };

  const renderMaterialCard = (material: any) => {
    const stockStatus = getStockStatus(material);

    return (
      <TouchableOpacity
        key={material.id}
        style={styles.card}
        onPress={() => navigation.navigate('MaterialDetails' as never, { materialId: material.id } as never)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.materialName}>{material.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: stockStatus.color }]}>
            <Text style={styles.statusText}>{stockStatus.label}</Text>
          </View>
        </View>

        <Text style={styles.category}>{material.category.toUpperCase()}</Text>

        <View style={styles.stockContainer}>
          <View style={styles.stockInfo}>
            <Text style={styles.stockLabel}>Stock Saat Ini:</Text>
            <Text style={styles.stockValue}>
              {material.current_stock} {material.unit}
            </Text>
          </View>

          <View style={styles.stockInfo}>
            <Text style={styles.stockLabel}>Minimum:</Text>
            <Text style={styles.stockValue}>
              {material.minimum_stock} {material.unit}
            </Text>
          </View>
        </View>

        {material.supplier && (
          <Text style={styles.supplier}>Supplier: {material.supplier}</Text>
        )}

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(100, (material.current_stock / material.minimum_stock) * 100)}%`,
                backgroundColor: stockStatus.color,
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && materials.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <Text style={styles.alertText}>
            {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} dengan stok rendah
          </Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari material..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category && styles.categoryChipTextActive,
              ]}
            >
              {category === 'all' ? 'Semua' : category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Materials List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredMaterials.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Tidak ada material ditemukan</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredMaterials.map(renderMaterialCard)}
          </View>
        )}
      </ScrollView>

      {/* FAB - Create Material */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateMaterial' as never)}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning,
    padding: SPACING.md,
  },
  alertIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  alertText: {
    flex: 1,
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  searchInput: {
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
  },
  categoryContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  categoryContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[100],
    marginRight: SPACING.sm,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  categoryChipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  list: {
    padding: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  materialName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  category: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  stockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  stockInfo: {
    flex: 1,
  },
  stockLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  supplier: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: COLORS.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: COLORS.white,
    fontWeight: '300',
  },
});
