import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { theme } from '../../../theme/theme';
import type { QualityCheck } from '../types';
import { formatDate, getStatusColor, getStatusLabel } from './qualityControlHelpers';

interface QualityHistoryCardProps {
  check: QualityCheck;
}

export const QualityHistoryCard = memo<QualityHistoryCardProps>(
  function QualityHistoryCard({ check }) {
    const passedItems = check.checklist_items.filter((item) => item.checked).length;
    const totalItems = check.checklist_items.length;
    const percentage = totalItems > 0 ? Math.round((passedItems / totalItems) * 100) : 0;
    const statusColor = getStatusColor(check.overall_status);

    return (
      <Card style={styles.historyCard}>
        <Card.Content>
          <View style={styles.historyHeader}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusBadgeText}>
                {getStatusLabel(check.overall_status).toUpperCase()}
              </Text>
            </View>
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
  }
);

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
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
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
