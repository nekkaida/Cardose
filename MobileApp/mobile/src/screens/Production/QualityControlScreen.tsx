import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Checkbox,
  Button,
  TextInput,
  SegmentedButtons,
  Divider,
  Portal,
  Modal,
  List,
  IconButton,
} from 'react-native-paper';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';
import { theme } from '../../theme/theme';

interface ChecklistItem {
  id: string;
  name: string;
  checked: boolean;
  notes?: string;
}

interface QualityCheck {
  id: string;
  order_id: string;
  checklist_items: ChecklistItem[];
  overall_status: string;
  notes?: string;
  checked_by_name?: string;
  checked_at: string;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: '1', name: 'Material quality inspection', checked: false },
  { id: '2', name: 'Dimensions accuracy check', checked: false },
  { id: '3', name: 'Color matching verification', checked: false },
  { id: '4', name: 'Structural integrity test', checked: false },
  { id: '5', name: 'Finishing quality review', checked: false },
  { id: '6', name: 'Assembly completeness check', checked: false },
  { id: '7', name: 'Branding/labeling accuracy', checked: false },
  { id: '8', name: 'Packaging condition inspection', checked: false },
  { id: '9', name: 'Final cleanliness check', checked: false },
  { id: '10', name: 'Documentation completeness', checked: false },
];

export const QualityControlScreen: React.FC = ({ navigation, route }: any) => {
  const { orderId } = route.params || {};

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [overallStatus, setOverallStatus] = useState<string>('pending');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [qualityHistory, setQualityHistory] = useState<QualityCheck[]>([]);

  const authenticatedFetch = useAuthenticatedFetch();

  useEffect(() => {
    if (orderId) {
      fetchQualityHistory();
    }
  }, [orderId]);

  const fetchQualityHistory = async () => {
    try {
      const response = await authenticatedFetch(`/production/quality-checks/${orderId}`);
      const data = await response.json();

      if (response.ok) {
        setQualityHistory(data.checks || []);
      }
    } catch (error) {
      console.error('Fetch quality history error:', error);
    }
  };

  const toggleChecklistItem = (itemId: string) => {
    setChecklistItems(
      checklistItems.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const updateItemNotes = (itemId: string, itemNotes: string) => {
    setChecklistItems(
      checklistItems.map((item) =>
        item.id === itemId ? { ...item, notes: itemNotes } : item
      )
    );
  };

  const addCustomItem = () => {
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      name: 'Custom check item',
      checked: false,
    };
    setChecklistItems([...checklistItems, newItem]);
  };

  const removeCustomItem = (itemId: string) => {
    // Only allow removal of custom items (not in default list)
    const defaultIds = DEFAULT_CHECKLIST.map((item) => item.id);
    if (!defaultIds.includes(itemId)) {
      setChecklistItems(checklistItems.filter((item) => item.id !== itemId));
    }
  };

  const updateCustomItemName = (itemId: string, name: string) => {
    setChecklistItems(
      checklistItems.map((item) =>
        item.id === itemId ? { ...item, name } : item
      )
    );
  };

  const calculateCompletionPercentage = (): number => {
    const checkedCount = checklistItems.filter((item) => item.checked).length;
    return Math.round((checkedCount / checklistItems.length) * 100);
  };

  const determineStatus = (): string => {
    const completionPercentage = calculateCompletionPercentage();

    if (completionPercentage === 100) {
      return 'passed';
    } else if (completionPercentage >= 80) {
      return 'needs_review';
    } else {
      return 'failed';
    }
  };

  const submitQualityCheck = async () => {
    if (!orderId) {
      Alert.alert('Error', 'Order ID is required');
      return;
    }

    const uncheckedItems = checklistItems.filter((item) => !item.checked);
    if (uncheckedItems.length > 0 && overallStatus === 'passed') {
      Alert.alert(
        'Warning',
        `${uncheckedItems.length} items are not checked. Are you sure you want to mark as passed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => performSubmit() },
        ]
      );
      return;
    }

    performSubmit();
  };

  const performSubmit = async () => {
    try {
      setSubmitting(true);

      const checkData = {
        orderId,
        checklistItems,
        overallStatus,
        notes: notes || undefined,
      };

      const response = await authenticatedFetch('/production/quality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkData),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success',
          'Quality check submitted successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                if (overallStatus === 'passed') {
                  navigation.goBack();
                } else {
                  // Reset for another check
                  setChecklistItems(DEFAULT_CHECKLIST);
                  setNotes('');
                }
              },
            },
          ]
        );
        fetchQualityHistory();
      } else {
        Alert.alert('Error', data.error || 'Failed to submit quality check');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error submitting quality check');
      console.error('Submit quality check error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'passed':
        return theme.colors.success;
      case 'needs_review':
        return theme.colors.warning;
      case 'failed':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderHistoryItem = (check: QualityCheck) => {
    const passedItems = check.checklist_items.filter((item) => item.checked).length;
    const totalItems = check.checklist_items.length;
    const percentage = Math.round((passedItems / totalItems) * 100);

    return (
      <Card style={styles.historyCard} key={check.id}>
        <Card.Content>
          <View style={styles.historyHeader}>
            <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(check.overall_status) }]}>
              {check.overall_status.toUpperCase()}
            </Text>
            <Text style={styles.historyDate}>{formatDate(check.checked_at)}</Text>
          </View>

          <Text style={styles.historyStats}>
            {passedItems}/{totalItems} items passed ({percentage}%)
          </Text>

          {check.checked_by_name && (
            <Text style={styles.historyBy}>Checked by: {check.checked_by_name}</Text>
          )}

          {check.notes && (
            <Text style={styles.historyNotes}>{check.notes}</Text>
          )}
        </Card.Content>
      </Card>
    );
  };

  const completionPercentage = calculateCompletionPercentage();
  const suggestedStatus = determineStatus();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Title title={`Quality Control - ${orderId || 'New Check'}`} />
          <Card.Content>
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Completion: {completionPercentage}%
              </Text>
              <Text style={styles.suggestedStatus}>
                Suggested Status: {suggestedStatus.toUpperCase()}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.checklistHeader}>
              <Text style={styles.sectionTitle}>Quality Checklist</Text>
              <Button mode="text" onPress={addCustomItem} icon="plus">
                Add Item
              </Button>
            </View>

            {checklistItems.map((item) => {
              const isCustom = !DEFAULT_CHECKLIST.find((d) => d.id === item.id);

              return (
                <View key={item.id} style={styles.checklistItem}>
                  <View style={styles.checklistRow}>
                    <Checkbox
                      status={item.checked ? 'checked' : 'unchecked'}
                      onPress={() => toggleChecklistItem(item.id)}
                    />
                    {isCustom ? (
                      <TextInput
                        value={item.name}
                        onChangeText={(text) => updateCustomItemName(item.id, text)}
                        style={styles.customItemInput}
                        placeholder="Enter check item name"
                      />
                    ) : (
                      <Text style={styles.checklistLabel}>{item.name}</Text>
                    )}
                    {isCustom && (
                      <IconButton
                        icon="delete"
                        size={20}
                        onPress={() => removeCustomItem(item.id)}
                      />
                    )}
                  </View>
                  {item.checked && (
                    <TextInput
                      label="Notes (optional)"
                      value={item.notes || ''}
                      onChangeText={(text) => updateItemNotes(item.id, text)}
                      mode="outlined"
                      style={styles.itemNotesInput}
                      multiline
                      numberOfLines={2}
                    />
                  )}
                </View>
              );
            })}

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Overall Status</Text>
            <SegmentedButtons
              value={overallStatus}
              onValueChange={setOverallStatus}
              buttons={[
                { value: 'passed', label: 'Passed' },
                { value: 'needs_review', label: 'Needs Review' },
                { value: 'failed', label: 'Failed' },
              ]}
              style={styles.segmentedButtons}
            />

            <TextInput
              label="General Notes"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              style={styles.notesInput}
              multiline
              numberOfLines={4}
              placeholder="Add any additional observations or comments..."
            />

            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                onPress={() => setHistoryModalVisible(true)}
                style={styles.actionButton}
                disabled={!orderId}
              >
                View History
              </Button>
              <Button
                mode="contained"
                onPress={submitQualityCheck}
                loading={submitting}
                disabled={submitting || !orderId}
                style={styles.actionButton}
              >
                Submit Check
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Modal
          visible={historyModalVisible}
          onDismiss={() => setHistoryModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>Quality Check History</Text>
          <ScrollView>
            {qualityHistory.length === 0 ? (
              <Text style={styles.emptyText}>No quality checks recorded yet</Text>
            ) : (
              qualityHistory.map(renderHistoryItem)
            )}
          </ScrollView>
          <Button mode="outlined" onPress={() => setHistoryModalVisible(false)}>
            Close
          </Button>
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
  content: {
    flex: 1,
  },
  card: {
    margin: 16,
    elevation: 2,
  },
  progressContainer: {
    padding: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  suggestedStatus: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  divider: {
    marginVertical: 16,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  checklistItem: {
    marginBottom: 12,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checklistLabel: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  customItemInput: {
    flex: 1,
    height: 40,
  },
  itemNotesInput: {
    marginLeft: 48,
    marginTop: 8,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  notesInput: {
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  modal: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: theme.colors.text,
  },
  historyCard: {
    marginBottom: 12,
    elevation: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  historyDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  historyStats: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  historyBy: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  historyNotes: {
    fontSize: 13,
    color: theme.colors.text,
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: theme.colors.textSecondary,
    paddingVertical: 20,
  },
});
