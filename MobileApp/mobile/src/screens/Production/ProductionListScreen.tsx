/**
 * Production List Screen
 *
 * Displays list of production tasks with:
 * - Task cards with status and assignment
 * - Status filtering
 * - Search functionality
 * - Navigation to task details
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
  fetchTasks,
  selectTasks,
  selectProductionLoading,
  setFilters,
} from '../../store/slices/productionSlice';
import { showError } from '../../store/slices/uiSlice';
import { COLORS, SPACING, BORDER_RADIUS, STATUS_OPTIONS } from '../../config';

export default function ProductionListScreen() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const tasks = useAppSelector(selectTasks);
  const isLoading = useAppSelector(selectProductionLoading);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const statusFilters = [
    { key: 'all', label: 'Semua' },
    ...STATUS_OPTIONS.TASK,
  ];

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    dispatch(setFilters({
      status: selectedStatus !== 'all' ? selectedStatus as any : undefined,
      search: searchQuery || undefined,
    }));
  }, [searchQuery, selectedStatus]);

  const loadTasks = async () => {
    try {
      await dispatch(fetchTasks()).unwrap();
    } catch (error: any) {
      dispatch(showError(error || 'Failed to load tasks'));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const filteredTasks = tasks.filter(task => {
    let matches = true;

    if (selectedStatus !== 'all') {
      matches = matches && task.status === selectedStatus;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matches = matches && (
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.order_number?.toLowerCase().includes(query)
      );
    }

    return matches;
  });

  const getStatusColor = (status: string) => {
    const statusOption = STATUS_OPTIONS.TASK.find(s => s.value === status);
    return statusOption?.color || COLORS.gray[500];
  };

  const getStatusLabel = (status: string) => {
    const statusOption = STATUS_OPTIONS.TASK.find(s => s.value === status);
    return statusOption?.label || status;
  };

  const renderTaskCard = (task: any) => {
    const statusColor = getStatusColor(task.status);

    return (
      <TouchableOpacity
        key={task.id}
        style={styles.card}
        onPress={() => navigation.navigate('TaskDetails' as never, { taskId: task.id } as never)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{getStatusLabel(task.status)}</Text>
          </View>
        </View>

        {task.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {task.description}
          </Text>
        )}

        <View style={styles.taskInfo}>
          {task.order_number && (
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>📦</Text>
              <Text style={styles.infoText}>{task.order_number}</Text>
            </View>
          )}

          {task.assigned_to_name && (
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>👤</Text>
              <Text style={styles.infoText}>{task.assigned_to_name}</Text>
            </View>
          )}

          {task.due_date && (
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>📅</Text>
              <Text style={styles.infoText}>
                {new Date(task.due_date).toLocaleDateString('id-ID')}
              </Text>
            </View>
          )}
        </View>

        {task.priority && task.priority === 'high' && (
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityText}>⚠️ Prioritas Tinggi</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading && tasks.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat tugas produksi...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari tugas..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Status Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {statusFilters.map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              selectedStatus === filter.key && styles.filterChipActive,
            ]}
            onPress={() => setSelectedStatus(filter.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedStatus === filter.key && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Task Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {tasks.filter(t => t.status === 'in_progress').length}
          </Text>
          <Text style={styles.statLabel}>Dalam Proses</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {tasks.filter(t => t.status === 'pending' || t.status === 'assigned').length}
          </Text>
          <Text style={styles.statLabel}>Menunggu</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {tasks.filter(t => t.status === 'completed').length}
          </Text>
          <Text style={styles.statLabel}>Selesai</Text>
        </View>
      </View>

      {/* Tasks List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Tidak ada tugas ditemukan</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredTasks.map(renderTaskCard)}
          </View>
        )}
      </ScrollView>

      {/* FAB - Create Task */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateTask' as never)}
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
  filterContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  filterContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[100],
    marginRight: SPACING.sm,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
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
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
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
  taskDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  taskInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  priorityBadge: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.warning + '20',
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
  },
  priorityText: {
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: '600',
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
