import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from 'react-native-paper';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';
import { theme } from '../../theme/theme';
import type { RootStackParamList } from '../../types/navigation';
import {
  Order,
  OrderStatus,
  OrderPriority,
  StatusOption,
  ORDER_STATUSES,
  ACTIVE_STATUSES,
} from './types';
import { filterOrders } from './helpers';
import OrderCard from './components/OrderCard';
import StatusChangeModal from './components/StatusChangeModal';
import EmptyState from './components/EmptyState';
import ErrorState from './components/ErrorState';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface StatusSection {
  status: StatusOption;
  data: Order[];
}

const PAGE_SIZE = 50;

export default function StatusBoardScreen() {
  const navigation = useNavigation<NavProp>();
  const authenticatedFetch = useAuthenticatedFetch();

  // Data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [statuses, setStatuses] = useState<StatusOption[]>(ORDER_STATUSES);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalOrderCount, setTotalOrderCount] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<OrderPriority | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // Status change modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const selectedOrderRef = useRef<Order | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Keep ref in sync so async callbacks (Alert) always see the latest value
  useEffect(() => {
    selectedOrderRef.current = selectedOrder;
  }, [selectedOrder]);

  // Debounce search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const isFirstFocus = useRef(true);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  // --- Data fetching ---

  const fetchOrders = useCallback(
    async (page = 1, append = false) => {
      try {
        const response = await authenticatedFetch(
          `/orders?page=${page}&limit=${PAGE_SIZE}`,
        );
        const data = await response.json();
        if (data.success) {
          const orderList: Order[] = Array.isArray(data.orders)
            ? data.orders
            : [];
          const total =
            typeof data.total === 'number' ? data.total : orderList.length;
          const totalPages =
            typeof data.totalPages === 'number'
              ? data.totalPages
              : Math.ceil(total / PAGE_SIZE);

          if (append) {
            setOrders(prev => {
              const existingIds = new Set(prev.map(o => o.id));
              const newOrders = orderList.filter(o => !existingIds.has(o.id));
              return [...prev, ...newOrders];
            });
          } else {
            setOrders(orderList);
          }

          setTotalOrderCount(total);
          setCurrentPage(page);
          setHasMore(page < totalPages);
          setError(null);
        } else {
          setError(data.error || 'Gagal memuat pesanan');
        }
      } catch {
        setError(
          'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
        );
      }
    },
    [authenticatedFetch],
  );

  const fetchConfig = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/config');
      const data = await response.json();
      if (data.success && Array.isArray(data.config?.statuses?.order)) {
        const raw = data.config.statuses.order;
        // Validate each status option has the required shape
        const valid = raw.every(
          (s: unknown) =>
            typeof s === 'object' &&
            s !== null &&
            typeof (s as Record<string, unknown>).value === 'string' &&
            typeof (s as Record<string, unknown>).label === 'string' &&
            typeof (s as Record<string, unknown>).color === 'string',
        );
        if (valid && raw.length > 0) {
          setStatuses(raw as StatusOption[]);
        }
      }
    } catch {
      // Use defaults if config endpoint unavailable
    }
  }, [authenticatedFetch]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await Promise.all([fetchOrders(1, false), fetchConfig()]);
    setIsLoading(false);
  }, [fetchOrders, fetchConfig]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh orders (not config) when screen regains focus after initial load
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      fetchOrders(1, false);
    }, [fetchOrders]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchOrders(1, false), fetchConfig()]);
    setRefreshing(false);
  }, [fetchOrders, fetchConfig]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    await fetchOrders(currentPage + 1, true);
    setIsLoadingMore(false);
  }, [fetchOrders, currentPage, hasMore, isLoadingMore]);

  // --- Filtering ---

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (priorityFilter) {
      result = result.filter(o => o.priority === priorityFilter);
    }

    result = filterOrders(result, debouncedQuery);

    return result;
  }, [orders, priorityFilter, debouncedQuery]);

  const sections: StatusSection[] = useMemo(() => {
    const visibleStatuses = showCompleted
      ? statuses
      : statuses.filter(s => ACTIVE_STATUSES.includes(s.value));

    return visibleStatuses.map(status => ({
      status,
      data: filteredOrders.filter(o => o.status === status.value),
    }));
  }, [statuses, filteredOrders, showCompleted]);

  // Counts
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length;
  const activeCount = orders.length - completedCount - cancelledCount;
  const hasActiveFilters = !!debouncedQuery || !!priorityFilter;

  // --- Handlers ---

  const executeStatusChange = useCallback(
    async (newStatus: OrderStatus) => {
      const order = selectedOrderRef.current;
      if (!order) return;

      setIsUpdating(true);
      try {
        const response = await authenticatedFetch(
          `/orders/${order.id}/status`,
          {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus }),
          },
        );
        const data = await response.json();
        if (data.success || response.ok) {
          setOrders(prev =>
            prev.map(o =>
              o.id === order.id ? { ...o, status: newStatus } : o,
            ),
          );
          setShowStatusModal(false);
          setSelectedOrder(null);
        } else {
          Alert.alert('Gagal', data.error || 'Gagal mengubah status pesanan');
        }
      } catch {
        Alert.alert('Gagal', 'Tidak dapat mengubah status pesanan');
      } finally {
        setIsUpdating(false);
      }
    },
    [authenticatedFetch],
  );

  const handleStatusChange = useCallback(
    (newStatus: OrderStatus) => {
      const order = selectedOrderRef.current;
      if (!order) return;

      if (newStatus === 'cancelled') {
        Alert.alert(
          'Batalkan Pesanan?',
          `Apakah Anda yakin ingin membatalkan pesanan ${order.order_number}?`,
          [
            { text: 'Tidak', style: 'cancel' },
            {
              text: 'Ya, Batalkan',
              style: 'destructive',
              onPress: () => executeStatusChange(newStatus),
            },
          ],
        );
        return;
      }

      executeStatusChange(newStatus);
    },
    [executeStatusChange],
  );

  const handleOrderPress = useCallback((order: Order) => {
    setSelectedOrder(order);
    setShowStatusModal(true);
  }, []);

  const handlePhotos = useCallback(
    (order: Order) => {
      navigation.navigate('OrderPhotos', {
        orderId: order.id,
        orderNumber: order.order_number,
      });
    },
    [navigation],
  );

  const handleQualityCheck = useCallback(
    (order: Order) => {
      navigation.navigate('QualityCheck', {
        orderId: order.id,
      });
    },
    [navigation],
  );

  const handleModalClose = useCallback(() => {
    setShowStatusModal(false);
    setSelectedOrder(null);
  }, []);

  // --- Loading state ---

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Memuat pesanan...</Text>
      </View>
    );
  }

  // --- Error state (only when we have no data at all) ---

  if (error && orders.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ErrorState message={error} onRetry={loadData} />
      </View>
    );
  }

  // --- Render helpers ---

  const renderSectionHeader = ({ section }: { section: StatusSection }) => (
    <View
      style={[styles.sectionHeader, { backgroundColor: section.status.color + '15' }]}
      accessibilityRole="header"
    >
      <View style={[styles.statusDot, { backgroundColor: section.status.color }]} />
      <Text style={[styles.sectionTitle, { color: section.status.color }]}>
        {section.status.label}
      </Text>
      <View style={[styles.countBadge, { backgroundColor: section.status.color }]}>
        <Text style={styles.countText}>{section.data.length}</Text>
      </View>
    </View>
  );

  const renderSectionFooter = ({ section }: { section: StatusSection }) => {
    if (section.data.length === 0) {
      return <Text style={styles.emptySection}>Tidak ada pesanan</Text>;
    }
    return <View style={styles.sectionSpacer} />;
  };

  const renderItem = ({ item }: { item: Order }) => (
    <OrderCard
      order={item}
      onPress={handleOrderPress}
      onPhotos={handlePhotos}
      onQualityCheck={handleQualityCheck}
    />
  );

  const hasResults = sections.some(s => s.data.length > 0);

  return (
    <View style={styles.container}>
      {/* Search + filters (fixed header) */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon source="magnify" size={20} color={theme.colors.placeholder} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nomor pesanan atau pelanggan..."
            placeholderTextColor={theme.colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Cari pesanan"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              accessibilityLabel="Hapus pencarian"
            >
              <Icon
                source="close-circle"
                size={18}
                color={theme.colors.placeholder}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          <View style={styles.priorityFilters}>
            <FilterChip
              label="Semua"
              active={!priorityFilter}
              onPress={() => setPriorityFilter(null)}
            />
            <FilterChip
              label="Tinggi"
              active={priorityFilter === 'high'}
              color="#FF9800"
              onPress={() =>
                setPriorityFilter(priorityFilter === 'high' ? null : 'high')
              }
            />
            <FilterChip
              label="Mendesak"
              active={priorityFilter === 'urgent'}
              color="#F44336"
              onPress={() =>
                setPriorityFilter(priorityFilter === 'urgent' ? null : 'urgent')
              }
            />
          </View>
          <TouchableOpacity
            style={[styles.toggleChip, showCompleted && styles.toggleChipActive]}
            onPress={() => setShowCompleted(!showCompleted)}
            accessibilityRole="switch"
            accessibilityState={{ checked: showCompleted }}
            accessibilityLabel="Tampilkan pesanan selesai dan dibatalkan"
          >
            <Text
              style={[
                styles.toggleChipText,
                showCompleted && styles.toggleChipTextActive,
              ]}
            >
              Selesai
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {activeCount} aktif · {completedCount} selesai · {cancelledCount} batal
          {hasMore ? ` · ${orders.length}/${totalOrderCount} dimuat` : ''}
        </Text>
      </View>

      {/* Order board */}
      {hasResults ? (
        <SectionList<Order, StatusSection>
          sections={sections}
          keyExtractor={item => item.id ?? item.order_number}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          renderSectionFooter={renderSectionFooter}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onScrollBeginDrag={Keyboard.dismiss}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={7}
          ListFooterComponent={
            hasMore ? (
              <View style={styles.loadMoreContainer}>
                {isLoadingMore ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={loadMore}
                    accessibilityRole="button"
                    accessibilityLabel={`Muat ${Math.min(PAGE_SIZE, totalOrderCount - orders.length)} pesanan lagi`}
                  >
                    <Icon source="chevron-down" size={16} color={theme.colors.primary} />
                    <Text style={styles.loadMoreText}>
                      Muat Lebih Banyak ({orders.length}/{totalOrderCount})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <EmptyState hasFilters={hasActiveFilters} />
        </ScrollView>
      )}

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

// --- Filter chip sub-component ---

function FilterChip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        active && {
          backgroundColor: color ? color + '20' : theme.colors.primary + '15',
          borderColor: color || theme.colors.primary,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        style={[
          styles.filterChipText,
          active && { color: color || theme.colors.primary, fontWeight: '600' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
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

  // Search
  searchContainer: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundVariant,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    padding: 0,
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priorityFilters: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  filterChipText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  toggleChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  toggleChipActive: {
    backgroundColor: theme.colors.primary + '15',
    borderColor: theme.colors.primary,
  },
  toggleChipText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  toggleChipTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Summary
  summaryBar: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.backgroundVariant,
  },
  summaryText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  // Section list
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  sectionTitle: {
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
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  emptySection: {
    fontSize: 13,
    color: theme.colors.placeholder,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  sectionSpacer: {
    height: 12,
  },
});
