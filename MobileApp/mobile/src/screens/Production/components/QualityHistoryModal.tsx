import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, Button, Portal, Modal } from 'react-native-paper';
import { theme } from '../../../theme/theme';
import { QualityCheck } from './qualityControlHelpers';
import { QualityHistoryCard } from './QualityHistoryCard';

interface QualityHistoryModalProps {
  visible: boolean;
  onDismiss: () => void;
  history: QualityCheck[];
}

export const QualityHistoryModal: React.FC<QualityHistoryModalProps> = ({
  visible,
  onDismiss,
  history,
}) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Text style={styles.modalTitle}>Quality Check History</Text>
        <ScrollView>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>No quality checks recorded yet</Text>
          ) : (
            history.map((check) => (
              <QualityHistoryCard key={check.id} check={check} />
            ))
          )}
        </ScrollView>
        <Button mode="outlined" onPress={onDismiss}>
          Close
        </Button>
      </Modal>
    </Portal>
  );
};

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
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: theme.colors.textSecondary,
    paddingVertical: 20,
  },
});
