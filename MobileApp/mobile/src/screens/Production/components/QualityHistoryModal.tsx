import React, { memo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text, Button, Portal, Modal, ActivityIndicator } from 'react-native-paper';
import { theme } from '../../../theme/theme';
import type { QualityCheck } from '../types';
import { QualityHistoryCard } from './QualityHistoryCard';

interface QualityHistoryModalProps {
  visible: boolean;
  onDismiss: () => void;
  history: QualityCheck[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const keyExtractor = (item: QualityCheck) => item.id;

const renderItem = ({ item }: { item: QualityCheck }) => (
  <QualityHistoryCard check={item} />
);

export const QualityHistoryModal = memo<QualityHistoryModalProps>(
  function QualityHistoryModal({ visible, onDismiss, history, loading, error, onRetry }) {
    const renderContent = () => {
      if (loading) {
        return (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.stateText}>Loading history...</Text>
          </View>
        );
      }

      if (error) {
        return (
          <View style={styles.centeredState}>
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="outlined" onPress={onRetry} style={styles.retryButton}>
              Retry
            </Button>
          </View>
        );
      }

      if (history.length === 0) {
        return (
          <View style={styles.centeredState}>
            <Text style={styles.stateText}>No quality checks recorded yet</Text>
          </View>
        );
      }

      return (
        <FlatList
          data={history}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          style={styles.list}
        />
      );
    };

    return (
      <Portal>
        <Modal
          visible={visible}
          onDismiss={onDismiss}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>Quality Check History</Text>
          {renderContent()}
          <Button mode="outlined" onPress={onDismiss} style={styles.closeButton}>
            Close
          </Button>
        </Modal>
      </Portal>
    );
  }
);

const styles = StyleSheet.create({
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
  list: {
    flexGrow: 0,
  },
  centeredState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  stateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    marginTop: 8,
  },
  closeButton: {
    marginTop: 12,
  },
});
