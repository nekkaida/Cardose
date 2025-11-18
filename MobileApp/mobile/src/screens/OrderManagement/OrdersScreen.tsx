import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
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
  IconButton
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchOrders,
  selectOrders,
  selectOrdersLoading,
  setFilters,
  selectOrdersFilters
} from '../../store/slices/ordersSlice';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  total_price: number;
  created_at: string;
  estimated_completion: string;
  box_type: string;
  special_requests?: string;
}

const ORDER_STATUSES = [
  { key: 'all', label: 'All Orders', color: '#666' },
  { key: 'pending', label: 'Pending', color: '#ff9800' },
  { key: 'designing', label: 'Designing', color: '#2196f3' },
  { key: 'approved', label: 'Approved', color: '#4caf50' },
  { key: 'production', label: 'Production', color: '#9c27b0' },
  { key: 'quality_control', label: 'QC', color: '#ff5722' },
  { key: 'completed', label: 'Completed', color: '#8bc34a' },
  { key: 'cancelled', label: 'Cancelled', color: '#f44336' }
];

export default function OrdersScreen() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  // Redux state
  const orders = useAppSelector(selectOrders);
  const loading = useAppSelector(selectOrdersLoading);
  const filters = useAppSelector(selectOrdersFilters);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    // Update Redux filters when local state changes
    const statusFilter = selectedStatus !== 'all' ? selectedStatus : undefined;
    dispatch(setFilters({
      status: statusFilter as any,
      search: searchQuery || undefined
    }));
  }, [searchQuery, selectedStatus]);

  const loadOrders = async () => {
    try {
      await dispatch(fetchOrders()).unwrap();
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  // Use filtered orders from Redux selector
  const filteredOrders = useAppSelector(state => {
    let filtered = [...orders];

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatus);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(query) ||
        order.customer_name?.toLowerCase().includes(query) ||
        order.box_type?.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  const getStatusColor = (status: string) => {
    const statusConfig = ORDER_STATUSES.find(s => s.key === status);
    return statusConfig?.color || '#666';
  };

  const getStatusIcon = (status: string) => {
    const icons: { [key: string]: string } = {
      pending: 'clock-outline',
      designing: 'palette-outline',
      approved: 'check-circle-outline',
      production: 'hammer-wrench',
      quality_control: 'magnify',
      completed: 'check-all',
      cancelled: 'close-circle-outline'
    };
    return icons[status] || 'help-circle-outline';
  };

  const getPriorityLevel = (order: Order) => {
    const today = new Date();
    const estimatedCompletion = new Date(order.estimated_completion);
    const daysUntilDeadline = Math.ceil((estimatedCompletion.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline < 0) return 'overdue';
    if (daysUntilDeadline <= 2) return 'urgent';
    if (daysUntilDeadline <= 7) return 'high';
    return 'normal';
  };

  const renderOrderCard = (order: Order) => {
    const priority = getPriorityLevel(order);
    const priorityColors = {
      overdue: '#f44336',
      urgent: '#ff5722',
      high: '#ff9800',
      normal: '#4caf50'
    };

    return (
      <Card 
        key={order.id} 
        style={[
          styles.orderCard,
          { borderLeftColor: priorityColors[priority as keyof typeof priorityColors], borderLeftWidth: 4 }
        ]}
        onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
      >
        <Card.Content>
          <View style={styles.orderHeader}>
            <View style={styles.orderInfo}>
              <Title style={styles.orderNumber}>{order.order_number}</Title>
              <Paragraph style={styles.customerName}>{order.customer_name}</Paragraph>
            </View>
            <Chip 
              mode="outlined" 
              textStyle={{ color: getStatusColor(order.status) }}
              style={{ borderColor: getStatusColor(order.status) }}
            >
              {order.status.replace('_', ' ').toUpperCase()}
            </Chip>
          </View>

          <View style={styles.orderDetails}>
            <List.Item
              title={order.box_type.toUpperCase()}
              description="Box Type"
              left={() => <List.Icon icon="package-variant" />}
              titleStyle={styles.detailTitle}
              descriptionStyle={styles.detailDescription}
            />
            
            <List.Item
              title={formatCurrency(order.total_price)}
              description="Total Value"
              left={() => <List.Icon icon="currency-usd" />}
              titleStyle={styles.detailTitle}
              descriptionStyle={styles.detailDescription}
            />

            <List.Item
              title={formatDate(order.estimated_completion)}
              description="Estimated Completion"
              left={() => <List.Icon icon="calendar-clock" />}
              titleStyle={[styles.detailTitle, { color: priorityColors[priority as keyof typeof priorityColors] }]}
              descriptionStyle={styles.detailDescription}
            />
          </View>

          {order.special_requests && (
            <View style={styles.specialRequests}>
              <Paragraph style={styles.specialRequestsText}>
                📝 {order.special_requests.substring(0, 100)}
                {order.special_requests.length > 100 ? '...' : ''}
              </Paragraph>
            </View>
          )}

          <View style={styles.orderActions}>
            <Button 
              mode="outlined" 
              compact
              onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
            >
              View Details
            </Button>
            <Button 
              mode="contained" 
              compact
              onPress={() => navigation.navigate('UpdateOrderStatus', { orderId: order.id })}
            >
              Update Status
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search and Filters */}
      <View style={styles.filtersContainer}>
        <Searchbar
          placeholder="Search orders, customers, or box types..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.statusFilters}
        >
          {ORDER_STATUSES.map(status => (
            <Chip
              key={status.key}
              mode={selectedStatus === status.key ? 'flat' : 'outlined'}
              selected={selectedStatus === status.key}
              onPress={() => setSelectedStatus(status.key)}
              style={styles.statusChip}
              textStyle={{ 
                color: selectedStatus === status.key ? 'white' : status.color 
              }}
              selectedColor={status.color}
            >
              {status.label}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <Card style={styles.loadingCard}>
            <Card.Content>
              <Paragraph>Loading orders...</Paragraph>
            </Card.Content>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Avatar.Icon size={64} icon="package-variant-closed" />
              <Title style={styles.emptyTitle}>No Orders Found</Title>
              <Paragraph style={styles.emptyDescription}>
                {searchQuery || selectedStatus !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Create your first order to get started'
                }
              </Paragraph>
              {!searchQuery && selectedStatus === 'all' && (
                <Button 
                  mode="contained" 
                  onPress={() => navigation.navigate('CreateOrder')}
                  style={styles.createOrderButton}
                >
                  Create First Order
                </Button>
              )}
            </Card.Content>
          </Card>
        ) : (
          filteredOrders.map(renderOrderCard)
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('CreateOrder')}
        label="New Order"
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
  statusFilters: {
    flexDirection: 'row',
  },
  statusChip: {
    marginRight: 8,
  },
  ordersList: {
    flex: 1,
    padding: 16,
  },
  orderCard: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C5530',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#666',
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailDescription: {
    fontSize: 12,
    color: '#666',
  },
  specialRequests: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  specialRequestsText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
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
  createOrderButton: {
    paddingHorizontal: 24,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2C5530',
  },
});