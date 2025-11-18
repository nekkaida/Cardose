/**
 * Task Details Screen
 *
 * Displays detailed production task information including:
 * - Task info and status
 * - Assignment details
 * - Order information
 * - Actions (start, complete, assign)
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
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchTaskById,
  deleteTask,
  startTask,
  completeTask,
  selectCurrentTask,
  selectProductionLoading,
} from '../../store/slices/productionSlice';
import { showSuccess, showError } from '../../store/slices/uiSlice';
import { COLORS, SPACING, BORDER_RADIUS, STATUS_OPTIONS } from '../../config';

interface TaskDetailsScreenProps {
  route: {
    params: {
      taskId: string;
    };
  };
  navigation: any;
}

export default function TaskDetailsScreen({ route, navigation }: TaskDetailsScreenProps) {
  const { taskId } = route.params;
  const dispatch = useAppDispatch();

  const task = useAppSelector(selectCurrentTask);
  const isLoading = useAppSelector(selectProductionLoading);

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      await dispatch(fetchTaskById(taskId)).unwrap();
    } catch (error: any) {
      dispatch(showError(error || 'Failed to load task'));
      navigation.goBack();
    }
  };

  const handleStartTask = async () => {
    try {
      await dispatch(startTask(taskId)).unwrap();
      dispatch(showSuccess('Tugas dimulai'));
    } catch (error: any) {
      dispatch(showError(error || 'Failed to start task'));
    }
  };

  const handleCompleteTask = () => {
    Alert.alert(
      'Selesaikan Tugas',
      'Apakah tugas ini sudah selesai?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Selesai',
          onPress: async () => {
            try {
              await dispatch(completeTask({ taskId })).unwrap();
              dispatch(showSuccess('Tugas diselesaikan'));
            } catch (error: any) {
              dispatch(showError(error || 'Failed to complete task'));
            }
          },
        },
      ]
    );
  };

  const handleUpdateStatus = () => {
    navigation.navigate('UpdateTaskStatus', { taskId });
  };

  const handleEdit = () => {
    navigation.navigate('EditTask', { taskId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Hapus Tugas',
      'Apakah Anda yakin ingin menghapus tugas ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteTask(taskId)).unwrap();
              dispatch(showSuccess('Tugas berhasil dihapus'));
              navigation.goBack();
            } catch (error: any) {
              dispatch(showError(error || 'Failed to delete task'));
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    const statusOption = STATUS_OPTIONS.TASK.find(s => s.value === status);
    return statusOption?.color || COLORS.gray[500];
  };

  const getStatusLabel = (status: string) => {
    const statusOption = STATUS_OPTIONS.TASK.find(s => s.value === status);
    return statusOption?.label || status;
  };

  if (isLoading || !task) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat detail tugas...</Text>
      </View>
    );
  }

  const canStart = task.status === 'assigned' || task.status === 'pending';
  const canComplete = task.status === 'in_progress' || task.status === 'review';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(task.status)}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        {(canStart || canComplete) && (
          <View style={styles.quickActions}>
            {canStart && (
              <TouchableOpacity style={styles.startButton} onPress={handleStartTask}>
                <Text style={styles.startButtonText}>▶️ Mulai Tugas</Text>
              </TouchableOpacity>
            )}
            {canComplete && (
              <TouchableOpacity style={styles.completeButton} onPress={handleCompleteTask}>
                <Text style={styles.completeButtonText}>✓ Selesaikan</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Task Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Tugas</Text>

          {task.description && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Deskripsi:</Text>
              <Text style={styles.infoValue}>{task.description}</Text>
            </View>
          )}

          {task.priority && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Prioritas:</Text>
              <Text style={[styles.infoValue, task.priority === 'high' && styles.highPriority]}>
                {task.priority === 'high' ? '⚠️ Tinggi' : task.priority === 'medium' ? 'Sedang' : 'Rendah'}
              </Text>
            </View>
          )}

          {task.estimated_hours && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estimasi Waktu:</Text>
              <Text style={styles.infoValue}>{task.estimated_hours} jam</Text>
            </View>
          )}
        </View>

        {/* Assignment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Penugasan</Text>

          {task.assigned_to_name ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ditugaskan ke:</Text>
              <Text style={styles.infoValue}>{task.assigned_to_name}</Text>
            </View>
          ) : (
            <Text style={styles.notAssigned}>Belum ditugaskan</Text>
          )}

          {task.assigned_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tanggal Penugasan:</Text>
              <Text style={styles.infoValue}>
                {new Date(task.assigned_at).toLocaleDateString('id-ID')}
              </Text>
            </View>
          )}
        </View>

        {/* Order Information */}
        {task.order_id && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informasi Pesanan</Text>

            {task.order_number && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nomor Pesanan:</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('OrderDetails', { orderId: task.order_id })}
                >
                  <Text style={[styles.infoValue, styles.linkText]}>
                    {task.order_number} →
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {task.customer_name && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pelanggan:</Text>
                <Text style={styles.infoValue}>{task.customer_name}</Text>
              </View>
            )}
          </View>
        )}

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dibuat:</Text>
            <Text style={styles.infoValue}>
              {new Date(task.created_at).toLocaleDateString('id-ID')}
            </Text>
          </View>

          {task.due_date && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tenggat:</Text>
              <Text style={styles.infoValue}>
                {new Date(task.due_date).toLocaleDateString('id-ID')}
              </Text>
            </View>
          )}

          {task.started_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dimulai:</Text>
              <Text style={styles.infoValue}>
                {new Date(task.started_at).toLocaleDateString('id-ID')}
              </Text>
            </View>
          )}

          {task.completed_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Selesai:</Text>
              <Text style={styles.infoValue}>
                {new Date(task.completed_at).toLocaleDateString('id-ID')}
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {task.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Catatan</Text>
            <Text style={styles.notes}>{task.notes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.updateStatusButton} onPress={handleUpdateStatus}>
          <Text style={styles.updateStatusButtonText}>Ubah Status</Text>
        </TouchableOpacity>

        <View style={styles.secondaryButtons}>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Hapus</Text>
          </TouchableOpacity>
        </View>
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
  taskTitle: {
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
  quickActions: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  startButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: COLORS.success,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  completeButtonText: {
    color: COLORS.white,
    fontSize: 16,
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
  highPriority: {
    color: COLORS.warning,
    fontWeight: '600',
  },
  linkText: {
    color: COLORS.primary,
  },
  notAssigned: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  notes: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  actionButtons: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  updateStatusButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  updateStatusButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  editButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
  },
});
