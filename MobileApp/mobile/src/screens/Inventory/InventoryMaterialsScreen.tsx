import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Searchbar,
  FAB,
  Chip,
  Portal,
  Modal,
  TextInput,
  Button,
  SegmentedButtons,
  Divider,
} from 'react-native-paper';
import { useAuthenticatedFetch } from '../../contexts/AuthContext';
import { theme } from '../../theme/theme';

interface Material {
  id: string;
  name: string;
  category: string;
  supplier: string;
  unit_cost: number;
  current_stock: number;
  reorder_level: number;
  unit: string;
  last_restocked: string;
  notes?: string;
  created_at: string;
}

export const InventoryMaterialsScreen: React.FC = ({ navigation }: any) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('cardboard');
  const [supplier, setSupplier] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const authenticatedFetch = useAuthenticatedFetch();

  useEffect(() => {
    fetchMaterials();
  }, []);

  useEffect(() => {
    filterMaterials();
  }, [searchQuery, categoryFilter, materials]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/inventory/materials');
      const data = await response.json();

      if (response.ok) {
        setMaterials(data.materials || []);
      } else {
        Alert.alert('Error', data.error || 'Failed to fetch materials');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error fetching materials');
      console.error('Fetch materials error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterMaterials = () => {
    let filtered = materials;

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((m) => m.category === categoryFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.supplier.toLowerCase().includes(query)
      );
    }

    setFilteredMaterials(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMaterials();
  };

  const openCreateModal = () => {
    setEditingMaterial(null);
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (material: Material) => {
    setEditingMaterial(material);
    setName(material.name);
    setCategory(material.category);
    setSupplier(material.supplier);
    setUnitCost(material.unit_cost.toString());
    setCurrentStock(material.current_stock.toString());
    setReorderLevel(material.reorder_level.toString());
    setUnit(material.unit);
    setNotes(material.notes || '');
    setModalVisible(true);
  };

  const resetForm = () => {
    setName('');
    setCategory('cardboard');
    setSupplier('');
    setUnitCost('');
    setCurrentStock('0');
    setReorderLevel('0');
    setUnit('');
    setNotes('');
  };

  const saveMaterial = async () => {
    if (!name || !supplier || !unitCost || !unit) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);

      const materialData = {
        name,
        category,
        supplier,
        unitCost: parseFloat(unitCost),
        currentStock: parseFloat(currentStock) || 0,
        reorderLevel: parseFloat(reorderLevel) || 0,
        unit,
        notes: notes || undefined,
      };

      const url = editingMaterial
        ? `/inventory/materials/${editingMaterial.id}`
        : '/inventory/materials';

      const response = await authenticatedFetch(url, {
        method: editingMaterial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(materialData),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success',
          editingMaterial ? 'Material updated successfully' : 'Material created successfully'
        );
        setModalVisible(false);
        fetchMaterials();
      } else {
        Alert.alert('Error', data.error || 'Failed to save material');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error saving material');
      console.error('Save material error:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteMaterial = async (materialId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this material?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await authenticatedFetch(`/inventory/materials/${materialId}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                Alert.alert('Success', 'Material deleted successfully');
                fetchMaterials();
              } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'Failed to delete material');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error deleting material');
              console.error('Delete material error:', error);
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStockStatusColor = (material: Material): string => {
    if (material.current_stock <= 0) return '#F44336';
    if (material.current_stock <= material.reorder_level) return '#FF9800';
    return '#4CAF50';
  };

  const getStockStatusLabel = (material: Material): string => {
    if (material.current_stock <= 0) return 'OUT OF STOCK';
    if (material.current_stock <= material.reorder_level) return 'LOW STOCK';
    return 'IN STOCK';
  };

  const renderMaterialItem = ({ item }: { item: Material }) => (
    <TouchableOpacity onPress={() => openEditModal(item)}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.materialName}>{item.name}</Text>
            <Chip
              style={{ backgroundColor: getStockStatusColor(item) }}
              textStyle={styles.chipText}
            >
              {getStockStatusLabel(item)}
            </Chip>
          </View>

          <Text style={styles.supplier}>{item.supplier}</Text>

          <View style={styles.categoryChip}>
            <Chip mode="outlined" compact>
              {item.category.toUpperCase()}
            </Chip>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Current Stock</Text>
              <Text style={styles.detailValue}>
                {item.current_stock} {item.unit}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Reorder Level</Text>
              <Text style={styles.detailValue}>
                {item.reorder_level} {item.unit}
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Unit Cost</Text>
              <Text style={styles.detailValue}>{formatCurrency(item.unit_cost)}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Total Value</Text>
              <Text style={[styles.detailValue, styles.totalValue]}>
                {formatCurrency(item.unit_cost * item.current_stock)}
              </Text>
            </View>
          </View>

          {item.notes && <Text style={styles.notes}>{item.notes}</Text>}

          <View style={styles.actions}>
            <Button mode="text" onPress={() => openEditModal(item)}>
              Edit
            </Button>
            <Button
              mode="text"
              textColor={theme.colors.error}
              onPress={() => deleteMaterial(item.id)}
            >
              Delete
            </Button>
            <Button
              mode="text"
              onPress={() => navigation.navigate('MaterialMovements', { materialId: item.id })}
            >
              History
            </Button>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No materials found</Text>
      <Text style={styles.emptySubtext}>
        {categoryFilter !== 'all'
          ? `No ${categoryFilter} materials`
          : 'Add your first material to get started'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search materials..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      <SegmentedButtons
        value={categoryFilter}
        onValueChange={setCategoryFilter}
        buttons={[
          { value: 'all', label: 'All' },
          { value: 'cardboard', label: 'Cardboard' },
          { value: 'fabric', label: 'Fabric' },
          { value: 'ribbon', label: 'Ribbon' },
          { value: 'accessories', label: 'Accessories' },
          { value: 'packaging', label: 'Packaging' },
        ]}
        style={styles.segmentedButtons}
      />

      <FlatList
        data={filteredMaterials}
        renderItem={renderMaterialItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={!loading ? renderEmpty : null}
      />

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={openCreateModal}
        label="Add Material"
      />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>
            {editingMaterial ? 'Edit Material' : 'Add Material'}
          </Text>

          <TextInput
            label="Material Name *"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Category *</Text>
          <SegmentedButtons
            value={category}
            onValueChange={setCategory}
            buttons={[
              { value: 'cardboard', label: 'Cardboard' },
              { value: 'fabric', label: 'Fabric' },
              { value: 'ribbon', label: 'Ribbon' },
              { value: 'accessories', label: 'Accessories' },
              { value: 'packaging', label: 'Packaging' },
              { value: 'tools', label: 'Tools' },
            ]}
            style={styles.segmentedButtons}
          />

          <TextInput
            label="Supplier *"
            value={supplier}
            onChangeText={setSupplier}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Unit Cost *"
            value={unitCost}
            onChangeText={setUnitCost}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            right={<TextInput.Affix text="IDR" />}
          />

          <TextInput
            label="Current Stock"
            value={currentStock}
            onChangeText={setCurrentStock}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Reorder Level"
            value={reorderLevel}
            onChangeText={setReorderLevel}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Unit *"
            value={unit}
            onChangeText={setUnit}
            mode="outlined"
            style={styles.input}
            placeholder="e.g., pcs, meters, kg"
          />

          <TextInput
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            style={styles.input}
            multiline
            numberOfLines={3}
          />

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={saveMaterial}
              loading={saving}
              disabled={saving}
              style={styles.modalButton}
            >
              {editingMaterial ? 'Update' : 'Create'}
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    elevation: 2,
  },
  segmentedButtons: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  materialName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  supplier: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  totalValue: {
    color: theme.colors.primary,
  },
  divider: {
    marginVertical: 12,
  },
  notes: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: theme.colors.text,
  },
  input: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    minWidth: 100,
  },
});
