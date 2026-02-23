import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  TextInput,
  SegmentedButtons,
  Divider,
} from 'react-native-paper';
import { theme } from '../../theme/theme';
import type { QCStatus, QualityCheckScreenProps } from './types';
import {
  STATUS_OPTIONS,
  ChecklistItemRow,
  CompletionSummary,
  QualityHistoryModal,
} from './components';
import {
  useQualityChecklist,
  useQualityHistory,
  useQualitySubmission,
  useOfflineQueue,
} from './hooks';

export const QualityControlScreen: React.FC<QualityCheckScreenProps> = ({
  navigation,
  route,
}) => {
  const orderId: string | undefined = route.params?.orderId;

  // --- All hooks MUST be called before any early return ---
  const checklist = useQualityChecklist();
  const history = useQualityHistory(orderId);
  const submission = useQualitySubmission();
  const offlineQueue = useOfflineQueue();

  const [statusOverride, setStatusOverride] = useState<QCStatus | null>(null);
  const [notes, setNotes] = useState('');
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  const effectiveStatus: QCStatus = statusOverride ?? checklist.suggestedStatus;

  // Destructure stable callbacks to avoid depending on full hook return objects
  const resetChecklist = checklist.reset;
  const refreshHistory = history.refresh;
  const submitQC = submission.submit;
  const refreshQueueCount = offlineQueue.refreshCount;
  const processQueueFn = offlineQueue.processQueue;

  const handleStatusChange = useCallback(
    (value: string) => setStatusOverride(value as QCStatus),
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!orderId) return;

    const submitAndHandleResult = async () => {
      const result = await submitQC({
        orderId,
        checklistItems: checklist.items,
        overallStatus: effectiveStatus,
        notes,
      });

      if (result.success) {
        const message = result.queued
          ? 'You appear to be offline. Your quality check has been saved and will be submitted automatically when connectivity is restored.'
          : 'Quality check submitted successfully';
        const title = result.queued ? 'Saved Offline' : 'Success';

        if (result.queued) {
          refreshQueueCount();
        }

        Alert.alert(title, message, [
          {
            text: 'OK',
            onPress: () => {
              if (!result.queued && effectiveStatus === 'passed') {
                navigation.goBack();
              } else if (!result.queued) {
                resetChecklist();
                setStatusOverride(null);
                setNotes('');
                refreshHistory();
              }
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to submit quality check');
      }
    };

    const uncheckedItems = checklist.items.filter((item) => !item.checked);

    if (uncheckedItems.length > 0 && effectiveStatus === 'passed') {
      Alert.alert(
        'Unchecked Items',
        `${uncheckedItems.length} item(s) are not checked. Are you sure you want to mark as passed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: submitAndHandleResult },
        ]
      );
      return;
    }

    await submitAndHandleResult();
  }, [orderId, checklist.items, effectiveStatus, notes, submitQC, navigation, resetChecklist, refreshHistory, refreshQueueCount]);

  const handleProcessQueue = useCallback(async () => {
    const { succeeded, failed } = await processQueueFn();
    if (succeeded > 0) {
      refreshHistory();
    }
    if (failed > 0) {
      Alert.alert('Retry Result', `${succeeded} submitted, ${failed} still pending.`);
    } else if (succeeded > 0) {
      Alert.alert('Success', `${succeeded} queued submission(s) sent successfully.`);
    }
  }, [processQueueFn, refreshHistory]);

  // --- Guard: missing orderId (after all hooks) ---
  if (!orderId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>No Order Selected</Text>
        <Text style={styles.errorDescription}>
          Please navigate to this screen from an order on the status board.
        </Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.errorButton}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <Card style={styles.card}>
          <Card.Title title={`Quality Control - ${orderId}`} />
          <Card.Content>
            {/* --- Offline queue banner --- */}
            {offlineQueue.pendingCount > 0 && (
              <View style={styles.offlineBanner}>
                <Text style={styles.offlineBannerText}>
                  {offlineQueue.pendingCount} submission(s) pending upload
                </Text>
                <Button
                  mode="contained-tonal"
                  onPress={handleProcessQueue}
                  loading={offlineQueue.processing}
                  disabled={offlineQueue.processing}
                  compact
                  icon="cloud-upload"
                >
                  Retry
                </Button>
              </View>
            )}

            {/* --- Progress summary --- */}
            <CompletionSummary
              completionPercentage={checklist.completionPercentage}
              suggestedStatus={checklist.suggestedStatus}
              selectedStatus={statusOverride}
            />

            <Divider style={styles.divider} />

            {/* --- Checklist --- */}
            <View style={styles.checklistHeader}>
              <Text style={styles.sectionTitle}>Quality Checklist</Text>
              <Button mode="text" onPress={checklist.addCustom} icon="plus">
                Add Item
              </Button>
            </View>

            {checklist.items.map((item) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                onToggle={checklist.toggle}
                onUpdateNotes={checklist.updateNotes}
                onUpdateName={checklist.updateName}
                onRemove={checklist.removeCustom}
              />
            ))}

            <Divider style={styles.divider} />

            {/* --- Overall status --- */}
            <Text style={styles.sectionTitle}>Overall Status</Text>
            <SegmentedButtons
              value={effectiveStatus}
              onValueChange={handleStatusChange}
              buttons={STATUS_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              style={styles.segmentedButtons}
            />

            {/* --- Notes --- */}
            <TextInput
              label="General Notes"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              style={styles.notesInput}
              multiline
              numberOfLines={4}
              placeholder="Add any additional observations or comments..."
              outlineColor={theme.colors.border}
              activeOutlineColor={theme.colors.primary}
            />

            {/* --- Action buttons --- */}
            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                onPress={() => setHistoryModalVisible(true)}
                style={styles.actionButton}
                icon="history"
              >
                History ({history.history.length})
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={submission.submitting}
                disabled={submission.submitting}
                style={styles.actionButton}
                icon="check-circle"
              >
                Submit
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <QualityHistoryModal
        visible={historyModalVisible}
        onDismiss={() => setHistoryModalVisible(false)}
        history={history.history}
        loading={history.loading}
        error={history.error}
        onRetry={history.refresh}
      />
    </KeyboardAvoidingView>
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
  scrollContent: {
    paddingBottom: 32,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: theme.colors.background,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorButton: {
    minWidth: 140,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 12,
    backgroundColor: theme.colors.warningLight,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.warningText,
    marginRight: 8,
  },
});
