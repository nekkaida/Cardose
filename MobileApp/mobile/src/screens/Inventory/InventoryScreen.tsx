import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Chip, 
  Searchbar,
  FAB,
  List,
  Avatar,
  IconButton,
  Badge,
  ProgressBar,
  Divider
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { InventoryService } from '../../services/InventoryService';
import { InventoryItem, InventoryCategory, StockLevel } from '../../types/Inventory';
import { formatCurrency, formatDate, formatWeight } from '../../utils/formatters';

const INVENTORY_CATEGORIES = [
  { key: 'all', label: 'All Items', color: '#666', icon: 'package-variant' },
  { key: 'cardboard', label: 'Cardboard', color: '#8bc34a', icon: 'card-text-outline' },
  { key: 'fabric', label: 'Fabric', color: '#e91e63', icon: 'texture' },
  { key: 'ribbon', label: 'Ribbons', color: '#ff9800', icon: 'gift' },
  { key: 'accessories', label: 'Accessories', color: '#9c27b0', icon: 'star-circle' },
  { key: 'packaging', label: 'Packaging', color: '#607d8b', icon: 'package' },
  { key: 'tools', label: 'Tools', color: '#795548', icon: 'tools' }
];

const STOCK_LEVELS = {
  out_of_stock: { label: 'Out of Stock', color: '#f44336', threshold: 0 },
  critical: { label: 'Critical', color: '#ff5722', threshold: 0.1 },
  low: { label: 'Low Stock', color: '#ff9800', threshold: 0.3 },
  adequate: { label: 'Adequate', color: '#4caf50', threshold: 0.7 },
  high: { label: 'High Stock', color: '#2196f3', threshold: 1.0 }
};

export default function InventoryScreen() {
  const navigation = useNavigation();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    filterInventory();
  }, [inventory, searchQuery, selectedCategory, showLowStockOnly]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const inventoryData = await InventoryService.getAllInventoryItems();
      setInventory(inventoryData);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      Alert.alert('Error', 'Failed to load inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInventory();
    setRefreshing(false);
  };

  const filterInventory = () => {
    let filtered = inventory;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by low stock
    if (showLowStockOnly) {
      filtered = filtered.filter(item => item.stock_level === 'critical' || item.stock_level === 'low' || item.stock_level === 'out_of_stock');
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.supplier?.toLowerCase().includes(query) ||
        item.notes?.toLowerCase().includes(query)
      );
    }

    // Sort by stock level (critical items first) and then by name
    filtered.sort((a, b) => {
      const stockLevelOrder = ['out_of_stock', 'critical', 'low', 'adequate', 'high'];
      const aIndex = stockLevelOrder.indexOf(a.stock_level);
      const bIndex = stockLevelOrder.indexOf(b.stock_level);
      
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      
      return a.name.localeCompare(b.name);
    });

    setFilteredInventory(filtered);
  };

  const getCategoryConfig = (category: InventoryCategory) => {
    return INVENTORY_CATEGORIES.find(cat => cat.key === category) || INVENTORY_CATEGORIES[0];
  };

  const getStockLevelConfig = (level: StockLevel) => {
    return STOCK_LEVELS[level] || STOCK_LEVELS.adequate;
  };

  const calculateStockPercentage = (item: InventoryItem): number => {
    if (item.reorder_level === 0) return 100;
    return Math.min((item.current_stock / (item.reorder_level * 3)) * 100, 100);
  };

  const handleStockAdjustment = (item: InventoryItem) => {
    Alert.alert(
      'Stock Adjustment',
      `Adjust stock for ${item.name}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Stock', onPress: () => navigation.navigate('StockAdjustment', { itemId: item.id, type: 'add' }) },
        { text: 'Remove Stock', onPress: () => navigation.navigate('StockAdjustment', { itemId: item.id, type: 'remove' }) }
      ]
    );
  };

  const handleReorderItem = async (item: InventoryItem) => {
    try {
      await InventoryService.createReorderAlert(item.id);
      Alert.alert('Success', `Reorder alert created for ${item.name}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to create reorder alert');
    }
  };

  const renderInventoryCard = (item: InventoryItem) => {
    const categoryConfig = getCategoryConfig(item.category);
    const stockLevelConfig = getStockLevelConfig(item.stock_level);
    const stockPercentage = calculateStockPercentage(item);

    return (
      <Card 
        key={item.id} 
        style={[
          styles.inventoryCard,
          { borderLeftColor: stockLevelConfig.color, borderLeftWidth: 4 }
        ]}
        onPress={() => navigation.navigate('InventoryItemDetails', { itemId: item.id })}
      >
        <Card.Content>
          {/* Item Header */}
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <View style={styles.nameContainer}>
                <Avatar.Icon 
                  size={40} 
                  icon={categoryConfig.icon} 
                  style={{ backgroundColor: categoryConfig.color }}
                />
                <View style={styles.nameAndCategory}>
                  <Title style={styles.itemName}>{item.name}</Title>
                  <Paragraph style={styles.categoryName}>{categoryConfig.label}</Paragraph>
                </View>
              </View>
              
              <View style={styles.stockBadges}>
                <Chip 
                  mode="outlined" 
                  compact
                  textStyle={{ color: stockLevelConfig.color, fontSize: 10 }}
                  style={{ borderColor: stockLevelConfig.color, marginBottom: 4 }}
                >
                  {stockLevelConfig.label}
                </Chip>
                {item.current_stock <= item.reorder_level && (
                  <Badge style={{ backgroundColor: '#ff5722' }}>!</Badge>
                )}
              </View>
            </View>
          </View>

          {/* Stock Information */}
          <View style={styles.stockInfo}>
            <View style={styles.stockNumbers}>
              <View style={styles.stockItem}>
                <Title style={[styles.stockValue, { color: stockLevelConfig.color }]}>
                  {item.current_stock}
                </Title>
                <Paragraph style={styles.stockLabel}>Current</Paragraph>
              </View>
              
              <View style={styles.stockItem}>
                <Title style={styles.stockValue}>{item.reorder_level}</Title>
                <Paragraph style={styles.stockLabel}>Reorder At</Paragraph>
              </View>
              
              <View style={styles.stockItem}>
                <Title style={styles.stockValue}>{item.unit}</Title>
                <Paragraph style={styles.stockLabel}>Unit</Paragraph>
              </View>
            </View>

            {/* Stock Level Progress Bar */}
            <View style={styles.progressContainer}>
              <Paragraph style={styles.progressLabel}>Stock Level</Paragraph>
              <ProgressBar 
                progress={stockPercentage / 100} 
                color={stockLevelConfig.color}
                style={styles.progressBar}
              />
              <Paragraph style={styles.progressPercentage}>{stockPercentage.toFixed(0)}%</Paragraph>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Cost Information */}
          <View style={styles.costInfo}>
            <List.Item
              title={formatCurrency(item.unit_cost)}
              description="Cost per unit"
              left={() => <List.Icon icon="currency-usd" />}
              titleStyle={styles.costTitle}
              descriptionStyle={styles.costDescription}
            />
            
            <List.Item
              title={formatCurrency(item.current_stock * item.unit_cost)}
              description="Total value"
              left={() => <List.Icon icon="calculator" />}
              titleStyle={styles.costTitle}
              descriptionStyle={styles.costDescription}
            />
          </View>

          {/* Supplier Information */}
          {item.supplier && (
            <View style={styles.supplierInfo}>
              <List.Item
                title={item.supplier}
                description="Supplier"
                left={() => <List.Icon icon="truck-delivery" />}
                titleStyle={styles.supplierTitle}
                descriptionStyle={styles.costDescription}
              />
            </View>
          )}

          {/* Last Restocked */}
          {item.last_restocked && (
            <View style={styles.restockInfo}>
              <List.Item
                title={`Last restocked: ${formatDate(item.last_restocked)}`}
                description="Most recent restock date"
                left={() => <List.Icon icon="calendar-check" />}
                titleStyle={styles.restockTitle}
                descriptionStyle={styles.costDescription}
              />
            </View>
          )}

          {/* Item Notes */}
          {item.notes && (
            <View style={styles.notesContainer}>
              <Paragraph style={styles.notesText}>
                📝 {item.notes.substring(0, 100)}
                {item.notes.length > 100 ? '...' : ''}
              </Paragraph>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button 
              mode="outlined" 
              compact
              onPress={() => handleStockAdjustment(item)}
              style={styles.actionButton}
              icon="plus-minus"
            >
              Adjust
            </Button>
            
            {item.current_stock <= item.reorder_level && (
              <Button 
                mode="contained" 
                compact
                onPress={() => handleReorderItem(item)}
                style={[styles.actionButton, { backgroundColor: '#ff9800' }]}
                icon="cart-plus"
              >
                Reorder
              </Button>
            )}
            
            <Button 
              mode="outlined" 
              compact
              onPress={() => navigation.navigate('InventoryItemDetails', { itemId: item.id })}
              style={styles.actionButton}
            >
              Details
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const lowStockCount = inventory.filter(item => 
    item.stock_level === 'critical' || item.stock_level === 'low' || item.stock_level === 'out_of_stock'
  ).length;

  return (
    <View style={styles.container}>
      {/* Search and Filters */}
      <View style={styles.filtersContainer}>
        <Searchbar
          placeholder="Search inventory items, suppliers..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        {/* Low Stock Alert */}
        {lowStockCount > 0 && (
          <Card style={styles.alertCard}>
            <Card.Content style={styles.alertContent}>
              <Avatar.Icon 
                size={32} 
                icon="alert" 
                style={{ backgroundColor: '#ff5722' }}
              />
              <View style={styles.alertText}>
                <Title style={styles.alertTitle}>{lowStockCount} items need attention</Title>
                <Paragraph style={styles.alertDescription}>Low stock or out of stock</Paragraph>
              </View>
              <Button 
                mode="contained"
                compact
                onPress={() => setShowLowStockOnly(!showLowStockOnly)}
                style={{ backgroundColor: showLowStockOnly ? '#4caf50' : '#ff5722' }}
              >
                {showLowStockOnly ? 'Show All' : 'View'}
              </Button>
            </Card.Content>
          </Card>
        )}
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilters}
        >
          {INVENTORY_CATEGORIES.map(category => (
            <Chip
              key={category.key}
              mode={selectedCategory === category.key ? 'flat' : 'outlined'}
              selected={selectedCategory === category.key}
              onPress={() => setSelectedCategory(category.key)}
              style={styles.categoryChip}
              textStyle={{ 
                color: selectedCategory === category.key ? 'white' : category.color 
              }}
              selectedColor={category.color}
              icon={category.icon}
            >
              {category.label}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* Inventory List */}
      <ScrollView
        style={styles.inventoryList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <Card style={styles.loadingCard}>
            <Card.Content>
              <Paragraph>Loading inventory...</Paragraph>
            </Card.Content>
          </Card>
        ) : filteredInventory.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Avatar.Icon size={64} icon="package-variant-closed" />
              <Title style={styles.emptyTitle}>No Inventory Items Found</Title>
              <Paragraph style={styles.emptyDescription}>
                {searchQuery || selectedCategory !== 'all' || showLowStockOnly
                  ? 'Try adjusting your search or filters'
                  : 'Add your first inventory item to get started'
                }
              </Paragraph>
              {!searchQuery && selectedCategory === 'all' && !showLowStockOnly && (
                <Button 
                  mode="contained" 
                  onPress={() => navigation.navigate('AddInventoryItem')}
                  style={styles.addItemButton}
                >
                  Add First Item
                </Button>
              )}
            </Card.Content>
          </Card>
        ) : (
          filteredInventory.map(renderInventoryCard)
        )}
      </ScrollView>

      {/* Summary Footer */}
      {!loading && filteredInventory.length > 0 && (
        <View style={styles.summaryFooter}>
          <Paragraph style={styles.summaryText}>
            Showing {filteredInventory.length} of {inventory.length} items
            {lowStockCount > 0 && ` • ${lowStockCount} need attention`}
          </Paragraph>
        </View>
      )}

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddInventoryItem')}
        label="Add Item"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filtersContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    marginBottom: 12,
    elevation: 2,
  },
  alertCard: {
    marginBottom: 12,
    elevation: 2,
    backgroundColor: '#fff3e0',
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertText: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff5722',
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: 12,
    color: '#666',
  },
  categoryFilters: {
    flexDirection: 'row',
  },
  categoryChip: {
    marginRight: 8,
  },
  inventoryList: {
    flex: 1,
    padding: 16,
  },
  inventoryCard: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 12,
  },
  itemHeader: {
    marginBottom: 16,
  },
  itemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nameAndCategory: {
    marginLeft: 12,
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C5530',
    marginBottom: 2,
  },
  categoryName: {
    fontSize: 14,
    color: '#666',
  },
  stockBadges: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
  },
  stockInfo: {
    marginBottom: 12,
  },
  stockNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 12,
  },
  stockItem: {
    alignItems: 'center',
  },
  stockValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  stockLabel: {
    fontSize: 10,
    color: '#666',
  },
  progressContainer: {
    marginVertical: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 10,
    color: '#666',
    textAlign: 'right',
    marginTop: 2,
  },
  divider: {
    marginVertical: 12,
  },
  costInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  costTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  costDescription: {
    fontSize: 10,
    color: '#666',
  },
  supplierInfo: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    marginVertical: 4,
  },
  supplierTitle: {
    fontSize: 12,
    color: '#2196f3',
  },
  restockInfo: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    marginVertical: 4,
  },
  restockTitle: {
    fontSize: 12,
    color: '#4caf50',
  },
  notesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  notesText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  loadingCard: {
    elevation: 2,
  },
  emptyCard: {
    elevation: 2,
    marginTop: 50,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  addItemButton: {
    paddingHorizontal: 24,
  },
  summaryFooter: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  summaryText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2C5530',
  },
});