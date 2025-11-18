/**
 * Dashboard Screen
 *
 * Main dashboard with KPIs and analytics including:
 * - Order statistics
 * - Revenue summary
 * - Inventory alerts
 * - Recent activity
 * - Quick actions
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchOrders,
  fetchOrderAnalytics,
  selectOrders,
  selectOrderAnalytics,
} from '../../store/slices/ordersSlice';
import { fetchCustomers, selectCustomers } from '../../store/slices/customersSlice';
import {
  fetchMaterials,
  fetchLowStockItems,
  selectLowStockItems,
} from '../../store/slices/inventorySlice';
import {
  fetchInvoices,
  fetchFinancialAnalytics,
  selectFinancialAnalytics,
} from '../../store/slices/financialSlice';
import { fetchTasks, selectTasks } from '../../store/slices/productionSlice';
import { COLORS, SPACING, BORDER_RADIUS, BUSINESS_CONFIG } from '../../config';

export default function DashboardScreen() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const orders = useAppSelector(selectOrders);
  const orderAnalytics = useAppSelector(selectOrderAnalytics);
  const customers = useAppSelector(selectCustomers);
  const lowStockItems = useAppSelector(selectLowStockItems);
  const financialAnalytics = useAppSelector(selectFinancialAnalytics);
  const tasks = useAppSelector(selectTasks);

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        dispatch(fetchOrders()).unwrap(),
        dispatch(fetchOrderAnalytics({ period: 'month' })).unwrap(),
        dispatch(fetchCustomers()).unwrap(),
        dispatch(fetchMaterials()).unwrap(),
        dispatch(fetchLowStockItems()).unwrap(),
        dispatch(fetchInvoices()).unwrap(),
        dispatch(fetchFinancialAnalytics({ period: 'month' })).unwrap(),
        dispatch(fetchTasks()).unwrap(),
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: BUSINESS_CONFIG.CURRENCY,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate statistics
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const inProductionOrders = orders.filter(o => o.status === 'pending').length; // Adjust based on actual status values
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const activeTasks = tasks.filter(t => t.status === 'pending').length; // Adjust based on actual status values

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Cardose - Premium Gift Box</Text>
      </View>

      {/* Quick Stats Grid */}
      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: COLORS.primary }]}
          onPress={() => navigation.navigate('Orders' as never)}
        >
          <Text style={styles.statValue}>{orders.length}</Text>
          <Text style={styles.statLabel}>Total Pesanan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: COLORS.warning }]}
          onPress={() => navigation.navigate('Orders' as never)}
        >
          <Text style={styles.statValue}>{pendingOrders}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: COLORS.success }]}
          onPress={() => navigation.navigate('Customers' as never)}
        >
          <Text style={styles.statValue}>{customers.length}</Text>
          <Text style={styles.statLabel}>Pelanggan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: COLORS.info }]}
          onPress={() => navigation.navigate('Production' as never)}
        >
          <Text style={styles.statValue}>{activeTasks}</Text>
          <Text style={styles.statLabel}>Tugas Aktif</Text>
        </TouchableOpacity>
      </View>

      {/* Financial Summary */}
      {financialAnalytics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ringkasan Keuangan</Text>

          <View style={styles.financialCard}>
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Total Pendapatan:</Text>
              <Text style={styles.financialValue}>
                {formatCurrency(financialAnalytics.totalRevenue)}
              </Text>
            </View>

            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Piutang:</Text>
              <Text style={[styles.financialValue, styles.outstandingText]}>
                {formatCurrency(financialAnalytics.outstandingBalance)}
              </Text>
            </View>

            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Invoice Lunas:</Text>
              <Text style={styles.financialValue}>{financialAnalytics.paidInvoices}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewMoreButton}
            onPress={() => navigation.navigate('Financial' as never)}
          >
            <Text style={styles.viewMoreText}>Lihat Detail →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Production Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status Produksi</Text>

        <View style={styles.productionGrid}>
          <View style={styles.productionCard}>
            <Text style={styles.productionValue}>{inProductionOrders}</Text>
            <Text style={styles.productionLabel}>Dalam Produksi</Text>
          </View>

          <View style={styles.productionCard}>
            <Text style={styles.productionValue}>{completedOrders}</Text>
            <Text style={styles.productionLabel}>Selesai</Text>
          </View>

          <View style={styles.productionCard}>
            <Text style={styles.productionValue}>{tasks.length}</Text>
            <Text style={styles.productionLabel}>Total Tugas</Text>
          </View>
        </View>
      </View>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.alertHeader}>
            <Text style={styles.sectionTitle}>⚠️ Stok Rendah</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Inventory' as never)}>
              <Text style={styles.viewAllText}>Lihat Semua →</Text>
            </TouchableOpacity>
          </View>

          {lowStockItems.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.lowStockItem}>
              <View style={styles.lowStockInfo}>
                <Text style={styles.lowStockName}>{item.name}</Text>
                <Text style={styles.lowStockLevel}>
                  Stok: {item.current_stock} {item.unit} (Min: {item.minimum_stock})
                </Text>
              </View>
              <View style={styles.lowStockBadge}>
                <Text style={styles.lowStockBadgeText}>!</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aksi Cepat</Text>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Orders', { screen: 'CreateOrder' } as never)}
          >
            <Text style={styles.actionIcon}>📦</Text>
            <Text style={styles.actionText}>Pesanan Baru</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Customers', { screen: 'CreateCustomer' } as never)}
          >
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionText}>Tambah Pelanggan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Inventory', { screen: 'CreateMaterial' } as never)}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionText}>Tambah Material</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Production', { screen: 'CreateTask' } as never)}
          >
            <Text style={styles.actionIcon}>🏭</Text>
            <Text style={styles.actionText}>Tugas Baru</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <View style={styles.alertHeader}>
          <Text style={styles.sectionTitle}>Pesanan Terbaru</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Orders' as never)}>
            <Text style={styles.viewAllText}>Lihat Semua →</Text>
          </TouchableOpacity>
        </View>

        {orders.slice(0, 5).map((order) => (
          <TouchableOpacity
            key={order.id}
            style={styles.recentOrderItem}
            onPress={() =>
              navigation.navigate('Orders', { screen: 'OrderDetails', params: { orderId: order.id } } as never)
            }
          >
            <View style={styles.recentOrderInfo}>
              <Text style={styles.recentOrderNumber}>{order.order_number}</Text>
              <Text style={styles.recentOrderCustomer}>{order.customer_name}</Text>
            </View>
            <View style={styles.recentOrderAmount}>
              <Text style={styles.recentOrderPrice}>{formatCurrency(order.total_price)}</Text>
              <Text style={styles.recentOrderStatus}>{order.status}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.9,
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
  financialCard: {
    backgroundColor: COLORS.gray[50],
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  financialLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  financialValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  outstandingText: {
    color: COLORS.warning,
  },
  viewMoreButton: {
    marginTop: SPACING.md,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  productionGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  productionCard: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  productionValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  productionLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  lowStockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  lowStockInfo: {
    flex: 1,
  },
  lowStockName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  lowStockLevel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  lowStockBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lowStockBadgeText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.gray[50],
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  recentOrderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  recentOrderInfo: {
    flex: 1,
  },
  recentOrderNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  recentOrderCustomer: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  recentOrderAmount: {
    alignItems: 'flex-end',
  },
  recentOrderPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  recentOrderStatus: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});
