import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';
import { theme } from '../../theme/theme';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  box_type: string;
  status: string;
  priority: string;
  due_date: string;
  total_amount: number;
}

interface StatusOption {
  value: string;
  label: string;
  color: string;
}

const DEFAULT_STATUSES: StatusOption[] = [
  { value: 'pending', label: 'Pending', color: '#FFA500' },
  { value: 'designing', label: 'Designing', color: '#4169E1' },
  { value: 'approved', label: 'Approved', color: '#9370DB' },
  { value: 'production', label: 'In Production', color: '#FF8C00' },
  { value: 'quality_control', label: 'Quality Control', color: '#FFD700' },
  { value: 'completed', label: 'Completed', color: '#228B22' },
  { value: 'cancelled', label: 'Cancelled', color: '#DC143C' },
];

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

  const getStatusColor = (status: string): string => {
    return statuses.find(s => s.value === status)?.color || '#9CA3AF';
  };

  const getStatusLabel = (status: string): string => {
    return statuses.find(s => s.value === status)?.label || status;
  };

  const isOverdue = (dueDate: string): boolean => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

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
        {activeStatuses.map(status => {
          const statusOrders = orders.filter(o => o.status === status.value);
          if (statusOrders.length === 0) return null;

          return (
            <View key={status.value} style={styles.statusGroup}>
              <View style={[styles.statusHeader, { backgroundColor: status.color + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                <Text style={[styles.statusTitle, { color: status.color }]}>
                  {status.label}
                </Text>
                <View style={[styles.countBadge, { backgroundColor: status.color }]}>
                  <Text style={styles.countText}>{statusOrders.length}</Text>
                </View>
              </View>

              {statusOrders.map(order => (
                <TouchableOpacity
                  key={order.id}
                  style={[
                    styles.orderCard,
                    isOverdue(order.due_date) && order.status !== 'completed' && styles.overdueCard,
                  ]}
                  onPress={() => {
                    setSelectedOrder(order);
                    setShowStatusModal(true);
                  }}
                >
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>{order.order_number}</Text>
                    {isOverdue(order.due_date) && order.status !== 'completed' && (
                      <Text style={styles.overdueBadge}>OVERDUE</Text>
                    )}
                  </View>
                  <Text style={styles.customerName} numberOfLines={1}>
                    {order.customer_name}
                  </Text>
                  <View style={styles.orderMeta}>
                    <Text style={styles.boxType}>{order.box_type || 'Standard'}</Text>
                    {order.due_date && (
                      <Text style={styles.dueDate}>
                        Due: {new Date(order.due_date).toLocaleDateString()}
                      </Text>
                    )}
                  </View>

                  {/* Quick action buttons */}
                  <View style={styles.quickActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => navigation.navigate('OrderPhotos', {
                        orderId: order.id,
                        orderNumber: order.order_number,
                      })}
                    >
                      <Text style={styles.actionIcon}>📸</Text>
                      <Text style={styles.actionLabel}>Photos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => navigation.navigate('QualityCheck', {
                        orderId: order.id,
                      })}
                    >
                      <Text style={styles.actionIcon}>✅</Text>
                      <Text style={styles.actionLabel}>QC</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}

        {orders.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Orders</Text>
            <Text style={styles.emptySubtitle}>
              Create orders from the web dashboard
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Status Change Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Status</Text>
            {selectedOrder && (
              <Text style={styles.modalSubtitle}>
                {selectedOrder.order_number} — {selectedOrder.customer_name}
              </Text>
            )}

            <View style={styles.statusOptions}>
              {statuses.map(status => (
                <TouchableOpacity
                  key={status.value}
                  style={[
                    styles.statusOption,
                    selectedOrder?.status === status.value && styles.statusOptionCurrent,
                    { borderLeftColor: status.color },
                  ]}
                  onPress={() => handleStatusChange(status.value)}
                  disabled={isUpdating || selectedOrder?.status === status.value}
                >
                  <View style={[styles.statusOptionDot, { backgroundColor: status.color }]} />
                  <Text style={[
                    styles.statusOptionText,
                    selectedOrder?.status === status.value && styles.statusOptionTextCurrent,
                  ]}>
                    {status.label}
                  </Text>
                  {selectedOrder?.status === status.value && (
                    <Text style={styles.currentLabel}>Current</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {isUpdating && (
              <ActivityIndicator style={{ marginTop: 12 }} color={theme.colors.primary} />
            )}

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => {
                setShowStatusModal(false);
                setSelectedOrder(null);
              }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  statusGroup: {
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  overdueCard: {
    borderLeftColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  overdueBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  customerName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  orderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  boxType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dueDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    gap: 4,
  },
  actionIcon: {
    fontSize: 14,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  statusOptions: {
    gap: 6,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 4,
    gap: 10,
  },
  statusOptionCurrent: {
    backgroundColor: '#EEF2FF',
  },
  statusOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
  },
  statusOptionTextCurrent: {
    fontWeight: '700',
  },
  currentLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  modalCancel: {
    marginTop: 16,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});
