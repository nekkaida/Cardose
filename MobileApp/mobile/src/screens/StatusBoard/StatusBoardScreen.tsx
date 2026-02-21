import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';
import { theme } from '../../theme/theme';
import { Order, StatusOption, DEFAULT_STATUSES } from './types';
import StatusColumn from './components/StatusColumn';
import StatusChangeModal from './components/StatusChangeModal';
import EmptyState from './components/EmptyState';

export default function StatusBoardScreen({ navigation }: { navigation: any }) {
  const authenticatedFetch = useAuthenticatedFetch();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statuses, setStatuses] = useState<StatusOption[]>(DEFAULT_STATUSES);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Status change modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/orders?limit=100');
      const data = await response.json();
      if (data.success || data.data) {
        setOrders(data.data || data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  }, [authenticatedFetch]);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/config');
      const data = await response.json();
      if (data.success && data.config?.statuses?.order) {
        setStatuses(data.config.statuses.order);
      }
    } catch {
      // Use defaults if config endpoint unavailable
    }
  }, [authenticatedFetch]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchOrders(), fetchConfig()]);
    setIsLoading(false);
  }, [fetchOrders, fetchConfig]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedOrder) return;

    setIsUpdating(true);
    try {
      const response = await authenticatedFetch(`/orders/${selectedOrder.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (data.success || response.ok) {
        setOrders(prev =>
          prev.map(o => o.id === selectedOrder.id ? { ...o, status: newStatus } : o)
        );
        setShowStatusModal(false);
        setSelectedOrder(null);
      } else {
        Alert.alert('Error', data.error || 'Failed to update status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOrderPress = useCallback((order: Order) => {
    setSelectedOrder(order);
    setShowStatusModal(true);
  }, []);

  const handlePhotos = useCallback((order: Order) => {
    navigation.navigate('OrderPhotos', {
      orderId: order.id,
      orderNumber: order.order_number,
    });
  }, [navigation]);

  const handleQualityCheck = useCallback((order: Order) => {
    navigation.navigate('QualityCheck', {
      orderId: order.id,
    });
  }, [navigation]);

  const handleModalClose = useCallback(() => {
    setShowStatusModal(false);
    setSelectedOrder(null);
  }, []);

  // Group orders by status (exclude completed and cancelled from main view)
  const activeStatuses = statuses.filter(s => s.value !== 'completed' && s.value !== 'cancelled');
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Summary bar */}
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {orders.length} orders | {completedCount} done | {cancelledCount} cancelled
          </Text>
        </View>

        {/* Status columns */}
        {activeStatuses.map(status => (
          <StatusColumn
            key={status.value}
            status={status}
            orders={orders.filter(o => o.status === status.value)}
            onOrderPress={handleOrderPress}
            onPhotos={handlePhotos}
            onQualityCheck={handleQualityCheck}
          />
        ))}

        {orders.length === 0 && <EmptyState />}
      </ScrollView>

      <StatusChangeModal
        visible={showStatusModal}
        order={selectedOrder}
        statuses={statuses}
        isUpdating={isUpdating}
        onStatusChange={handleStatusChange}
        onClose={handleModalClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  summaryBar: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.backgroundVariant,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
