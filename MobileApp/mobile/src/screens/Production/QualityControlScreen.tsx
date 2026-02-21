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
  Button,
  TextInput,
  SegmentedButtons,
  Divider,
} from 'react-native-paper';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';
import { theme } from '../../theme/theme';
import {
  ChecklistItem,
  QualityCheck,
  DEFAULT_CHECKLIST,
  STATUS_OPTIONS,
  calculateCompletionPercentage,
  determineStatus,
  ChecklistItemRow,
  CompletionSummary,
  QualityHistoryModal,
} from './components';

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

  const completionPercentage = calculateCompletionPercentage(checklistItems);
  const suggestedStatus = determineStatus(checklistItems);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Title title={`Quality Control - ${orderId || 'New Check'}`} />
          <Card.Content>
            <CompletionSummary
              completionPercentage={completionPercentage}
              suggestedStatus={suggestedStatus}
            />

            <Divider style={styles.divider} />

            <View style={styles.checklistHeader}>
              <Text style={styles.sectionTitle}>Quality Checklist</Text>
              <Button mode="text" onPress={addCustomItem} icon="plus">
                Add Item
              </Button>
            </View>

            {checklistItems.map((item) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                onToggle={toggleChecklistItem}
                onUpdateNotes={updateItemNotes}
                onUpdateName={updateCustomItemName}
                onRemove={removeCustomItem}
              />
            ))}

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Overall Status</Text>
            <SegmentedButtons
              value={overallStatus}
              onValueChange={setOverallStatus}
              buttons={[...STATUS_OPTIONS]}
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

      <QualityHistoryModal
        visible={historyModalVisible}
        onDismiss={() => setHistoryModalVisible(false)}
        history={qualityHistory}
      />
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
});
