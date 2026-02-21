import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { theme } from '../../../theme/theme';
import { QualityCheck, formatDate, getStatusColor } from './qualityControlHelpers';

interface QualityHistoryCardProps {
  check: QualityCheck;
}

export const QualityHistoryCard: React.FC<QualityHistoryCardProps> = ({ check }) => {
  const passedItems = check.checklist_items.filter((item) => item.checked).length;
  const totalItems = check.checklist_items.length;
  const percentage = totalItems > 0 ? Math.round((passedItems / totalItems) * 100) : 0;

  return (
    <Card style={styles.historyCard}>
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

const styles = StyleSheet.create({
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
});
