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
  Chip,
  FAB,
  Portal,
  Modal,
  TextInput,
  Button,
  SegmentedButtons,
  Divider,
  Menu,
} from 'react-native-paper';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';
import { theme } from '../../theme/theme';

interface Task {
  id: string;
  order_id: string;
  order_number: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  due_date?: string;
  assigned_to_name?: string;
  created_by_name?: string;
  created_at: string;
  completed_at?: string;
}

export const TaskManagementScreen: React.FC = ({ navigation }: any) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);

  // Form state
  const [orderId, setOrderId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const authenticatedFetch = useAuthenticatedFetch();

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    filterTasks();
  }, [statusFilter, tasks]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/production/tasks');
      const data = await response.json();

      if (response.ok) {
        setTasks(data.tasks || []);
      } else {
        Alert.alert('Error', data.error || 'Failed to fetch tasks');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error fetching tasks');
      console.error('Fetch tasks error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterTasks = () => {
    let filtered = tasks;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    setFilteredTasks(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const resetForm = () => {
    setOrderId('');
    setTitle('');
    setDescription('');
    setPriority('normal');
    setDueDate('');
  };

  const createTask = async () => {
    if (!orderId || !title) {
      Alert.alert('Validation Error', 'Order ID and title are required');
      return;
    }

    try {
      setSaving(true);

      const taskData = {
        orderId,
        title,
        description: description || undefined,
        priority,
        dueDate: dueDate || undefined,
      };

      const response = await authenticatedFetch('/production/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Task created successfully');
        setModalVisible(false);
        fetchTasks();
      } else {
        Alert.alert('Error', data.error || 'Failed to create task');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error creating task');
      console.error('Create task error:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const response = await authenticatedFetch(`/production/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Task status updated');
        fetchTasks();
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to update task status');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error updating task');
      console.error('Update task error:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent':
        return '#F44336';
      case 'high':
        return '#FF9800';
      case 'normal':
        return '#4CAF50';
      case 'low':
        return '#2196F3';
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'in_progress':
        return '#FF9800';
      case 'pending':
        return '#2196F3';
      case 'cancelled':
        return '#9E9E9E';
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.taskTitle}>{item.title}</Text>
            <Text style={styles.orderNumber}>{item.order_number}</Text>
          </View>
          <View style={styles.headerRight}>
            <Chip
              style={{ backgroundColor: getPriorityColor(item.priority) }}
              textStyle={styles.chipText}
            >
              {item.priority.toUpperCase()}
            </Chip>
          </View>
        </View>

        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}

        <View style={styles.statusChip}>
          <Chip
            style={{ backgroundColor: getStatusColor(item.status) }}
            textStyle={styles.chipText}
          >
            {item.status.replace('_', ' ').toUpperCase()}
          </Chip>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.detailsRow}>
          {item.assigned_to_name && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Assigned To</Text>
              <Text style={styles.detailValue}>{item.assigned_to_name}</Text>
            </View>
          )}

          {item.due_date && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={styles.detailValue}>{formatDate(item.due_date)}</Text>
            </View>
          )}
        </View>

        {item.completed_at && (
          <Text style={styles.completedText}>
            Completed: {formatDate(item.completed_at)}
          </Text>
        )}

        <View style={styles.actions}>
          {item.status === 'pending' && (
            <Button
              mode="contained"
              onPress={() => updateTaskStatus(item.id, 'in_progress')}
              style={styles.actionButton}
            >
              Start
            </Button>
          )}
          {item.status === 'in_progress' && (
            <Button
              mode="contained"
              onPress={() => updateTaskStatus(item.id, 'completed')}
              style={styles.actionButton}
            >
              Complete
            </Button>
          )}
          {item.status !== 'completed' && item.status !== 'cancelled' && (
            <Button
              mode="outlined"
              onPress={() => updateTaskStatus(item.id, 'cancelled')}
              textColor={theme.colors.error}
            >
              Cancel
            </Button>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No tasks found</Text>
      <Text style={styles.emptySubtext}>
        {statusFilter !== 'all'
          ? `No ${statusFilter} tasks`
          : 'Create your first task to get started'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={statusFilter}
        onValueChange={setStatusFilter}
        buttons={[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' },
        ]}
        style={styles.segmentedButtons}
      />

      <FlatList
        data={filteredTasks}
        renderItem={renderTaskItem}
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
        label="New Task"
      />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>Create Production Task</Text>

          <TextInput
            label="Order ID *"
            value={orderId}
            onChangeText={setOrderId}
            mode="outlined"
            style={styles.input}
            placeholder="Enter order ID"
          />

          <TextInput
            label="Task Title *"
            value={title}
            onChangeText={setTitle}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            style={styles.input}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.fieldLabel}>Priority</Text>
          <SegmentedButtons
            value={priority}
            onValueChange={(value) => setPriority(value as any)}
            buttons={[
              { value: 'low', label: 'Low' },
              { value: 'normal', label: 'Normal' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]}
            style={styles.segmentedButtons}
          />

          <TextInput
            label="Due Date (YYYY-MM-DD)"
            value={dueDate}
            onChangeText={setDueDate}
            mode="outlined"
            style={styles.input}
            placeholder="2024-12-31"
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
              onPress={createTask}
              loading={saving}
              disabled={saving}
              style={styles.modalButton}
            >
              Create
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
  segmentedButtons: {
    margin: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  headerRight: {},
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 12,
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  divider: {
    marginVertical: 12,
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
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  completedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    minWidth: 100,
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
