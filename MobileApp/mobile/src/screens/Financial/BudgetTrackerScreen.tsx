import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  FAB,
  Portal,
  Modal,
  TextInput,
  SegmentedButtons,
  ProgressBar,
} from 'react-native-paper';
import { useAuthenticatedFetch } from '../../contexts/AuthContext';
import { theme } from '../../theme/theme';

interface Budget {
  id: string;
  category: string;
  amount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date: string;
  notes?: string;
  actualSpending?: number;
  variance?: number;
  percentageUsed?: number;
  status?: 'good' | 'warning' | 'over';
  created_at: string;
}

export const BudgetTrackerScreen: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // Form state
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const authenticatedFetch = useAuthenticatedFetch();

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/financial/budgets');
      const data = await response.json();

      if (response.ok) {
        setBudgets(data.budgets || []);
      } else {
        Alert.alert('Error', data.error || 'Failed to fetch budgets');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error fetching budgets');
      console.error('Fetch budgets error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBudgets();
  };

  const openCreateModal = () => {
    setEditingBudget(null);
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setCategory(budget.category);
    setAmount(budget.amount.toString());
    setPeriod(budget.period);
    setStartDate(budget.start_date);
    setEndDate(budget.end_date);
    setNotes(budget.notes || '');
    setModalVisible(true);
  };

  const resetForm = () => {
    setCategory('');
    setAmount('');
    setPeriod('monthly');
    setStartDate('');
    setEndDate('');
    setNotes('');
  };

  const saveBudget = async () => {
    if (!category || !amount || !startDate || !endDate) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);

      const budgetData = {
        category,
        amount: parseFloat(amount),
        period,
        startDate,
        endDate,
        notes: notes || undefined,
      };

      const url = editingBudget
        ? `/financial/budgets/${editingBudget.id}`
        : '/financial/budgets';

      const response = await authenticatedFetch(url, {
        method: editingBudget ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetData),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success',
          editingBudget ? 'Budget updated successfully' : 'Budget created successfully'
        );
        setModalVisible(false);
        fetchBudgets();
      } else {
        Alert.alert('Error', data.error || 'Failed to save budget');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error saving budget');
      console.error('Save budget error:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteBudget = async (budgetId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this budget?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await authenticatedFetch(`/financial/budgets/${budgetId}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                Alert.alert('Success', 'Budget deleted successfully');
                fetchBudgets();
              } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'Failed to delete budget');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error deleting budget');
              console.error('Delete budget error:', error);
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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'good':
        return '#4CAF50';
      case 'warning':
        return '#FF9800';
      case 'over':
        return '#F44336';
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderBudgetItem = ({ item }: { item: Budget }) => {
    const progress = item.percentageUsed ? item.percentageUsed / 100 : 0;
    const progressColor = getStatusColor(item.status);

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.categoryContainer}>
              <Text style={styles.category}>{item.category}</Text>
              <Text style={styles.period}>{item.period.toUpperCase()}</Text>
            </View>
            <View style={styles.actions}>
              <Button mode="text" onPress={() => openEditModal(item)}>
                Edit
              </Button>
              <Button
                mode="text"
                textColor={theme.colors.error}
                onPress={() => deleteBudget(item.id)}
              >
                Delete
              </Button>
            </View>
          </View>

          <View style={styles.budgetDetails}>
            <View style={styles.amountRow}>
              <Text style={styles.label}>Budget:</Text>
              <Text style={styles.budgetAmount}>{formatCurrency(item.amount)}</Text>
            </View>

            {item.actualSpending !== undefined && (
              <>
                <View style={styles.amountRow}>
                  <Text style={styles.label}>Spent:</Text>
                  <Text style={styles.spentAmount}>
                    {formatCurrency(item.actualSpending)}
                  </Text>
                </View>

                <View style={styles.amountRow}>
                  <Text style={styles.label}>Remaining:</Text>
                  <Text
                    style={[
                      styles.remainingAmount,
                      { color: item.variance && item.variance < 0 ? '#F44336' : '#4CAF50' },
                    ]}
                  >
                    {formatCurrency(item.variance || 0)}
                  </Text>
                </View>

                <View style={styles.progressContainer}>
                  <ProgressBar
                    progress={Math.min(progress, 1)}
                    color={progressColor}
                    style={styles.progressBar}
                  />
                  <Text style={[styles.progressText, { color: progressColor }]}>
                    {item.percentageUsed?.toFixed(1)}% used
                  </Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.dates}>
            <Text style={styles.dateText}>
              {formatDate(item.start_date)} - {formatDate(item.end_date)}
            </Text>
          </View>

          {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
        </Card.Content>
      </Card>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No budgets found</Text>
      <Text style={styles.emptySubtext}>Create your first budget to start tracking</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={budgets}
        renderItem={renderBudgetItem}
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
        label="New Budget"
      />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Text style={styles.modalTitle}>
              {editingBudget ? 'Edit Budget' : 'Create Budget'}
            </Text>

            <TextInput
              label="Category *"
              value={category}
              onChangeText={setCategory}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., Marketing, Materials, Salary"
            />

            <TextInput
              label="Budget Amount *"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              right={<TextInput.Affix text="IDR" />}
            />

            <Text style={styles.fieldLabel}>Period *</Text>
            <SegmentedButtons
              value={period}
              onValueChange={(value) => setPeriod(value as any)}
              buttons={[
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
              style={styles.segmentedButtons}
            />

            <TextInput
              label="Start Date * (YYYY-MM-DD)"
              value={startDate}
              onChangeText={setStartDate}
              mode="outlined"
              style={styles.input}
              placeholder="2024-01-01"
            />

            <TextInput
              label="End Date * (YYYY-MM-DD)"
              value={endDate}
              onChangeText={setEndDate}
              mode="outlined"
              style={styles.input}
              placeholder="2024-12-31"
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
                onPress={saveBudget}
                loading={saving}
                disabled={saving}
                style={styles.modalButton}
              >
                {editingBudget ? 'Update' : 'Create'}
              </Button>
            </View>
          </ScrollView>
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  categoryContainer: {
    flex: 1,
  },
  category: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  period: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
  },
  budgetDetails: {
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  spentAmount: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  remainingAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'right',
  },
  dates: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: 8,
  },
  dateText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  notes: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
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
  segmentedButtons: {
    marginBottom: 12,
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
